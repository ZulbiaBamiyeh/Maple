// The fight is one pure function: simulate(a, b, seed) -> { events, frames, winner }.
// The battle screen only replays what this returns.
//
// Time runs in fixed 50 ms ticks (20 per second). Durations are whole ticks so
// the same builds and seed always produce the same fight.

import { Rng } from './rng.js';

export const TPS = 20;
const DT = 1 / TPS;
const MAX_T = 60 * TPS;
const OT_START = 20 * TPS;
const OT_STEP = 5 * TPS;
const HARMFUL = new Set(['burn', 'poison', 'bleed', 'stun', 'chill', 'freeze', 'weaken', 'sunder']);

const secs = (s) => Math.max(1, Math.round(s * TPS));

export function simulate(specA, specB, seed) {
  const rng = new Rng(seed);
  const F = [makeFighter(specA, 0), makeFighter(specB, 1)];
  const events = [];
  const frames = [];
  let t = 0;

  const emit = (e) => events.push({ t, ...e });
  const other = (f) => F[1 - f.idx];
  const alive = (f) => f.hp > 0;

  function otMult() {
    if (t < OT_START) return 1;
    return 1 + 0.25 * (1 + Math.floor((t - OT_START) / OT_STEP));
  }

  // Shield first, then HP. Returns the amount that landed (shield + hp).
  function damage(f, amount) {
    let dmg = Math.max(0, Math.round(amount * otMult()));
    const total = dmg;
    let absorbed = 0;
    for (const s of f.shield) {
      const use = Math.min(s.amt, dmg);
      s.amt -= use; dmg -= use; absorbed += use;
      if (!dmg) break;
    }
    f.shield = f.shield.filter((s) => s.amt > 0);
    f.hp = Math.max(0, f.hp - dmg);
    checkHpBelow(f);
    return { total, absorbed };
  }

  function heal(f, amt, source) {
    if (!alive(f) || amt <= 0) return;
    const before = f.hp;
    f.hp = Math.min(f.spec.maxHp, f.hp + amt);
    if (f.hp > before) emit({ type: 'heal', dst: f.idx, amt: f.hp - before, source });
  }

  function applyStatus(src, dst, eff) {
    const st = dst.st;
    const res = eff.target === 'self' ? 0 : dst.spec.resist;
    const dur = (s) => secs(s * (1 - res));
    const sc = src.spec.scale;
    const id = eff.apply;
    switch (id) {
      case 'burn':
        if (st.burn) {
          st.burn.dps = Math.min(6 * sc, st.burn.dps + sc);
          st.burn.left = st.burn.tot = dur(3);
        } else st.burn = { dps: 3 * sc, left: dur(3), tot: dur(3), next: TPS, src: src.idx };
        break;
      case 'poison': {
        const max = 10 + (src.spec.sets.poisonMax || 0);
        const add = eff.stacks || 1;
        if (st.poison) {
          st.poison.stacks = Math.min(max, st.poison.stacks + add);
          st.poison.left = st.poison.tot = dur(5);
        } else st.poison = { stacks: Math.min(max, add), left: dur(5), tot: dur(5), next: TPS, per: sc };
        break;
      }
      case 'bleed':
        st.bleed = { attacks: 3, dmg: Math.round((5 + (src.spec.sets.bleedBonus || 0)) * sc) };
        break;
      case 'stun': {
        if (st.stun || st.freeze || t < dst.stunImmuneUntil) return;
        const d = dur((eff.duration ?? 0.8) + (src.spec.sets.stunBonus || 0));
        st.stun = { left: d, tot: d };
        break;
      }
      case 'chill': {
        const freezeAt = src.spec.sets.freezeAt || 3;
        const stacks = Math.min(freezeAt, (st.chill?.stacks || 0) + (eff.stacks || 1));
        st.chill = { stacks, left: dur(4), tot: dur(4) };
        if (stacks >= freezeAt) {
          delete st.chill;
          if (!st.freeze) {
            st.freeze = { left: secs(1.2), tot: secs(1.2) };
            emit({ type: 'status', src: src.idx, dst: dst.idx, status: 'freeze', stacks: 1 });
            return;
          }
        }
        break;
      }
      case 'weaken':
        st.weaken = { left: dur(3), tot: dur(3) };
        break;
      case 'sunder':
        st.sunder = { stacks: Math.min(2, (st.sunder?.stacks || 0) + 1), left: dur(4), tot: dur(4) };
        break;
      case 'frenzy':
        st.frenzy = { left: secs(eff.duration || 5), tot: secs(eff.duration || 5) };
        break;
      default:
        return;
    }
    const stacks = st[id]?.stacks ?? (id === 'burn' ? Math.round(st.burn.dps) : 1);
    emit({ type: 'status', src: src.idx, dst: dst.idx, status: id, stacks });
  }

  function fire(owner, trig) {
    const e = trig.effect;
    const foe = other(owner);
    emit({ type: 'trigger', owner: owner.idx, source: trig.source });
    if (e.apply) applyStatus(owner, e.target === 'self' ? owner : foe, e);
    if (e.heal) heal(owner, e.heal, trig.source);
    if (e.shield) {
      owner.shield.push({ amt: e.shield, exp: t + 6 * TPS });
      emit({ type: 'shield', dst: owner.idx, amt: e.shield, source: trig.source });
    }
    if (e.damage && alive(foe)) {
      const r = damage(foe, e.damage);
      emit({ type: 'dot', dst: foe.idx, status: 'thorns', dmg: r.total, absorbed: r.absorbed });
    }
  }

  function checkHpBelow(f) {
    if (!alive(f)) return;
    for (const tr of f.spec.triggers) {
      if (tr.trigger.type !== 'hpBelow' || f.used.has(tr)) continue;
      if (f.hp / f.spec.maxHp < tr.trigger.pct) { f.used.add(tr); fire(f, tr); }
    }
  }

  function attack(a) {
    const d = other(a);
    const w = a.spec.weapon;
    if (a.st.bleed) {
      const r = damage(a, a.st.bleed.dmg);
      emit({ type: 'dot', dst: a.idx, status: 'bleed', dmg: r.total, absorbed: r.absorbed });
      if (--a.st.bleed.attacks <= 0) delete a.st.bleed;
      if (!alive(a)) return;
    }
    let hit = rng.int(w.min, w.max) + a.spec.atk;
    const crit = rng.chance(a.spec.crit);
    if (crit) hit *= 1.5;
    if (a.st.weaken) hit *= 0.75;
    let def = Math.max(0, d.spec.def - 3 * (d.st.sunder?.stacks || 0));
    if (w.magic) def = Math.floor(def / 2);
    const taken = Math.max(1, Math.round(hit - def));
    const r = damage(d, taken);
    emit({ type: 'hit', src: a.idx, dst: d.idx, dmg: r.total, absorbed: r.absorbed, crit, magic: !!w.magic });
    if (a.spec.lifesteal > 0) {
      a.lsAcc += r.total * a.spec.lifesteal;
      const h = Math.floor(a.lsAcc);
      if (h > 0) { a.lsAcc -= h; heal(a, h, 'Lifesteal'); }
    }
    a.hits++;
    const mult = w.statusMult || 1;
    for (const oh of a.spec.onHit) {
      if (alive(d) && rng.chance(oh.chance * mult)) applyStatus(a, d, oh);
    }
    for (const tr of a.spec.triggers) {
      const ty = tr.trigger.type;
      if (ty === 'onHit') {
        const m = tr.effect.apply && HARMFUL.has(tr.effect.apply) ? mult : 1;
        if (rng.chance((tr.trigger.chance ?? 1) * m)) fire(a, tr);
      } else if (ty === 'onCrit' && crit) fire(a, tr);
      else if (ty === 'everyNthHit' && a.hits % tr.trigger.n === 0) fire(a, tr);
    }
    if (alive(d)) for (const tr of d.spec.triggers) if (tr.trigger.type === 'onHitTaken') fire(d, tr);
    a.timer = w.interval;
  }

  function tickStatuses(f) {
    const st = f.st;
    for (const id of ['burn', 'poison']) {
      const s = st[id];
      if (!s) continue;
      if (--s.next <= 0) {
        s.next = TPS;
        let dmg = id === 'burn' ? s.dps : s.stacks * s.per;
        let crit = false;
        if (id === 'burn') {
          const src = F[s.src];
          if (src.spec.sets.burnCrit && rng.chance(src.spec.crit)) { dmg *= 1.5; crit = true; }
        }
        const r = damage(f, Math.round(dmg));
        emit({ type: 'dot', dst: f.idx, status: id, dmg: r.total, absorbed: r.absorbed, crit });
      }
      if (--s.left <= 0) delete st[id];
    }
    for (const id of ['stun', 'chill', 'freeze', 'weaken', 'sunder', 'frenzy']) {
      const s = st[id];
      if (s && --s.left <= 0) {
        delete st[id];
        if (id === 'stun') f.stunImmuneUntil = t + 2 * TPS;
      }
    }
    f.shield = f.shield.filter((s) => s.exp > t);
    if (f.spec.regen > 0 && --f.regenNext <= 0) {
      f.regenNext = TPS;
      heal(f, f.spec.regen, 'Regen');
    }
  }

  function advance(f) {
    if (f.st.stun || f.st.freeze) return;
    const speed = Math.max(0.25, 1 + f.spec.haste + (f.st.frenzy ? 0.3 : 0) - 0.1 * (f.st.chill?.stacks || 0));
    f.timer -= DT * speed;
    if (f.timer <= 1e-9) attack(f);
  }

  function snapshot() {
    frames.push(F.map((f) => ({
      hp: f.hp,
      shield: f.shield.reduce((s, x) => s + x.amt, 0),
      timer: f.st.stun || f.st.freeze ? f.timerFrac : (f.timerFrac = clamp01(1 - f.timer / f.spec.weapon.interval)),
      statuses: statusList(f),
    })));
  }

  // ---- run it
  for (const f of F) for (const tr of f.spec.triggers) if (tr.trigger.type === 'battleStart') fire(f, tr);
  snapshot();

  let winner = null;
  let reason = 'ko';
  for (t = 1; t <= MAX_T; t++) {
    for (const f of F) if (alive(f)) tickStatuses(f);
    for (const f of F) if (alive(f) && alive(other(f))) advance(f);
    for (const f of F) {
      if (!alive(f)) continue;
      for (const tr of f.spec.triggers) {
        if (tr.trigger.type === 'everySeconds' && t % secs(tr.trigger.s) === 0) fire(f, tr);
      }
    }
    snapshot();
    const deadA = !alive(F[0]);
    const deadB = !alive(F[1]);
    if (deadA || deadB) {
      winner = deadA && deadB ? -1 : deadA ? 1 : 0;
      break;
    }
  }
  if (winner === null) {
    t = Math.min(t, MAX_T);
    reason = 'time';
    const pa = F[0].hp / F[0].spec.maxHp;
    const pb = F[1].hp / F[1].spec.maxHp;
    winner = pa === pb ? -1 : pa > pb ? 0 : 1;
  }
  emit({ type: 'end', winner, reason });
  return { events, frames, winner, reason, ticks: frames.length - 1, maxHp: F.map((f) => f.spec.maxHp) };
}

function makeFighter(spec, idx) {
  return {
    spec, idx, hp: spec.maxHp, shield: [], st: {}, hits: 0, lsAcc: 0, used: new Set(),
    timer: spec.weapon.firstSwing ?? spec.weapon.interval, timerFrac: 0,
    stunImmuneUntil: -1, regenNext: TPS,
  };
}

function statusList(f) {
  const out = [];
  const st = f.st;
  const frac = (s) => (s.tot ? s.left / s.tot : 1);
  if (st.burn) out.push({ id: 'burn', n: Math.round(st.burn.dps), frac: frac(st.burn) });
  if (st.poison) out.push({ id: 'poison', n: st.poison.stacks, frac: frac(st.poison) });
  if (st.bleed) out.push({ id: 'bleed', n: st.bleed.attacks, frac: st.bleed.attacks / 3 });
  if (st.stun) out.push({ id: 'stun', n: 0, frac: frac(st.stun) });
  if (st.freeze) out.push({ id: 'freeze', n: 0, frac: frac(st.freeze) });
  if (st.chill) out.push({ id: 'chill', n: st.chill.stacks, frac: frac(st.chill) });
  if (st.weaken) out.push({ id: 'weaken', n: 0, frac: frac(st.weaken) });
  if (st.sunder) out.push({ id: 'sunder', n: st.sunder.stacks, frac: frac(st.sunder) });
  const sh = f.shield.reduce((s, x) => s + x.amt, 0);
  if (sh > 0) out.push({ id: 'shield', n: sh, frac: 1 });
  if (st.frenzy) out.push({ id: 'frenzy', n: 0, frac: frac(st.frenzy) });
  if (f.spec.regen > 0) out.push({ id: 'regen', n: f.spec.regen, frac: 1 });
  return out;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
