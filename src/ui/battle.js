// Battle screen: replays simulate()'s frames and events. Nothing here decides
// the fight; it only draws it.
//
// Two cursors walk the event list. The *anim* cursor runs a little ahead of
// fight time and starts each attack's wind-up early, so the strike lands on
// exactly the tick where the damage happens. The *apply* cursor fires the
// impact: flash, sparks, damage number, HP bar.

import { TPS } from '../sim.js';
import { gridToCanvas, silhouette, squash } from '../art/pixel.js';
import { heroGrid } from '../art/hero.js';
import { mobGrid } from '../art/mobs.js';
import { drawScene } from '../art/scenes.js';
import { RAMPS } from '../art/palette.js';
import { ITEMS, MOBS, STATUSES } from '../data.js';
import { hud, equipIds, statusChip, statusGlyph } from './common.js';

const LEAD = 0.16; // real seconds from wind-up start to the strike
const INTRO = 0.75; // real seconds before the first tick plays

// How each mob attacks.
const MOB_STYLE = {
  slime: 'hop', shroom: 'hop', boar: 'charge', wisp: 'cast', golem: 'slam', imp: 'lunge',
  crab: 'lunge', jelly: 'hop', eel: 'lunge', oyster: 'slam', crabking: 'slam', siren: 'cast',
  cogling: 'charge', mite: 'lunge', sprite: 'cast', automaton: 'lunge', titan: 'slam', tesla: 'cast',
  bat: 'lunge', skeleton: 'lunge', crow: 'lunge', shade: 'lunge', boneknight: 'slam', witch: 'cast',
  emberling: 'cast', harpy: 'lunge', tortoise: 'slam', roc: 'charge', drake: 'charge', colossus: 'slam',
  shroomknight: 'charge', puffer: 'hop', hound: 'charge', pumpkin: 'cast', salamander: 'lunge',
  skink: 'lunge', beetle: 'charge', scorpion: 'lunge', mummy: 'lunge', sandwyrm: 'slam', sphinx: 'cast',
  sprout: 'hop', bee: 'lunge', hedgehog: 'charge', bear: 'slam', treant: 'slam', waspqueen: 'lunge',
  snowpuff: 'cast', penguin: 'charge', wolf: 'charge', yeti: 'slam', abominable: 'slam', frostwyrm: 'cast',
  toad: 'hop', leech: 'lunge', mudgolem: 'slam', gnats: 'lunge', croc: 'charge', bogmother: 'cast',
  starling: 'cast', meteorite: 'charge', orrery: 'cast', moth: 'lunge', astromancer: 'cast', meteorgolem: 'slam',
};
// Bolt colours for casters (and the tint of their swing trails).
const MOB_COLOR = {
  wisp: '#9fe0ff', imp: '#f58a3a', siren: '#74e0d0', sprite: '#fff27a', tesla: '#fff27a', witch: '#c07cff', emberling: '#ffc84a',
  pumpkin: '#ffc84a', sphinx: '#6cc24a', snowpuff: '#c9f3ff', frostwyrm: '#8fd8f0',
  bogmother: '#9ee06a', starling: '#fff6c8', orrery: '#ffd36b', astromancer: '#c8c0ff',
};
// How close each style gets to its target before striking, in pixels of gap
// left between them. Ranged styles barely step forward.
const CLOSE = { dagger: 4, sword: 9, spear: 18, mace: 8, axe: 9, fist: 3, hop: 2, charge: 0, slam: 6, lunge: 4 };
const RANGED = new Set(['staff', 'cast']);



export function showBattle(app, run, fight, onDone, { before = null, out = null, speed: startSpeed = 1, onSpeed, showFoe } = {}) {
  const { result, me, foe, duel, mobId } = fight;
  const biome = duel ? 'duel' : MOBS[mobId].family;
  const names = [me.name, foe.name];
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // The result is already applied to the run; the HUD shows the state from before.
  const hudRun = before ? Object.assign(Object.create(run), before) : run;
  app.innerHTML = `
    ${hud(hudRun)}
    <section class="screen battle">
      <div class="arena" id="arena">
        <canvas id="arena-c"></canvas>
        ${[0, 1].map((i) => `
        <div class="ov ov${i}" id="fui${i}">
          <div class="nmrow"><span class="nm">${names[i]}</span>${i === 1 && duel && showFoe ? '<button class="peek" id="peek" aria-label="View their build">BUILD</button>' : ''}</div>
          <div class="bar hp" id="hp${i}"><div class="lag"></div><div class="fill"></div><div class="shield"></div><div class="txt" id="hpn${i}"></div></div>
          <div class="bar timer" id="tm${i}"><div class="fill"></div></div>
          <div class="chips" id="chips${i}"></div>
        </div>`).join('')}
        <div id="fx"></div>
        <div class="popq popq0" id="popq0"></div><div class="popq popq1" id="popq1"></div>
      </div>
      <div class="log" id="log"></div>
      <div class="actions sticky" id="acts">
        <button class="btn small ${startSpeed === 1 ? 'on' : ''}" data-speed="1">1×</button>
        <button class="btn small ${startSpeed === 2 ? 'on' : ''}" data-speed="2">2×</button>
        <button class="btn small" data-speed="skip">Skip ▸▸</button>
      </div>
    </section>`;

  // ---- arena geometry: whole-number scale only
  const arena = app.querySelector('#arena');
  const canvas = app.querySelector('#arena-c');
  const cw = arena.clientWidth || 360;
  const S = cw >= 300 ? 3 : 2;
  const W = Math.floor(cw / S);
  // Fill the height left after the HUD, the log/result area and the buttons.
  const free = app.clientHeight - app.querySelector('.hud').offsetHeight - 150 - 56 - 24; // leaves room for the post-fight summary
  const H = Math.max(90, Math.min(150, Math.floor(free / S)));
  const groundY = H - 16;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W * S}px`;
  canvas.style.height = `${H * S}px`;
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  bg.width = W; bg.height = H;
  drawScene(bg.getContext('2d'), W, H, biome, groundY, run.round * 7 + 1);

  // ---- sprites
  const weaponInfo = (equip) => {
    const inst = equip.weapon;
    if (!inst) return { style: 'fist', color: '#f4f1ff' };
    const it = ITEMS[inst.item];
    const ramp = RAMPS[it.ramp] || RAMPS.steel;
    return { style: it.type, color: ramp[1], light: ramp[0] };
  };
  function heroSprites(look, equip) {
    const ids = equipIds(equip);
    const idle = heroGrid(look, ids, 'idle');
    const swing = heroGrid(look, ids, 'swing');
    return {
      idle: gridToCanvas(idle), swing: gridToCanvas(swing), grid: idle, breath: gridToCanvas(heroGrid(look, ids, 'idle', true)),
      white: gridToCanvas(silhouette(idle)), blue: gridToCanvas(silhouette(idle, '#7fd8e8')),
      red: gridToCanvas(silhouette(idle, '#ff5a5a')), gold: gridToCanvas(silhouette(idle, '#ffd36b')),
      w: 48, h: 44, cx: 24, bottom: 41, headTop: 9, chest: 20, ...weaponInfo(equip),
    };
  }
  function mobSprites(m) {
    const g = mobGrid(m.sprite);
    const c = gridToCanvas(g);
    const style = MOB_STYLE[m.sprite] || 'lunge';
    const color = MOB_COLOR[m.sprite] || '#f4f1ff';
    return {
      idle: c, swing: c, grid: g, breath: gridToCanvas(squash(g)), white: gridToCanvas(silhouette(g)), blue: gridToCanvas(silhouette(g, '#7fd8e8')),
      red: gridToCanvas(silhouette(g, '#ff5a5a')), gold: gridToCanvas(silhouette(g, '#ffd36b')),
      w: 32, h: 32, cx: 16, bottom: 30, headTop: 3, chest: 13, style, color, light: '#ffffff', mob: true,
    };
  }
  const F = [
    { ...heroSprites(run.look, run.equip), face: 1, flip: false, x: Math.round(W * 0.3) },
    duel
      ? { ...heroSprites(run.ghost.look, run.ghost.equip), face: -1, flip: true, x: Math.round(W * 0.7) }
      : { ...mobSprites(MOBS[mobId]), face: -1, flip: false, x: Math.round(W * 0.7) },
  ];
  F.forEach((f, i) => Object.assign(f, {
    i, act: null, flashAt: -9, flashColor: 'white', kickAt: -9, dodgeAt: -9, deadAt: null, winAt: null, statuses: [],
  }));
  F[0].interval = me.weapon.interval / Math.max(0.25, 1 + me.haste);
  F[1].interval = foe.weapon.interval / Math.max(0.25, 1 + foe.haste);

  // ---- playback state
  let speed = startSpeed === 2 ? 2 : 1;
  let t = 0; // fight seconds
  let rt = 0; // real seconds; drives every animation
  let applyIdx = 0;
  let animIdx = 0;
  let done = false;
  let finishedAt = null;
  let shake = 0;
  let last = performance.now();
  const particles = [];
  const effects = []; // slashes, projectiles, rings, glyph pops
  const lastTick = result.frames.length - 1;
  const logEl = app.querySelector('#log');
  const fx = app.querySelector('#fx');
  const logLines = [];
  // Damage numbers take whichever slot above the head has been free longest,
  // so a burst of hits, ticks and procs fans out instead of piling up.
  const LANES = [[0, 0], [-12, -5], [12, -5], [-6, -11], [6, -11]];
  const laneUsed = [LANES.map(() => -9), LANES.map(() => -9)];

  const rand = (a, b) => a + Math.random() * (b - a);
  const chestY = (f) => groundY - (f.bottom - f.chest);
  const frontX = (f) => f.x + f.face * (f.mob ? 10 : 7);

  function log(html, cls = '') {
    logLines.push(`<div class="${cls}">${html}</div>`);
    if (logLines.length > 3) logLines.shift();
    logEl.innerHTML = logLines.join('');
  }

  // New statuses announce themselves in a small stack under that fighter's
  // HP panel, away from the damage numbers over their head.
  function statusPop(side, id, stacks) {
    const meta = STATUSES[id];
    if (!meta) return;
    const q = app.querySelector(`#popq${side}`);
    q.style.top = `${app.querySelector(`#fui${side}`).offsetHeight + 10}px`;
    const el = document.createElement('div');
    el.className = 'spop';
    el.style.color = meta.color;
    el.innerHTML = `${statusGlyph(id, 2)}<span>${meta.name}${stacks > 1 ? ` ×${stacks}` : ''}</span>`;
    q.prepend(el);
    while (q.children.length > 3) q.lastChild.remove();
    setTimeout(() => el.remove(), 1300);
  }

  function floatNum(side, text, cls, color) {
    const f = F[side];
    const used = laneUsed[side];
    let k = used.findIndex((u) => rt - u > 0.45);
    if (k < 0) k = used.indexOf(Math.min(...used));
    used[k] = rt;
    const [lx, ly] = LANES[k];
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    if (color) el.style.color = color;
    el.style.left = `${((f.x + lx) / W) * 100}%`;
    el.style.top = `${(groundY - (f.bottom - f.headTop) - 2 + ly) * S}px`;
    fx.append(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ---- effects
  function sparks(x, y, n, colors, speedMul = 1, gravity = 60) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(30, 70) * speedMul;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, g: gravity, color: colors[k % colors.length], life: rand(0.18, 0.35), age: 0, size: 1 });
    }
  }
  function dust(x, y, n = 6) {
    for (let k = 0; k < n; k++) {
      particles.push({ x: x + rand(-6, 6), y, vx: rand(-25, 25), vy: rand(-18, -4), g: 30, color: k % 2 ? '#d8c9a8' : '#a8977a', life: rand(0.3, 0.5), age: 0, size: 2 });
    }
  }

  // Start an attack so its strike lands at `impactRt`.
  function startAttack(f, impactRt) {
    const realInterval = f.interval / speed;
    const dur = Math.max(LEAD + 0.08, Math.min(0.38, realInterval * 0.92));
    const start = impactRt - LEAD;
    f.act = { start, dur, ps: LEAD / dur };
    if (f.style === 'staff' || f.style === 'cast') {
      const tgt = F[1 - f.i];
      effects.push({
        type: 'bolt', start: start + LEAD * 0.35, end: impactRt,
        x0: f.x + f.face * 12, y0: chestY(f) - (f.mob ? 0 : 6), x1: frontX(tgt), y1: chestY(tgt), color: f.color, light: f.light,
      });
    }
  }

  // Body half-widths facing the other fighter, for melee contact.
  const half = (f) => (f.mob ? 12 : 8);
  function reachOf(f) {
    if (RANGED.has(f.style)) return 2;
    const tgt = F[1 - f.i];
    const gap = Math.abs(tgt.x - f.x) - half(f) - half(tgt);
    return Math.max(4, gap - (CLOSE[f.style] ?? 3));
  }

  // Offset and pose for a fighter at the current real time.
  function motion(f) {
    let dx = 0;
    let dy = 0;
    let pose = 'idle';
    const a = f.act;
    if (a && !reduced) {
      const p = (rt - a.start) / a.dur;
      if (p >= 0 && p < 1) {
        const ps = a.ps;
        const reach = reachOf(f);
        const w = ps * 0.45; // wind-up end
        const hold = Math.min(1, ps + 0.18);
        let r;
        if (p < w) r = -(p / w) * 2.5;
        else if (p < ps) { const q = (p - w) / (ps - w); r = -2.5 + (reach + 2.5) * q * q; }
        else if (p < hold) r = reach;
        else r = reach * (1 - easeOut((p - hold) / (1 - hold)));
        dx = Math.round(r) * f.face;
        if (f.style === 'hop') dy = p < ps ? -Math.round(Math.sin((p / ps) * Math.PI) * 9) : 0;
        if (f.style === 'slam') dy = p < ps ? -Math.round(Math.sin(Math.min(1, p / (ps * 0.8)) * Math.PI * 0.5) * 7 * (p < ps * 0.8 ? 1 : (ps - p) / (ps * 0.2))) : 0;
        if (p > ps * 0.55 && p < hold + 0.1) pose = 'swing';
      }
    }
    // knockback when hit
    const kp = rt - f.kickAt;
    if (kp >= 0 && kp < 0.14) dx -= f.face * (kp < 0.07 ? 3 : 1);
    // dodge: a quick hop back out of the way
    const dp = rt - f.dodgeAt;
    if (dp >= 0 && dp < 0.3) {
      const q = Math.sin((dp / 0.3) * Math.PI);
      dx -= f.face * Math.round(q * 7);
      dy -= Math.round(q * 3);
    }
    return { dx, dy, pose };
  }

  // Impact of a hit on its target, at the current real time.
  function impact(e) {
    const a = F[e.src];
    const d = F[e.dst];
    if (e.immune) {
      floatNum(e.dst, 'IMMUNE', 'small', '#ffd36b');
      sparks(frontX(d), chestY(d), 6, ['#fff6c8', '#ffd36b'], 0.8);
      effects.push({ type: 'ring', start: rt, x: d.x, y: groundY - 16, color: '#ffd36b' });
      return;
    }
    d.flashAt = rt; d.flashColor = 'white';
    d.kickAt = rt;
    const hx = frontX(d);
    const hy = chestY(d) + rand(-3, 2);
    const big = e.crit || a.style === 'axe' || a.style === 'mace' || a.style === 'slam' || a.style === 'charge';
    if (!reduced) shake = Math.max(shake, e.crit ? 3 : big ? 2 : 0);
    const col = e.crit ? ['#ffe08a', '#f58a3a', '#ffffff'] : e.magic ? [a.color, a.light, '#ffffff'] : ['#ffffff', '#f4f1ff', '#ffe08a'];
    sparks(hx, hy, e.crit ? 14 : 8, col, e.crit ? 1.4 : 1);
    effects.push({ type: 'slash', style: a.style, start: rt, x: hx, y: hy, face: a.face, color: e.crit ? '#ffe08a' : a.light || '#ffffff', edge: a.color });
    if (a.style === 'slam' || a.style === 'mace' || a.style === 'axe') dust(d.x, groundY, big ? 8 : 5);
    const text = e.crit ? `${e.dmg}!` : `${e.dmg}`;
    floatNum(e.dst, text, e.crit ? 'crit' : e.magic ? 'magic' : '');
    const bar = app.querySelector(`#hp${e.dst}`);
    bar.classList.remove('hit'); void bar.offsetWidth; bar.classList.add('hit');
  }

  function handle(e, visual) {
    if (e.type === 'hit') {
      if (visual) impact(e);
      const abs = e.absorbed ? ` <span style="color:#7fd8e8">(${e.absorbed} blocked)</span>` : '';
      log(`${names[e.src]} hits <b>${e.dmg}</b>${e.crit ? ' <span class="c-crit">CRIT</span>' : ''}${abs}`);
    } else if (e.type === 'dot') {
      const color = STATUSES[e.status]?.color || '#aeb4c8';
      if (visual) {
        const d = F[e.dst];
        if (e.immune) { floatNum(e.dst, 'IMMUNE', 'small', '#ffd36b'); return; }
        floatNum(e.dst, `${e.dmg}${e.crit ? '!' : ''}`, 'small', e.burst ? '#ffffff' : color);
        d.flashAt = rt; d.flashColor = e.status === 'poison' ? 'green' : 'red';
        sparks(d.x, chestY(d), 5, [color, '#ffffff'], 0.6, -20);
      }
      if (e.status === 'thorns') log(`Thorns hit ${names[e.dst]} for <b>${e.dmg}</b>`);
    } else if (e.type === 'heal') {
      if (visual && e.amt >= 1) {
        floatNum(e.dst, `+${e.amt}`, 'heal small');
        const d = F[e.dst];
        for (let k = 0; k < 4; k++) particles.push({ x: d.x + rand(-8, 8), y: chestY(d) + rand(-4, 8), vx: 0, vy: -18, g: 0, color: '#8ff06a', life: 0.5, age: rand(-0.2, 0), size: 1, plus: true });
      }
      if (e.source !== 'Regen' && e.source !== 'Lifesteal') log(`${e.source} heals ${names[e.dst]} <b class="c-heal">${e.amt}</b>`);
    } else if (e.type === 'status') {
      const meta = STATUSES[e.status];
      if (visual) statusPop(e.dst, e.status, e.stacks);
      const who = e.src === e.dst ? names[e.dst] : names[e.dst];
      log(`${who}: <span style="color:${meta.color}">${meta.name}${e.stacks > 1 ? ' ×' + e.stacks : ''}</span>`);
    } else if (e.type === 'dodge') {
      if (visual) {
        const d = F[e.dst];
        d.dodgeAt = rt;
        floatNum(e.dst, 'MISS', 'small', '#b69ae6');
        for (let k = 0; k < 5; k++) particles.push({ x: d.x + rand(-6, 6), y: chestY(d) + rand(-6, 6), vx: -d.face * rand(20, 40), vy: 0, g: 0, color: '#e6d6ff', life: 0.25, age: 0, size: 1 });
      }
      log(`${names[e.dst]} <span style="color:#b69ae6">dodges</span>`);
    } else if (e.type === 'stasis') {
      if (visual) {
        const d = F[e.dst];
        floatNum(e.dst, 'GILDED', 'crit', '#ffd36b');
        sparks(d.x, chestY(d), 14, ['#fff6c8', '#ffd36b', '#e0a52e'], 1.2);
        effects.push({ type: 'ring', start: rt, x: d.x, y: groundY - 16, color: '#ffd36b' });
      }
      log(`${names[e.dst]} turns to <span style="color:#ffd36b">gold</span> for ${e.dur}s`);
    } else if (e.type === 'revive') {
      if (visual) {
        const d = F[e.dst];
        d.flashAt = rt; d.flashColor = 'white';
        floatNum(e.dst, 'REVIVE!', 'crit', '#ffc84a');
        sparks(d.x, chestY(d), 22, ['#fff4a8', '#ffc84a', '#f5803a', '#c8402e'], 1.5, -40);
        if (!reduced) shake = Math.max(shake, 3);
      }
      log(`${names[e.dst]} <b style="color:#ffc84a">rises again</b> at ${e.hp} HP`);
    } else if (e.type === 'reflect') {
      if (visual) floatNum(e.src, 'REFLECT', 'small', '#c07cff');
      log(`${names[e.src]} reflects ${STATUSES[e.status]?.name || e.status}`);
    } else if (e.type === 'cleanse') {
      if (visual) floatNum(e.dst, 'CLEANSE', 'small', '#d4f6ff');
    } else if (e.type === 'shield') {
      if (visual) {
        floatNum(e.dst, `+${e.amt}`, 'small', '#7fd8e8');
        effects.push({ type: 'ring', start: rt, x: F[e.dst].x, y: groundY - 16, color: '#7fd8e8' });
      }
      log(`${e.source}: ${names[e.dst]} +${e.amt} Shield`, 'c-heal');
    }
  }

  let prevHp = [null, null];
  function applyFrame(idx) {
    const fr = result.frames[idx];
    fr.forEach((s, i) => {
      const max = result.maxHp[i];
      const pct = Math.max(0, s.hp / max);
      const hp = app.querySelector(`#hp${i}`);
      hp.querySelector('.fill').style.width = `${pct * 100}%`;
      if (prevHp[i] === null || s.hp >= prevHp[i]) hp.querySelector('.lag').style.width = `${pct * 100}%`;
      else setTimeout(() => { hp.querySelector('.lag').style.width = `${pct * 100}%`; }, 250);
      prevHp[i] = s.hp;
      hp.querySelector('.shield').style.cssText = s.shield ? `left:${pct * 100}%;width:${Math.min(1 - pct, s.shield / max) * 100}%` : 'width:0';
      app.querySelector(`#hpn${i}`).textContent = `${s.hp}${s.shield ? `+${s.shield}` : ''}/${max}`;
      hp.classList.toggle('low', pct < 0.3);
      app.querySelector(`#tm${i} .fill`).style.width = `${s.timer * 100}%`;
      syncChips(app.querySelector(`#chips${i}`), s.statuses);
      if (s.hp <= 0 && F[i].deadAt === null) die(F[i]);
      F[i].statuses = s.statuses;
    });
  }

  // Status chips are kept per status and only their count and timer change,
  // so the pop-in animation plays once when a status lands instead of
  // restarting every frame (which kept every chip swollen over its neighbour).
  function syncChips(ce, statuses) {
    const have = new Map([...ce.children].map((el) => [el.dataset.tipstatus, el]));
    let prev = null;
    for (const st of statuses) {
      let el = have.get(st.id);
      if (!el) {
        const tmp = document.createElement('div');
        tmp.innerHTML = statusChip(st);
        el = tmp.firstElementChild;
      } else {
        have.delete(st.id);
        const n = st.n ? String(st.n) : '';
        let span = el.querySelector('span');
        if (n && !span) { span = document.createElement('span'); el.insertBefore(span, el.querySelector('i')); }
        if (span && span.textContent !== n) {
          span.textContent = n;
          span.style.display = n ? '' : 'none';
        }
        el.querySelector('i').style.width = `${Math.round(st.frac * 100)}%`;
      }
      const want = prev ? prev.nextSibling : ce.firstChild;
      if (want !== el) ce.insertBefore(el, want);
      prev = el;
    }
    for (const el of have.values()) el.remove();
  }

  // KO: three quick flashes, then the sprite bursts into its own pixels.
  function die(f) {
    f.deadAt = rt;
    const img = f.idle.getContext('2d').getImageData(0, 0, f.w, f.h).data;
    const ox = f.x - f.cx;
    const oy = groundY - f.bottom;
    f.burst = [];
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const o = (y * f.w + x) * 4;
        if (img[o + 3] === 0 || Math.random() < 0.35) continue;
        f.burst.push({
          x: ox + (f.flip ? f.w - 1 - x : x), y: oy + y, vx: rand(-14, 14) + f.face * -12, vy: rand(-40, -8), g: 70,
          color: `rgb(${img[o]},${img[o + 1]},${img[o + 2]})`, life: rand(0.5, 0.9), age: -((f.h - y) / f.h) * 0.12 - 0.3, size: 1,
        });
      }
    }
    const winner = F[1 - f.i];
    if (winner.deadAt === null) winner.winAt = rt + 0.6;
  }

  // ---- drawing
  function drawFighter(f) {
    const intro = Math.min(1, rt / 0.45);
    const enter = reduced ? 0 : Math.round((1 - easeOut(intro)) * 50) * -f.face;
    // idle breathing is a second frame (upper body down a pixel), not a bob
    const still = (f.statuses || []).some((s) => ['stun', 'freeze', 'stasis', 'chill'].includes(s.id));
    const breathe = f.deadAt === null && !still && !reduced ? Math.floor(rt * 1.8 + f.i * 0.5) % 2 : 0;
    const m = motion(f);
    let dy = m.dy;
    if (f.winAt !== null && rt > f.winAt && !reduced) dy -= Math.round(Math.abs(Math.sin((rt - f.winAt) * 7)) * 5);
    const x = f.x - f.cx + m.dx + enter;
    const y = groundY - f.bottom + dy;

    // ground shadow shrinks as the fighter leaves the ground
    if (f.deadAt === null || rt - f.deadAt < 0.3) {
      const sw = Math.max(8, (f.mob ? 22 : 18) + Math.min(0, dy));
      ctx.fillStyle = '#1a142366';
      ctx.fillRect(f.x - sw / 2 + m.dx + enter, groundY, sw, 2);
      ctx.fillRect(f.x - sw / 2 + 2 + m.dx + enter, groundY + 2, sw - 4, 1);
    }

    const draw = (c, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (f.flip) { ctx.translate(x + f.w, y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); }
      else ctx.drawImage(c, x, y);
      ctx.restore();
    };

    if (f.deadAt !== null) {
      const dt = rt - f.deadAt;
      if (dt < 0.3) {
        draw(f.idle);
        if (Math.floor(dt / 0.05) % 2 === 0) draw(f.white, 0.95);
      } else if (!f.burstDone) {
        particles.push(...f.burst);
        f.burstDone = true;
        sparks(f.x, chestY(f), 10, ['#ffffff', '#ffe08a'], 1.2);
      }
      return;
    }

    draw(m.pose === 'swing' ? f.swing : breathe && !m.dx && !m.dy ? f.breath : f.idle);
    const st = new Set((f.statuses || []).map((s) => s.id));
    if (st.has('stasis')) {
      draw(f.gold, 0.7);
      if (!reduced && Math.random() < 0.3) particles.push({ x: f.x + rand(-9, 9), y: groundY - rand(4, f.bottom - f.headTop), vx: 0, vy: -10, g: 0, color: Math.random() < 0.5 ? '#fff6c8' : '#ffd36b', life: 0.5, age: 0, size: 1, plus: Math.random() < 0.3 });
    } else if (st.has('freeze')) draw(f.blue, 0.6);
    else if (st.has('chill')) draw(f.blue, 0.28);
    const fl = rt - f.flashAt;
    if (fl >= 0 && fl < 0.08) draw(f.flashColor === 'white' ? f.white : f.flashColor === 'green' ? f.blue : f.red, f.flashColor === 'white' ? 0.75 : 0.5);

    // status overlays
    const top = y + f.headTop;
    if (st.has('stun') || st.has('freeze')) {
      for (let k = 0; k < 3; k++) {
        const ang = rt * 5 + (k * Math.PI * 2) / 3;
        const sx = Math.round(f.x + m.dx + Math.cos(ang) * 8);
        const sy = Math.round(top - 5 + Math.sin(ang) * 2);
        ctx.fillStyle = st.has('freeze') ? '#d4f6ff' : '#f2c14e';
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
      }
    }
    if (st.has('shield')) {
      ctx.fillStyle = (Math.floor(rt * 6) % 2) ? '#7fd8e8aa' : '#d4f6ffaa';
      const rx = f.mob ? 18 : 15, ry = f.mob ? 17 : 21, cy = groundY - ry + 2;
      for (let ang = 0; ang < Math.PI * 2; ang += 0.1) ctx.fillRect(Math.round(f.x + m.dx + Math.cos(ang) * rx), Math.round(cy + Math.sin(ang) * ry), 1, 1);
    }
    const spawn = (color, vy, life, size = 1) => particles.push({
      x: f.x + m.dx + rand(-8, 8), y: groundY - 4 - rand(0, f.bottom - f.headTop - 6), vx: rand(-3, 3), vy, g: 0, color, life, age: 0, size,
    });
    if (!reduced && Math.random() < 0.4) {
      if (st.has('burn')) spawn(Math.random() < 0.5 ? '#f58a3a' : '#f2c14e', -26, 0.45);
      if (st.has('poison') && Math.random() < 0.6) spawn('#6cc24a', -12, 0.8, 2);
      if (st.has('bleed') && Math.random() < 0.3) particles.push({ x: f.x + rand(-5, 5), y: chestY(f), vx: 0, vy: 5, g: 90, color: '#d9434f', life: 0.4, age: 0, size: 1 });
      if (st.has('frenzy')) spawn('#f28bb0', -34, 0.25);
      if (st.has('weaken') && Math.random() < 0.4) spawn('#9a5cc6', 10, 0.5);
    }
  }

  function drawEffects() {
    for (let k = effects.length - 1; k >= 0; k--) {
      const e = effects[k];
      const age = rt - e.start;
      if (e.type === 'bolt') {
        if (rt < e.start) continue;
        const p = Math.min(1, (rt - e.start) / (e.end - e.start));
        if (p >= 1) { effects.splice(k, 1); continue; }
        const x = e.x0 + (e.x1 - e.x0) * p;
        const y = e.y0 + (e.y1 - e.y0) * p - Math.sin(p * Math.PI) * 6;
        for (let j = 1; j <= 4; j++) {
          const q = Math.max(0, p - j * 0.06);
          ctx.fillStyle = e.color;
          ctx.globalAlpha = 1 - j * 0.22;
          ctx.fillRect(Math.round(e.x0 + (e.x1 - e.x0) * q), Math.round(e.y0 + (e.y1 - e.y0) * q - Math.sin(q * Math.PI) * 6), 2, 2);
        }
        ctx.globalAlpha = 1;
        const bx = Math.round(x), by = Math.round(y);
        ctx.fillStyle = '#1a1423';
        ctx.fillRect(bx - 3, by - 2, 7, 5);
        ctx.fillRect(bx - 2, by - 3, 5, 7);
        ctx.fillStyle = e.color;
        ctx.fillRect(bx - 2, by - 1, 5, 3);
        ctx.fillRect(bx - 1, by - 2, 3, 5);
        ctx.fillStyle = e.light || '#ffffff';
        ctx.fillRect(bx - 1, by - 1, 2, 2);
      } else if (e.type === 'slash') {
        if (age > 0.16) { effects.splice(k, 1); continue; }
        drawSlash(e, age / 0.16);
      } else if (e.type === 'ring') {
        if (age > 0.4) { effects.splice(k, 1); continue; }
        const r = 6 + age * 50;
        ctx.fillStyle = e.color;
        ctx.globalAlpha = 1 - age / 0.4;
        for (let ang = 0; ang < Math.PI * 2; ang += 0.15) ctx.fillRect(Math.round(e.x + Math.cos(ang) * r), Math.round(e.y + Math.sin(ang) * r * 0.9), 1, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  // A crescent (swords, axes), a streak (spears), or a star burst (blunt/bodies).
  function drawSlash(e, p) {
    const { x, y, face } = e;
    ctx.fillStyle = e.color;
    const alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    ctx.globalAlpha = alpha;
    if (e.style === 'spear') {
      const len = Math.round(16 * Math.min(1, p * 2));
      ctx.fillRect(face > 0 ? x - len : x, y, len, 1);
      ctx.fillStyle = e.edge;
      ctx.fillRect(face > 0 ? x - len + 2 : x, y + 1, len - 2, 1);
    } else if (['sword', 'dagger', 'axe', 'mace'].includes(e.style)) {
      const big = e.style === 'axe' || e.style === 'mace';
      const r = big ? 11 : e.style === 'dagger' ? 7 : 9;
      const span = Math.min(1, p * 2.2);
      const a0 = -1.3, a1 = -1.3 + 2.6 * span;
      for (let ang = a0; ang <= a1; ang += 0.08) {
        const cx = x - face * (r - 3);
        const px = Math.round(cx + Math.cos(ang) * r * face);
        const py = Math.round(y + Math.sin(ang) * r);
        ctx.fillStyle = e.color;
        ctx.fillRect(px, py, 1, 1);
        ctx.fillStyle = e.edge;
        ctx.fillRect(px - face, py, 1, 1);
        if (big) ctx.fillRect(px - 2 * face, py, 1, 1);
      }
    } else if (e.style !== 'staff' && e.style !== 'cast') {
      const r = Math.round(3 + p * 5);
      for (let k = 0; k < 8; k++) {
        const ang = (k * Math.PI) / 4;
        ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), k % 2 ? 1 : 2, k % 2 ? 1 : 2);
      }
    } else {
      const r = Math.round(2 + p * 7);
      for (let ang = 0; ang < Math.PI * 2; ang += 0.3) ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function draw(dt) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (shake > 0) {
      ctx.translate(Math.round(rand(-shake, shake)), Math.round(rand(-shake * 0.6, shake * 0.6)));
      shake = Math.max(0, shake - dt * 18);
    }
    ctx.drawImage(bg, 0, 0);
    // the fighter currently attacking draws on top
    const order = [...F].sort((a, b) => (a.act?.start ?? -1) - (b.act?.start ?? -1));
    order.forEach(drawFighter);
    drawEffects();
    for (let k = particles.length - 1; k >= 0; k--) {
      const p = particles[k];
      p.age += dt;
      if (p.age < 0) continue;
      if (p.age > p.life) { particles.splice(k, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += (p.vx || 0) * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = p.age > p.life * 0.6 ? 0.5 : 1;
      ctx.fillStyle = p.color;
      if (p.plus) { ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1); ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3); }
      else ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Start wind-ups for hits that land within LEAD of now.
  function lookahead() {
    const horizon = Math.floor((t + LEAD * speed) * TPS);
    while (animIdx < result.events.length && result.events[animIdx].t <= horizon) {
      const e = result.events[animIdx++];
      if (e.type !== 'hit' && e.type !== 'dodge') continue;
      const impactRt = rt + (e.t / TPS - t) / speed;
      startAttack(F[e.src], impactRt);
    }
  }
  function processTo(idx, visual) {
    while (applyIdx < result.events.length && result.events[applyIdx].t <= idx) {
      const e = result.events[applyIdx++];
      if (e.type !== 'end') handle(e, visual);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    const w = result.winner;
    const title = w === 0 ? (run.crown && duel ? 'Crowned!' : 'Victory!') : w === 1 ? 'Defeat' : 'Draw';
    const cls = w === 0 ? 'win' : w === 1 ? 'loss' : 'draw';
    const secs = (result.ticks / TPS).toFixed(1);
    const reason = result.reason === 'time' ? ' · time up, higher HP% wins' : '';
    const life = out?.lifeLost ? ' · <span style="color:#ff6b76">−1 life</span>' : '';
    const ban = document.createElement('div');
    ban.className = 'banner';
    ban.innerHTML = `<div class="t ${cls}">${title}</div><div class="sub">${secs}s${reason}${life}</div>`;
    arena.append(ban);
    const why = document.createElement('div');
    why.className = 'why panel';
    why.innerHTML = whyHtml(result, names);
    wireWhy(why);
    logEl.replaceWith(why);
    app.querySelector('#acts').innerHTML = `${duel && showFoe ? '<button class="btn" id="peek2">Their build</button>' : ''}<button class="btn go" id="cont">Continue ▸</button>`;
    app.querySelector('#peek2')?.addEventListener('click', () => showFoe(null));
    app.querySelector('#cont').onclick = () => { stop = true; onDone(); };
  }

  // "FIGHT!" callout
  const call = document.createElement('div');
  call.className = 'callout';
  call.textContent = duel ? 'DUEL!' : 'FIGHT!';
  arena.append(call);
  setTimeout(() => call.remove(), 1100);

  // Peeking at the rival's build pauses the fight until the sheet closes.
  let paused = false;
  app.querySelector('#peek')?.addEventListener('click', () => {
    if (done) return showFoe(null);
    paused = true;
    arena.classList.add('paused');
    showFoe(() => { paused = false; arena.classList.remove('paused'); });
  });

  let stop = false;
  function loop(now) {
    if (stop || !document.body.contains(canvas)) return;
    const dt = paused ? 0 : Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    rt += dt;
    if (!done && rt > INTRO) {
      t += dt * speed;
      const idx = Math.min(lastTick, Math.floor(t * TPS));
      lookahead();
      processTo(idx, true);
      applyFrame(idx);
      if (idx >= lastTick) {
        if (finishedAt === null) finishedAt = rt;
        if (rt - finishedAt > 1.1) finish();
      }
    }
    draw(dt);
    requestAnimationFrame(loop);
  }

  app.querySelector('#acts').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-speed]');
    if (!b) return;
    const v = b.dataset.speed;
    if (v === 'skip') {
      processTo(lastTick, false);
      animIdx = result.events.length;
      t = lastTick / TPS;
      rt = Math.max(rt, INTRO + 0.5);
      applyFrame(lastTick);
      F.forEach((f) => { f.act = null; if (f.deadAt !== null) { f.deadAt = rt - 0.31; } });
      finish();
      return;
    }
    speed = +v;
    onSpeed?.(speed);
    app.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  });

  applyFrame(0);
  processTo(0, true);
  requestAnimationFrame(loop);
}

const easeOut = (x) => 1 - (1 - x) * (1 - x);

// Damage by source for both sides, as bars.
// After the fight: where the damage came from, as a donut you can flip between
// what you dealt and what you took. Colours are fixed per damage type and in a
// fixed order (checked for colour-blind separation between neighbours); the
// legend always names each slice, so colour is never the only cue.
const DMG_TYPES = [
  ['hits', 'Hits', '#d9d4ee'], ['poison', 'Poison', '#6cc24a'], ['crits', 'Crits', '#f28bb0'], ['shock', 'Shock', '#ffe066'],
  ['overclock', 'Overclock', '#b77cf0'], ['burn', 'Burn', '#f26b38'], ['thorns', 'Thorns', '#8b92ac'], ['bleed', 'Bleed', '#e04858'],
];

function damageBreakdown(result) {
  // out[side] = { dealt: {type: n}, taken: {type: n} }
  const out = [0, 1].map(() => ({ dealt: {}, taken: {}, healed: 0 }));
  const add = (bag, k, v) => { if (v > 0) bag[k] = (bag[k] || 0) + v; };
  for (const e of result.events) {
    if (e.type === 'hit') {
      const shock = Math.min(e.shock || 0, e.dmg);
      const k = e.crit ? 'crits' : 'hits';
      add(out[e.src].dealt, k, e.dmg - shock); add(out[e.src].dealt, 'shock', shock);
      add(out[e.dst].taken, k, e.dmg - shock); add(out[e.dst].taken, 'shock', shock);
    } else if (e.type === 'dot') {
      const k = DMG_TYPES.some(([id]) => id === e.status) ? e.status : 'thorns';
      add(out[e.dst].taken, k, e.dmg);
      if (k !== 'overclock') add(out[1 - e.dst].dealt, k, e.dmg); // self-inflicted isn't "dealt"
    } else if (e.type === 'heal') out[e.dst].healed += e.amt;
  }
  return out;
}

function donut(bag) {
  const parts = DMG_TYPES.filter(([k]) => bag[k] > 0).map(([k, name, color]) => ({ k, name, color, v: bag[k] }));
  const total = parts.reduce((s, p) => s + p.v, 0);
  const R = 40, W = 13, C = 48;
  let a = -Math.PI / 2;
  const gap = parts.length > 1 ? 0.045 : 0; // ~2px of surface between slices
  const arcs = parts.map((p) => {
    const sweep = (p.v / total) * Math.PI * 2;
    const a0 = a + gap / 2, a1 = a + sweep - gap / 2;
    a += sweep;
    if (parts.length === 1) return `<circle class="sl" data-k="${p.k}" cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${p.color}" stroke-width="${W}"/>`;
    const pt = (ang) => `${(C + Math.cos(ang) * R).toFixed(2)} ${(C + Math.sin(ang) * R).toFixed(2)}`;
    return `<path class="sl" data-k="${p.k}" d="M ${pt(a0)} A ${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}" fill="none" stroke="${p.color}" stroke-width="${W}"/>`;
  }).join('');
  const pct = (v) => `${Math.round((v / total) * 100)}%`;
  const legend = parts.map((p) => `
    <li data-k="${p.k}" data-v="${p.v}" data-p="${pct(p.v)}" data-n="${p.name}"><i style="background:${p.color}"></i><span>${p.name}</span><b>${p.v}</b><em>${pct(p.v)}</em></li>`).join('');
  return total
    ? `<div class="donut"><svg viewBox="0 0 96 96" role="img" aria-label="Damage by type">${arcs}</svg>
        <div class="mid"><b>${total}</b><span>total</span></div></div>
       <ul class="dleg ${parts.length > 4 ? 'two' : ''}">${legend}</ul>`
    : '<div class="dnone">No damage.</div>';
}

function whyHtml(result, names) {
  const b = damageBreakdown(result)[0];
  const sum = (bag) => Object.values(bag).reduce((s, v) => s + v, 0);
  return `
    <div class="why-top">
      <div class="seg" role="tablist">
        <button class="on" data-view="dealt" role="tab">Dealt <b>${sum(b.dealt)}</b></button>
        <button data-view="taken" role="tab">Taken <b>${sum(b.taken)}</b></button>
      </div>
      ${b.healed ? `<span class="healed">+${b.healed} healed</span>` : ''}
    </div>
    <div class="why-body" data-view="dealt">${donut(b.dealt)}</div>
    <div class="why-body" data-view="taken" hidden>${donut(b.taken)}</div>`;
}

// Toggle, plus tap/hover on a slice or legend row to read it out in the middle.
function wireWhy(el) {
  el.querySelectorAll('.seg button').forEach((btn) => {
    btn.onclick = () => {
      el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === btn));
      el.querySelectorAll('.why-body').forEach((body) => { body.hidden = body.dataset.view !== btn.dataset.view; });
    };
  });
  el.querySelectorAll('.why-body').forEach((body) => {
    const mid = body.querySelector('.mid');
    if (!mid) return;
    const rest = mid.innerHTML;
    const focus = (k) => {
      body.classList.toggle('focus', !!k);
      body.querySelectorAll('[data-k]').forEach((n) => n.classList.toggle('hl', n.dataset.k === k));
      const li = k && body.querySelector(`li[data-k="${k}"]`);
      mid.innerHTML = li ? `<b>${li.dataset.v}</b><span>${li.dataset.n} · ${li.dataset.p}</span>` : rest;
    };
    body.querySelectorAll('[data-k]').forEach((n) => {
      n.addEventListener('mouseenter', () => focus(n.dataset.k));
      n.addEventListener('mouseleave', () => focus(null));
      n.addEventListener('click', () => focus(body.classList.contains('focus') && n.classList.contains('hl') ? null : n.dataset.k));
    });
  });
}
