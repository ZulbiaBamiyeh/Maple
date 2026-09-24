// The fight is one pure function: simulate(a, b, seed) -> { events, frames, winner }.
// The battle screen only replays what this returns.
//
// Time runs in fixed 50 ms ticks (20 per second). Durations are whole ticks so
// the same builds and seed always produce the same fight.
//
// A fighter spec (see items.js) carries its stats, weapon, on-hit procs,
// triggers, set flags and damage modifiers. Everything beyond the basics is
// optional and defaults to "off".

import { Rng } from './rng.js';

export const TPS = 20;
const DT = 1 / TPS;
const MAX_T = 60 * TPS;
const OT_START = 20 * TPS;
const OT_STEP = 5 * TPS;
const HARMFUL = new Set(['burn', 'poison', 'bleed', 'stun', 'chill', 'freeze', 'weaken', 'sunder', 'shock', 'hex']);
const TIMED = ['stun', 'chill', 'freeze', 'weaken', 'sunder', 'frenzy', 'shock', 'hex'];
export const EVASION_CAP = 0.4;

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
    if (f.st.stasis) return { total: 0, absorbed: 0, immune: true };
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
    // Phoenix-style relics: the first killing blow leaves you standing instead.
    if (f.hp <= 0 && f.spec.sets.revive && !f.revived) {
      f.revived = true;
      f.hp = Math.max(1, Math.round(f.spec.maxHp * f.spec.sets.revive));
      for (const k of Object.keys(f.st)) if (HARMFUL.has(k)) delete f.st[k];
      emit({ type: 'revive', dst: f.idx, hp: f.hp });
      fireAll(f, 'onRevive');
      return { total, absorbed };
    }
    checkHpBelow(f);
    return { total, absorbed };
  }

  // Hex halves healing received.
  function heal(f, amt, source) {
    if (!alive(f) || amt <= 0) return;
    if (f.st.hex) amt = Math.floor(amt / 2);
    const before = f.hp;
    f.hp = Math.min(f.spec.maxHp, f.hp + amt);
    if (f.hp > before) emit({ type: 'heal', dst: f.idx, amt: f.hp - before, source });
    // Bloodsucker (4): healing past full HP becomes Shield.
    const over = amt - (f.hp - before);
    if (over > 0 && f.spec.sets.overhealShield) {
      f.shield.push({ amt: over, exp: f.spec.sets.shieldKeep ? Infinity : t + 6 * TPS });
      emit({ type: 'shield', dst: f.idx, amt: over, source: 'Overheal' });
    }
    // Bloodpact: healing you receive also hurts the foe.
    const foe = other(f);
    if (f.spec.sets.healDamage && f.hp > before && alive(foe)) {
      const r = damage(foe, Math.round((f.hp - before) * f.spec.sets.healDamage));
      emit({ type: 'dot', dst: foe.idx, status: 'bleed', dmg: r.total, absorbed: r.absorbed, immune: r.immune });
    }
  }

  function applyStatus(src, dst, eff) {
    const st = dst.st;
    if (st.stasis && HARMFUL.has(eff.apply)) return;
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
        } else st.poison = { stacks: Math.min(max, add), left: dur(5), tot: dur(5), next: TPS, per: sc, src: src.idx };
        break;
      }
      case 'bleed':
        st.bleed = { attacks: 3, dmg: Math.round((5 + (src.spec.sets.bleedBonus || 0)) * sc), src: src.idx };
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
      case 'sunder': {
        const max = 2 + (src.spec.sets.sunderMax || 0);
        st.sunder = { stacks: Math.min(max, (st.sunder?.stacks || 0) + (eff.stacks || 1)), left: dur(4), tot: dur(4) };
        break;
      }
      // Shock: each weapon hit the target takes deals +2 per stack (scaled), ignoring Def.
      case 'shock': {
        const max = 5 + (src.spec.sets.shockMax || 0);
        const per = Math.max(1, Math.round(2 * sc));
        st.shock = { stacks: Math.min(max, (st.shock?.stacks || 0) + (eff.stacks || 1)), left: dur(4), tot: dur(4), per: Math.max(per, st.shock?.per || 0), src: src.idx };
        // Overload: a full Shock bar discharges into a thunderclap and resets.
        if (st.shock.stacks >= max && src.spec.sets.overload && src !== dst) {
          const n = st.shock.stacks;
          delete st.shock;
          const r = damage(dst, Math.round(n * src.spec.sets.overload * sc));
          emit({ type: 'dot', dst: dst.idx, status: 'shock', dmg: r.total, absorbed: r.absorbed, burst: true, immune: r.immune });
          return;
        }
        break;
      }
      case 'hex':
        st.hex = { left: dur(eff.duration || 4), tot: dur(eff.duration || 4) };
        break;
      case 'frenzy':
        st.frenzy = { left: secs(eff.duration || 5), tot: secs(eff.duration || 5) };
        break;
      default:
        return;
    }
    const stacks = st[id]?.stacks ?? (id === 'burn' ? Math.round(st.burn.dps) : 1);
    emit({ type: 'status', src: src.idx, dst: dst.idx, status: id, stacks });
    if (!HARMFUL.has(id) || src === dst || eff.echoed) return;
    // Echo: your statuses sometimes land twice. Reflect: theirs sometimes bounce back.
    if (src.spec.sets.echo && alive(dst) && rng.chance(src.spec.sets.echo)) applyStatus(src, dst, { ...eff, echoed: true });
    if (dst.spec.sets.reflect && alive(src) && rng.chance(dst.spec.sets.reflect)) {
      emit({ type: 'reflect', src: dst.idx, dst: src.idx, status: id });
      applyStatus(dst, src, { ...eff, target: 'foe', echoed: true });
    }
  }

  // Burst out everything a damage-over-time status has left, then clear it.
  function detonate(owner, foe, id) {
    const s = foe.st[id];
    if (!s) return;
    const ticksLeft = Math.ceil(s.left / TPS);
    const dmg = id === 'poison' ? s.stacks * s.per * ticksLeft : id === 'burn' ? s.dps * ticksLeft : 0;
    delete foe.st[id];
    if (dmg <= 0) return;
    const r = damage(foe, Math.round(dmg));
    emit({ type: 'dot', dst: foe.idx, status: id, dmg: r.total, absorbed: r.absorbed, burst: true });
  }

  const stackCount = (f, id) => {
    const s = f.st[id];
    if (!s) return 0;
    return id === 'burn' ? Math.round(s.dps) : s.stacks ?? 1;
  };

  function fire(owner, trig) {
    const e = trig.effect;
    const foe = other(owner);
    emit({ type: 'trigger', owner: owner.idx, source: trig.source });
    if (e.cleanse) {
      const had = Object.keys(owner.st).filter((k) => HARMFUL.has(k));
      for (const k of had) delete owner.st[k];
      if (had.length) emit({ type: 'cleanse', dst: owner.idx, source: trig.source });
    }
    if (e.apply) applyStatus(owner, e.target === 'self' ? owner : foe, e);
    if (e.heal) heal(owner, e.heal, trig.source);
    if (e.shield) {
      const amt = Math.round(e.shield * (1 + (owner.spec.sets.shieldBoost || 0)));
      owner.shield.push({ amt, exp: owner.spec.sets.shieldKeep ? Infinity : t + 6 * TPS });
      emit({ type: 'shield', dst: owner.idx, amt, source: trig.source });
    }
    // Stasis: turn to gold. Nothing can hurt you, you can't act, your DoTs keep ticking.
    if (e.stasis && !owner.st.stasis) {
      owner.st.stasis = { left: secs(e.stasis), tot: secs(e.stasis) };
      emit({ type: 'stasis', dst: owner.idx, dur: e.stasis });
    }
    if (e.damage && alive(foe)) {
      const r = damage(foe, e.damage);
      emit({ type: 'dot', dst: foe.idx, status: 'thorns', dmg: r.total, absorbed: r.absorbed, immune: r.immune });
    }
    if (e.damagePerStack && alive(foe)) {
      const n = stackCount(foe, e.damagePerStack.status);
      if (n > 0) {
        const r = damage(foe, Math.round(n * e.damagePerStack.per * owner.spec.scale));
        emit({ type: 'dot', dst: foe.idx, status: e.damagePerStack.status, dmg: r.total, absorbed: r.absorbed, burst: true });
      }
    }
    if (e.detonate && alive(foe)) detonate(owner, foe, e.detonate);
    if (e.critNext) owner.nextCrit = true;
  }

  // Every trigger type may carry a chance; on-hit status chances get the dagger bonus.
  function roll(tr, statusMult = 1) {
    const m = tr.effect.apply && HARMFUL.has(tr.effect.apply) ? statusMult : 1;
    return rng.chance((tr.trigger.chance ?? 1) * m);
  }

  function fireAll(owner, type, statusMult = 1, pred = null) {
    for (const tr of owner.spec.triggers) {
      if (tr.trigger.type !== type) continue;
      if (pred && !pred(tr)) continue;
      if (roll(tr, statusMult)) fire(owner, tr);
    }
  }

  function checkHpBelow(f) {
    if (!alive(f)) return;
    for (const tr of f.spec.triggers) {
      if (tr.trigger.type !== 'hpBelow' || f.used.has(tr)) continue;
      if (f.hp / f.spec.maxHp < tr.trigger.pct) { f.used.add(tr); fire(f, tr); }
    }
  }

  const harmfulCount = (f) => Object.keys(f.st).filter((k) => HARMFUL.has(k)).length;
  const shieldOf = (f) => f.shield.reduce((s, x) => s + x.amt, 0);

  // Situational damage bonuses: vs a status on the target, executes, rage.
  function damageMult(a, d) {
    const m = a.spec.mods;
    let mult = 1;
    if (m.vs) for (const [id, pct] of Object.entries(m.vs)) if (d.st[id]) mult += pct;
    if (m.execute && d.hp / d.spec.maxHp < m.execute.below) mult += m.execute.pct;
    if (m.rage && a.hp / a.spec.maxHp < m.rage.below) mult += m.rage.pct;
    if (d.st.hex && a.spec.sets.hexAmp) mult += a.spec.sets.hexAmp;
    if (m.glass) mult += m.glass.out;
    if (a.spec.sets.statusCount) mult += a.spec.sets.statusCount * harmfulCount(d);
    if (d.spec.mods.glass) mult += d.spec.mods.glass.in;
    return mult;
  }

  function attack(a) {
    const d = other(a);
    const w = a.spec.weapon;
    a.timer = w.interval;
    const bleed = a.st.bleed;
    if (bleed) {
      // damage can fire a cleanse that removes the bleed, so hold on to it
      const r = damage(a, bleed.dmg);
      emit({ type: 'dot', dst: a.idx, status: 'bleed', dmg: r.total, absorbed: r.absorbed });
      const bsrc = F[bleed.src ?? 1 - a.idx];
      if (bsrc !== a && bsrc.spec.sets.bleedHeal && r.total > 0) heal(bsrc, r.total, 'Bleed');
      if (--bleed.attacks <= 0 && a.st.bleed === bleed) delete a.st.bleed;
      if (!alive(a)) return;
    }
    if (a.spec.sets.selfCost) {
      const r = damage(a, Math.max(1, Math.round(a.spec.maxHp * a.spec.sets.selfCost)));
      emit({ type: 'dot', dst: a.idx, status: 'overclock', dmg: r.total, absorbed: r.absorbed });
      if (!alive(a)) return;
    }
    // Evasion: the whole swing misses. Stunned or frozen fighters can't dodge.
    const ev = Math.min(EVASION_CAP, d.spec.evasion);
    if (ev > 0 && !d.st.stun && !d.st.freeze && rng.chance(ev)) {
      emit({ type: 'dodge', src: a.idx, dst: d.idx });
      if (d.spec.sets.dodgeCrit) d.nextCrit = true;
      if (d.spec.sets.dodgeRage) d.rage += Math.round(d.spec.sets.dodgeRage * d.spec.scale);
      fireAll(d, 'onDodge');
      return;
    }
    let hit = rng.int(w.min, w.max) + a.spec.atk + a.rage;
    if (a.spec.sets.shieldBash) hit += shieldOf(a) * a.spec.sets.shieldBash;
    const critChance = a.spec.crit + (a.spec.sets.chillCrit || 0) * (d.st.chill?.stacks || 0);
    const crit = a.nextCrit || rng.chance(critChance);
    a.nextCrit = false;
    if (crit) hit *= 1.5 + a.spec.critDmg;
    if (a.st.weaken) hit *= 0.75;
    hit *= damageMult(a, d);
    let def = a.spec.sets.pierceAll ? 0 : Math.max(0, d.spec.def - 3 * (d.st.sunder?.stacks || 0) - a.spec.pen);
    if (w.magic) def = Math.floor(def / 2);
    let taken = Math.max(1, Math.round(hit - def));
    const shock = d.st.shock ? d.st.shock.stacks * d.st.shock.per : 0;
    taken += shock;
    const r = damage(d, taken);
    emit({ type: 'hit', src: a.idx, dst: d.idx, dmg: r.total, absorbed: r.absorbed, crit, magic: !!w.magic, shock, immune: r.immune });
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
    fireAll(a, 'onHit', mult);
    if (crit) fireAll(a, 'onCrit', mult);
    // Star Splitter / Ossuary (4): a crit feeds every status already on the foe.
    if (crit && a.spec.sets.critSpread && alive(d)) {
      for (const id of ['poison', 'burn', 'shock', 'chill', 'sunder']) if (d.st[id]) applyStatus(a, d, { apply: id });
    }
    // Starlit (4): a crit refunds half the swing.
    if (crit && a.spec.sets.critHaste) a.timer = w.interval * 0.5;
    fireAll(a, 'everyNthHit', mult, (tr) => a.hits % tr.trigger.n === 0);
    if (alive(d)) {
      if (d.spec.thorns > 0 && alive(a)) {
        const tr = damage(a, d.spec.thorns);
        emit({ type: 'dot', dst: a.idx, status: 'thorns', dmg: tr.total, absorbed: tr.absorbed, immune: tr.immune });
        // Briar Crown / Reefguard (4): thorns deliver your on-hit statuses too.
        if (d.spec.sets.thornsProc) for (const oh of d.spec.onHit) if (alive(a) && rng.chance(oh.chance)) applyStatus(d, a, oh);
      }
      fireAll(d, 'onHitTaken');
    }
  }

  function tickStatuses(f) {
    const st = f.st;
    if (st.stasis) {
      if (--st.stasis.left <= 0) delete st.stasis;
      return;
    }
    for (const id of ['burn', 'poison']) {
      const s = st[id];
      if (!s) continue;
      if (--s.next <= 0) {
        s.next = Math.max(1, Math.round(TPS * (F[s.src ?? 1 - f.idx].spec.sets.dotRate || 1)));
        let dmg = id === 'burn' ? s.dps : s.stacks * s.per;
        if (F[s.src ?? 1 - f.idx].st.stasis) dmg *= 2; // the gilded wait
        let crit = false;
        if (id === 'burn') {
          const src = F[s.src];
          if (src.spec.sets.burnCrit && rng.chance(src.spec.crit)) { dmg *= 1.5; crit = true; }
        }
        const r = damage(f, Math.round(dmg));
        emit({ type: 'dot', dst: f.idx, status: id, dmg: r.total, absorbed: r.absorbed, crit });
        const owner = F[s.src ?? 1 - f.idx];
        if (owner !== f && owner.spec.sets.dotLeech && r.total > 0) heal(owner, Math.round(r.total * owner.spec.sets.dotLeech), cap(id));
      }
      if (st[id] && --s.left <= 0) delete st[id];
    }
    for (const id of TIMED) {
      const s = st[id];
      if (id === 'shock' && s && F[s.src]?.spec.sets.shockKeep) continue;
      if (s && --s.left <= 0) {
        delete st[id];
        if (id === 'stun') f.stunImmuneUntil = t + 2 * TPS;
      }
    }
    f.shield = f.shield.filter((s) => s.exp > t);
    if (f.spec.regen > 0 && --f.regenNext <= 0) {
      f.regenNext = TPS;
      heal(f, f.spec.regen, 'Regen');
      if (f.spec.sets.regenPoison && alive(other(f))) applyStatus(f, other(f), { apply: 'poison' });
    }
  }

  function advance(f) {
    if (f.st.stun || f.st.freeze || f.st.stasis) return;
    const speed = Math.max(0.25, 1 + f.spec.haste + (f.st.frenzy ? 0.3 : 0) - 0.1 * (f.st.chill?.stacks || 0));
    f.timer -= DT * speed;
    if (f.timer <= 1e-9) attack(f);
  }

  function snapshot() {
    frames.push(F.map((f) => ({
      hp: f.hp,
      shield: f.shield.reduce((s, x) => s + x.amt, 0),
      timer: f.st.stun || f.st.freeze || f.st.stasis ? f.timerFrac : (f.timerFrac = clamp01(1 - f.timer / f.spec.weapon.interval)),
      statuses: statusList(f),
    })));
  }

  // ---- run it
  for (const f of F) fireAll(f, 'battleStart');
  snapshot();

  let winner = null;
  let reason = 'ko';
  for (t = 1; t <= MAX_T; t++) {
    for (const f of F) if (alive(f)) tickStatuses(f);
    for (const f of F) if (alive(f) && alive(other(f))) advance(f);
    for (const f of F) {
      if (!alive(f)) continue;
      fireAll(f, 'everySeconds', 1, (tr) => t % secs(tr.trigger.s) === 0);
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

// Fill in optional fields so the sim never has to check for them.
function normalize(spec) {
  return {
    evasion: 0, critDmg: 0, thorns: 0, pen: 0, regen: 0, lifesteal: 0, resist: 0, haste: 0, atk: 0, def: 0,
    onHit: [], triggers: [],
    ...spec,
    sets: spec.sets || {},
    mods: spec.mods || {},
  };
}

function makeFighter(spec, idx) {
  const s = normalize(spec);
  return {
    spec: s, idx, hp: s.maxHp, shield: [], st: {}, hits: 0, lsAcc: 0, used: new Set(), nextCrit: false,
    timer: s.weapon.firstSwing ?? s.weapon.interval, timerFrac: 0,
    stunImmuneUntil: -1, regenNext: TPS, revived: false, rage: 0,
  };
}

function statusList(f) {
  const out = [];
  const st = f.st;
  const frac = (s) => (s.tot ? s.left / s.tot : 1);
  if (st.burn) out.push({ id: 'burn', n: Math.round(st.burn.dps), frac: frac(st.burn) });
  if (st.poison) out.push({ id: 'poison', n: st.poison.stacks, frac: frac(st.poison) });
  if (st.bleed) out.push({ id: 'bleed', n: st.bleed.attacks, frac: st.bleed.attacks / 3 });
  if (st.shock) out.push({ id: 'shock', n: st.shock.stacks, frac: frac(st.shock) });
  if (st.hex) out.push({ id: 'hex', n: 0, frac: frac(st.hex) });
  if (st.stasis) out.push({ id: 'stasis', n: 0, frac: frac(st.stasis) });
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
const cap = (s) => s[0].toUpperCase() + s.slice(1);
