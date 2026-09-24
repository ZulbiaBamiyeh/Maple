// The event screen: a first-person scene that loops its eight frames, the
// character's line, and their offer. Options that need one of your items ask
// for it in a sheet.

import { ITEMS, RARITIES } from '../data.js';
import { EVENTS, eventOptions, chooseEvent } from '../events.js';
import { eventFrames, EW, EH, EFRAMES } from '../art/events.js';
import { hud, tile, openSheet, closeSheet, slotName } from './common.js';
import { itemSheet } from './screens.js';

let timer = null;

export function eventScreen(app, ctx) {
  const { run } = ctx;
  const ev = run.event;
  if (!ev) return ctx.leaveEvent();
  const meta = EVENTS[ev.id];
  const opts = eventOptions(run);
  const res = ev.result;
  const gained = res?.gained ? run.find(res.gained) : null;

  app.innerHTML = `
    ${hud(run)}
    <section class="screen event">
      <div class="ev-stage panel">
        <div class="ev-text">
          <div class="kicker">EVENT</div>
          <h2>${meta.name}</h2>
          <p class="ev-line">${res ? res.text : meta.line}</p>
        </div>
        <canvas id="ev-c" width="${EW}" height="${EH}"></canvas>
      </div>
      ${res
        ? `<div class="ev-result">${gained ? `${tile(gained, { size: 2, attrs: 'data-gained' })}<div><div class="nm rc-${gained.rarity}">${ITEMS[gained.item].name}</div><div class="meta">${RARITIES[gained.rarity].name} ${slotName(gained)}</div></div>` : ''}</div>
          <div class="actions"><button class="btn go wide" id="ev-go">Continue ▸</button></div>`
        : `<div class="ev-opts">${opts.map((o) => `
          <button class="btn ev-opt ${o.key === 'leave' ? 'leave' : ''}" data-opt="${o.key}" ${o.disabled || (o.pick && !run.bag.concat(Object.values(run.equip)).some((i) => i && o.pick(i))) ? 'disabled' : ''}>
            <span class="lbl">${o.label}</span>${o.detail ? `<small>${o.detail}</small>` : ''}
          </button>`).join('')}</div>`}
    </section>`;

  // The scene: the biggest crisp scale that fits, frames at ~7 fps.
  const stage = app.querySelector('.ev-stage');
  const canvas = app.querySelector('#ev-c');
  // Scale by whole *device* pixels, so it stays crisp at any screen density.
  const dpr = window.devicePixelRatio || 1;
  const room = stage.clientHeight - app.querySelector('.ev-text').offsetHeight;
  const dev = Math.max(2 * dpr, Math.min(6 * dpr, Math.floor(((stage.clientWidth - 4) * dpr) / EW), Math.floor((room * dpr) / EH)));
  canvas.style.width = `${(EW * dev) / dpr}px`;
  canvas.style.height = `${(EH * dev) / dpr}px`;
  const g = canvas.getContext('2d');
  const frames = eventFrames(ev.id);
  // The spare room around the scene takes its sky colour, so it reads as a window.
  const [r, gg, bb] = frames[0].getContext('2d').getImageData(0, 0, 1, 1).data;
  stage.style.background = `rgb(${r},${gg},${bb})`;
  let f = 0;
  const paint = () => { g.clearRect(0, 0, EW, EH); g.drawImage(frames[f], 0, 0); f = (f + 1) % EFRAMES; };
  paint();
  clearInterval(timer);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) timer = setInterval(() => { if (!canvas.isConnected) return clearInterval(timer); paint(); }, 140);

  if (res) {
    app.querySelector('#ev-go').onclick = () => { clearInterval(timer); ctx.leaveEvent(); };
    app.querySelector('[data-gained]')?.addEventListener('click', () => itemSheet(ctx, gained, { from: 'view' }));
    return;
  }
  app.querySelectorAll('[data-opt]').forEach((b) => {
    b.onclick = () => {
      const o = opts.find((x) => x.key === b.dataset.opt);
      if (o.key === 'leave') { clearInterval(timer); return ctx.leaveEvent(); }
      if (!o.pick) { chooseEvent(run, o.key); return ctx.refresh(); }
      pickItem(run, o, (uid) => { chooseEvent(run, o.key, uid); ctx.refresh(); });
    };
  });
}

// Choose one of your items for an offer.
function pickItem(run, opt, done) {
  const mine = [...Object.values(run.equip), ...run.bag].filter((i) => i && opt.pick(i));
  const html = `
    <h2>${opt.label}</h2>
    <p class="ev-sheet-d">${opt.detail}</p>
    <div class="ev-pick">${mine.map((i) => `
      <button class="ev-pick-i" data-uid="${i.uid}">${tile(i, { size: 2 })}<span class="rc-${i.rarity}">${ITEMS[i.item].name}</span></button>`).join('')}</div>
    <div class="actions"><button class="btn" id="ev-cancel">Never mind</button></div>`;
  openSheet(html, (sheet) => {
    sheet.querySelector('#ev-cancel').onclick = closeSheet;
    sheet.querySelectorAll('[data-uid]').forEach((b) => {
      b.onclick = () => { closeSheet(); done(b.dataset.uid); };
    });
  });
}
