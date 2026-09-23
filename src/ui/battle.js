// Battle screen: replays simulate()'s frames and events. Nothing here decides
// the fight; it only draws it.

import { TPS } from '../sim.js';
import { gridToCanvas, silhouette } from '../art/pixel.js';
import { heroGrid } from '../art/hero.js';
import { mobGrid } from '../art/mobs.js';
import { drawScene } from '../art/scenes.js';
import { MOBS, STATUSES } from '../data.js';
import { hud, equipIds, statusChip } from './common.js';

const SOURCE_COLOR = {
  Hits: '#f4f1ff', Crits: '#f58a3a', burn: '#f58a3a', poison: '#6cc24a', bleed: '#d9434f', thorns: '#aeb4c8',
};

export function showBattle(app, run, fight, onDone) {
  const { result, me, foe, duel, mobId } = fight;
  const biome = duel ? 'duel' : MOBS[mobId].family;
  const names = [me.name, foe.name];

  app.innerHTML = `
    ${hud(run)}
    <section class="screen battle">
      <div class="arena panel" id="arena"><canvas id="arena-c"></canvas><div id="fx"></div></div>
      <div class="fighters">
        ${[0, 1].map((i) => `
        <div class="fui panel" id="fui${i}">
          <div class="nm">${names[i]}</div>
          <div class="chips" id="chips${i}"></div>
          <div class="bar hp" id="hp${i}"><div class="lag"></div><div class="fill"></div><div class="shield"></div><div class="txt"></div></div>
          <div class="bar timer" id="tm${i}"><div class="fill"></div></div>
        </div>`).join('')}
      </div>
      <div class="log panel" id="log"></div>
      <div class="actions sticky" id="acts">
        <button class="btn small on" data-speed="1">1×</button>
        <button class="btn small" data-speed="2">2×</button>
        <button class="btn small" data-speed="skip">Skip ▸▸</button>
      </div>
    </section>`;

  // ---- arena geometry: whole-number scale only
  const arena = app.querySelector('#arena');
  const canvas = app.querySelector('#arena-c');
  const cw = arena.clientWidth || 360;
  const S = cw >= 330 ? 3 : 2;
  const W = Math.floor(cw / S);
  const H = 82;
  const groundY = H - 14;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W * S}px`;
  canvas.style.height = `${H * S}px`;
  canvas.style.margin = '0 auto';
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  bg.width = W; bg.height = H;
  drawScene(bg.getContext('2d'), W, H, biome, groundY, run.round * 7 + 1);

  // ---- sprites
  function heroSprites(look, equip) {
    const ids = equipIds(equip);
    const idle = heroGrid(look, ids, 'idle');
    const swing = heroGrid(look, ids, 'swing');
    return {
      idle: gridToCanvas(idle), swing: gridToCanvas(swing),
      white: gridToCanvas(silhouette(idle)), blue: gridToCanvas(silhouette(idle, '#7fd8e8')),
      w: 48, h: 44, cx: 24, bottom: 41, headTop: 9,
    };
  }
  function mobSprites(sprite) {
    const g = mobGrid(sprite);
    const c = gridToCanvas(g);
    return { idle: c, swing: c, white: gridToCanvas(silhouette(g)), blue: gridToCanvas(silhouette(g, '#7fd8e8')), w: 32, h: 32, cx: 16, bottom: 30, headTop: 2 };
  }
  const F = [
    { ...heroSprites(run.look, run.equip), face: 1, flip: false, x: Math.round(W * 0.27) },
    duel
      ? { ...heroSprites(run.ghost.look, run.ghost.equip), face: -1, flip: true, x: Math.round(W * 0.73) }
      : { ...mobSprites(MOBS[mobId].sprite), face: -1, flip: false, x: Math.round(W * 0.73) },
  ];
  for (const f of F) Object.assign(f, { lungeAt: -9, hitAt: -9, deadAt: null, noise: null });

  // ---- playback state
  let speed = 1;
  let t = 0; // seconds of fight time
  let rt = 0; // real seconds, drives the animations
  let evIdx = 0;
  let done = false;
  let finishedAt = null;
  let last = performance.now();
  const particles = [];
  const lastTick = result.frames.length - 1;
  const logEl = app.querySelector('#log');
  const fx = app.querySelector('#fx');
  const logLines = [];
  let stackN = [0, 0];

  function log(html, cls = '') {
    logLines.push(`<div class="${cls}">${html}</div>`);
    if (logLines.length > 5) logLines.shift();
    logEl.innerHTML = logLines.join('');
  }

  function floatNum(side, text, cls) {
    const f = F[side];
    const k = stackN[side]++ % 4;
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    const topPx = (groundY - (f.bottom - f.headTop) - 4) * S - k * 14;
    el.style.left = `${((f.x + (k % 2 ? 6 : -6)) / W) * 100}%`;
    el.style.top = `${topPx}px`;
    fx.append(el);
    setTimeout(() => el.remove(), 950);
  }

  function handle(e, visual) {
    if (e.type === 'hit') {
      const a = F[e.src], d = F[e.dst];
      if (visual) {
        a.lungeAt = rt;
        d.hitAt = rt + 0.06;
        floatNum(e.dst, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? 'crit' : e.magic ? 'magic' : '');
        if (e.crit) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
      }
      const abs = e.absorbed ? ` <span style="color:#7fd8e8">(${e.absorbed} shielded)</span>` : '';
      log(`${names[e.src]} hits for <b>${e.dmg}</b>${e.crit ? ' — crit!' : ''}${abs}`, e.crit ? 'c-crit' : '');
    } else if (e.type === 'dot') {
      if (visual) floatNum(e.dst, `${e.dmg}${e.crit ? '!' : ''}`, 'small');
      if (visual && fx.lastElementChild) fx.lastElementChild.style.color = STATUSES[e.status]?.color || '#aeb4c8';
      if (e.status === 'thorns') log(`Thorns deal <b>${e.dmg}</b> to ${names[e.dst]}`);
      if (e.status === 'bleed') log(`${names[e.dst]} bleeds for <b>${e.dmg}</b>`, 'c-status');
    } else if (e.type === 'heal') {
      if (visual && e.amt >= 1) floatNum(e.dst, `+${e.amt}`, 'heal small');
      if (e.source !== 'Regen' && e.source !== 'Lifesteal') log(`${e.source}: ${names[e.dst]} heals ${e.amt}`, 'c-heal');
    } else if (e.type === 'status') {
      const meta = STATUSES[e.status];
      const who = e.src === e.dst ? names[e.dst] : `${names[e.src]} → ${names[e.dst]}`;
      log(`${who}: <span style="color:${meta.color}">${meta.name}${e.stacks > 1 ? ' ×' + e.stacks : ''}</span>`, 'c-status');
    } else if (e.type === 'shield') {
      if (visual) floatNum(e.dst, `+${e.amt}`, 'small');
      if (visual && fx.lastElementChild) fx.lastElementChild.style.color = '#7fd8e8';
      log(`${e.source}: ${names[e.dst]} gains ${e.amt} Shield`, 'c-heal');
    } else if (e.type === 'trigger') {
      // named in the effect's own line
    }
  }

  function applyFrame(idx) {
    const fr = result.frames[idx];
    fr.forEach((s, i) => {
      const max = result.maxHp[i];
      const pct = Math.max(0, s.hp / max);
      const hp = app.querySelector(`#hp${i}`);
      hp.querySelector('.fill').style.width = `${pct * 100}%`;
      hp.querySelector('.lag').style.width = `${pct * 100}%`;
      hp.querySelector('.shield').style.cssText = s.shield ? `left:${Math.min(pct, 1) * 100}%;width:${Math.min(1 - pct, s.shield / max) * 100}%` : 'width:0';
      hp.querySelector('.txt').textContent = `${s.hp}/${max}${s.shield ? ` +${s.shield}` : ''}`;
      hp.classList.toggle('low', pct < 0.3);
      app.querySelector(`#tm${i} .fill`).style.width = `${s.timer * 100}%`;
      const chips = s.statuses.map(statusChip).join('');
      const ce = app.querySelector(`#chips${i}`);
      if (ce._last !== chips) { ce.innerHTML = chips; ce._last = chips; }
      if (s.hp <= 0 && F[i].deadAt === null) F[i].deadAt = rt;
      F[i].statuses = s.statuses;
    });
  }

  // ---- drawing
  function drawFighter(f, i) {
    let dx = 0;
    const bob = Math.floor(rt * 2 + i) % 2;
    let img = f.idle;
    const lp = (rt - f.lungeAt) / 0.28;
    if (lp >= 0 && lp < 1) {
      dx += Math.round(Math.sin(lp * Math.PI) * 7) * f.face;
      if (lp > 0.2 && lp < 0.85) img = f.swing;
    }
    const hp = rt - f.hitAt;
    const flash = hp >= 0 && hp < 0.1;
    if (hp >= 0 && hp < 0.12) dx -= 2 * f.face;
    const x = f.x - f.cx + dx;
    const y = groundY - f.bottom + (f.deadAt === null ? bob : 0);

    // ground shadow
    ctx.fillStyle = '#1a142355';
    const sw = f === F[0] || f.flip ? 18 : 22;
    ctx.fillRect(f.x - sw / 2 + dx, groundY, sw, 2);
    ctx.fillRect(f.x - sw / 2 + 2 + dx, groundY + 2, sw - 4, 1);

    const draw = (c, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (f.flip) { ctx.translate(x + f.w, y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); }
      else ctx.drawImage(c, x, y);
      ctx.restore();
    };

    if (f.deadAt !== null) {
      const p = Math.min(1, (rt - f.deadAt) / 0.7);
      if (!f.noise) f.noise = Array.from({ length: f.w * f.h }, () => Math.random());
      const tmp = document.createElement('canvas');
      tmp.width = f.w; tmp.height = f.h;
      const tc = tmp.getContext('2d');
      tc.drawImage(f.idle, 0, 0);
      tc.fillStyle = '#000';
      tc.globalCompositeOperation = 'destination-out';
      for (let j = 0; j < f.noise.length; j++) if (f.noise[j] < p) tc.fillRect(j % f.w, Math.floor(j / f.w), 1, 1);
      draw(tmp);
      return;
    }

    draw(img);
    const st = new Set((f.statuses || []).map((s) => s.id));
    if (st.has('freeze')) draw(f.blue, 0.65);
    else if (st.has('chill')) draw(f.blue, 0.3);
    if (flash) draw(f.white, 0.9);

    // overlays
    const top = y + f.headTop;
    if (st.has('stun') || st.has('freeze')) {
      for (let k = 0; k < 3; k++) {
        const a = rt * 5 + (k * Math.PI * 2) / 3;
        const sx = Math.round(f.x + Math.cos(a) * 8);
        const sy = Math.round(top - 4 + Math.sin(a) * 2);
        ctx.fillStyle = st.has('freeze') ? '#d4f6ff' : '#f2c14e';
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
      }
    }
    if (st.has('shield')) {
      ctx.fillStyle = (Math.floor(rt * 6) % 2) ? '#7fd8e8aa' : '#d4f6ffaa';
      const rx = 17, ry = 20, cy = groundY - 16;
      for (let a = 0; a < Math.PI * 2; a += 0.12) ctx.fillRect(Math.round(f.x + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
    const spawn = (color, vy, life, n = 1, size = 1) => {
      for (let k = 0; k < n; k++) {
        particles.push({ x: f.x - 9 + Math.random() * 18, y: groundY - 6 - Math.random() * (f.bottom - f.headTop - 8), vy, color, life, age: 0, size });
      }
    };
    if (Math.random() < 0.35) {
      if (st.has('burn')) spawn(Math.random() < 0.5 ? '#f58a3a' : '#f2c14e', -22, 0.5);
      if (st.has('poison')) spawn('#6cc24a', -10, 0.8, 1, 2);
      if (st.has('bleed') && Math.random() < 0.4) spawn('#d9434f', 14, 0.4);
      if (st.has('frenzy')) spawn('#f28bb0', -30, 0.3);
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);
    F.forEach(drawFighter);
    for (let k = particles.length - 1; k >= 0; k--) {
      const p = particles[k];
      p.age += dt;
      p.y += p.vy * dt;
      if (p.age > p.life) { particles.splice(k, 1); continue; }
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  function processTo(idx, visual) {
    while (evIdx < result.events.length && result.events[evIdx].t <= idx) {
      const e = result.events[evIdx++];
      if (e.type !== 'end') handle(e, visual);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    const w = result.winner;
    const title = w === 0 ? 'Victory!' : w === 1 ? 'Defeat' : 'Draw';
    const cls = w === 0 ? 'win' : w === 1 ? 'loss' : 'draw';
    const secs = (result.ticks / TPS).toFixed(1);
    const reason = result.reason === 'time' ? ' · time up, higher HP% wins' : '';
    const ban = document.createElement('div');
    ban.className = 'banner';
    ban.innerHTML = `<div style="text-align:center"><div class="t ${cls}">${title}</div><div class="sub">${secs}s${reason}</div></div>`;
    arena.append(ban);
    log(`<b>${title}</b> after ${secs}s`);
    const why = document.createElement('div');
    why.className = 'why panel';
    why.innerHTML = whyHtml(result, names);
    app.querySelector('.fighters').after(why);
    app.querySelector('#acts').innerHTML = `<button class="btn go" id="cont">Continue ▸</button>`;
    app.querySelector('#cont').onclick = () => { stop = true; onDone(); };
  }

  let stop = false;
  function loop(now) {
    if (stop || !document.body.contains(canvas)) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    rt += dt;
    if (!done) {
      t += dt * speed;
      const idx = Math.min(lastTick, Math.floor(t * TPS));
      processTo(idx, true);
      applyFrame(idx);
      if (idx >= lastTick) {
        if (finishedAt === null) finishedAt = t;
        if (t - finishedAt > 0.9 * speed) finish();
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
      speed = 1;
      processTo(lastTick, false);
      t = lastTick / TPS;
      applyFrame(lastTick);
      F.forEach((f, i) => { if (result.frames[lastTick][i].hp <= 0) f.deadAt = rt - 1; });
      finish();
      return;
    }
    speed = +v;
    app.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  });

  applyFrame(0);
  processTo(0, true);
  requestAnimationFrame(loop);
}

// Damage by source for both sides, as bars.
function whyHtml(result, names) {
  const dealt = [{}, {}];
  const add = (side, k, v) => { dealt[side][k] = (dealt[side][k] || 0) + v; };
  const heals = [0, 0];
  for (const e of result.events) {
    if (e.type === 'hit') add(e.src, e.crit ? 'Crits' : 'Hits', e.dmg);
    else if (e.type === 'dot') add(1 - e.dst, e.status, e.dmg);
    else if (e.type === 'heal') heals[e.dst] += e.amt;
  }
  const max = Math.max(1, ...dealt.flatMap((d) => Object.values(d)));
  return [0, 1].map((i) => {
    const total = Object.values(dealt[i]).reduce((s, v) => s + v, 0);
    const rows = Object.entries(dealt[i]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `
      <div class="row"><span>${k === 'Hits' || k === 'Crits' ? k : STATUSES[k]?.name || 'Thorns'}</span>
      <div class="bar2"><span style="width:${(v / max) * 100}%;background:${SOURCE_COLOR[k] || '#aeb4c8'}"></span></div>
      <span class="n">${v}</span></div>`).join('');
    const heal = heals[i] ? ` · healed ${heals[i]}` : '';
    return `<div><b>${names[i]}</b> <span class="sub">dealt ${total}${heal}</span></div>${rows}`;
  }).join('');
}
