// Shared UI pieces: sprite images, item tiles, the HUD, the bottom sheet, toasts.

import { gridToCanvas, silhouette, squash } from '../art/pixel.js';
import { heroGrid, HERO_W, HERO_H } from '../art/hero.js';
import { iconGrid, ICON_SIZE } from '../art/icons.js';
import { mobGrid, MOB_SIZE } from '../art/mobs.js';
import { glyphGrid, STATUS_GLYPH } from '../art/glyphs.js';
import { drawScene } from '../art/scenes.js';
import { ITEMS, ROUNDS, DUEL_ROUNDS, SLOT_LABEL, STATUSES, DAYS_IN_RUN, dayOf } from '../data.js';
import { tipSeen, markTip } from './store.js';
import { registerTip } from './tooltip.js';

const urls = new Map();
function dataUrl(key, make) {
  if (!urls.has(key)) urls.set(key, gridToCanvas(make(), 1).toDataURL());
  return urls.get(key);
}

export const equipIds = (equip) => {
  const out = {};
  for (const s of ['hat', 'top', 'weapon', 'gloves', 'shoes']) if (equip?.[s]) out[s] = equip[s].item;
  return out;
};
const lookKey = (l) => [l.gender, l.hair, l.hairColor, l.skin, l.eyes].join(',');

// shadow: draw only the bare body's outline, for a rival whose build is hidden.
export function heroImg(look, equip, scale = 4, { flip = false, cls = 'hero', shadow = false } = {}) {
  const ids = shadow ? {} : equipIds(equip);
  const key = lookKey(look) + JSON.stringify(ids);
  const frame = (breath) => (shadow
    ? dataUrl(`s${breath ? 'b' : ''}` + lookKey(look), () => silhouette(heroGrid(look, {}, 'idle', breath), '#0f0b16'))
    : dataUrl(`h${breath ? 'b' : ''}` + key, () => heroGrid(look, ids, 'idle', breath)));
  return sprite(cls, frame(false), frame(true), HERO_W * scale, HERO_H * scale, flip);
}
// Two idle frames stacked in one box; CSS flips between them (see .spr).
function sprite(cls, a, b, w, h, flip = false) {
  return `<span class="spr ${cls}" style="${flip ? 'transform:scaleX(-1)' : ''}"><img class="px f1" src="${a}" width="${w}" height="${h}" alt=""><img class="px f2" src="${b}" width="${w}" height="${h}" alt=""></span>`;
}
export function iconImg(itemId, scale = 2) {
  const src = dataUrl('i' + itemId, () => iconGrid(itemId));
  return `<img class="px" src="${src}" width="${ICON_SIZE * scale}" height="${ICON_SIZE * scale}" alt="">`;
}
export function mobImg(name, scale = 3) {
  const a = dataUrl('m' + name, () => mobGrid(name));
  const b = dataUrl('mb' + name, () => squash(mobGrid(name)));
  return sprite('mob', a, b, MOB_SIZE * scale, MOB_SIZE * scale);
}
export function glyph(name, scale = 2) {
  const g = glyphGrid(name);
  const src = dataUrl('g' + name, () => g);
  return `<img class="px" src="${src}" width="${g.w * scale}" height="${g.h * scale}" alt="" style="display:inline-block">`;
}
export const statusGlyph = (id, scale = 2) => glyph(STATUS_GLYPH[id] || 'star', scale);

// Pixel backdrop into a canvas element with the given logical size.
export function sceneCanvas(biome, w, h, groundFrom = 0.78, seed = 3) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.className = 'bg';
  const ctx = c.getContext('2d');
  drawScene(ctx, w, h, biome, Math.round(h * groundFrom), seed);
  return c;
}
// Fill every `[data-scene]` placeholder in a root with a backdrop.
export function mountScenes(root) {
  root.querySelectorAll('[data-scene]').forEach((el) => {
    const [biome, w, h, g] = el.dataset.scene.split(',');
    el.prepend(sceneCanvas(biome, +w, +h, +(g || 0.78)));
  });
}

export function tile(inst, { size = 2, attrs = '', label = '', extra = '' } = {}) {
  if (!inst) return `<div class="tile empty ${extra}" ${attrs}><span class="slotlabel">${label}</span></div>`;
  return `<div class="tile r-${inst.rarity} ${extra}" ${attrs} ${registerTip(inst)}>${iconImg(inst.item, size)}</div>`;
}

export const itemName = (inst) => ITEMS[inst.item].name;
export const slotName = (inst) => {
  const it = ITEMS[inst.item];
  if (it.relic) return 'Relic';
  return it.slot === 'weapon' ? cap(it.type) : SLOT_LABEL[it.slot] || cap(it.slot);
};
export const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function hud(run) {
  const lostNow = run._shownLives !== undefined && run.lives < run._shownLives;
  run._shownLives = run.lives;
  const hearts = [0, 1, 2].map((i) => `<span class="hrt ${lostNow && i === run.lives ? 'break' : ''}">${glyph(i < run.lives ? 'heart' : 'heartLost', 3)}</span>`).join('');
  const pips = [];
  const byRound = Object.fromEntries(run.history.map((h) => [h.round, h.result]));
  // grouped by day: hunt, hunt, duel
  for (let d = 1; d <= DAYS_IN_RUN; d++) {
    const g = [];
    for (let r = d * 3 - 2; r <= d * 3; r++) {
      const res = byRound[r];
      const cls = res ? `done-${res.toLowerCase()}` : r === run.round ? 'now' : '';
      g.push(`<span class="pip ${DUEL_ROUNDS.includes(r) ? 'duel' : ''} ${cls}"></span>`);
    }
    pips.push(`<span class="day-pips ${d === dayOf(run.round) ? 'cur' : ''}">${g.join('')}</span>`);
  }
  return `<header class="hud">
    <div class="lives" aria-label="${run.lives} lives">${hearts}</div>
    <div><div class="pips">${pips.join('')}</div><div class="round-label">DAY ${dayOf(run.round)}/${DAYS_IN_RUN} · ${run.isDuel ? 'DUEL' : `HUNT ${((run.round - 1) % 3) + 1}/2`}</div></div>
    <div class="hud-r"><button class="menu-btn" data-menu aria-label="Menu"><i></i><i></i><i></i></button></div>
  </header>`;
}

// ---------------------------------------------------------------- sheet

// onClose runs when the sheet is dismissed (not when another sheet replaces it).
let sheetClosed = null;
export function openSheet(html, bind, onClose = null) {
  const root = document.getElementById('sheet-root');
  root.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  root.querySelector('.scrim').onclick = closeSheet;
  sheetClosed = onClose;
  bind?.(root.querySelector('.sheet'));
}
export function closeSheet() {
  document.getElementById('sheet-root').innerHTML = '';
  const cb = sheetClosed;
  sheetClosed = null;
  cb?.();
}

export function toast(msg, kind = '') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  root.append(el);
  setTimeout(() => el.remove(), 2300);
}

export function statusChip(s) {
  const meta = STATUSES[s.id];
  const n = s.n ? `<span>${s.n}</span>` : '';
  return `<span class="st" style="color:${meta.color};border-color:${meta.color}" data-tipstatus="${s.id}">${statusGlyph(s.id, 2)}${n}<i style="width:${Math.round(s.frac * 100)}%"></i></span>`;
}

// "12.5 → 15.8 ▲"
export function delta(a, b, fmt = (x) => x) {
  if (Math.abs(a - b) < 0.05) return `<span>${fmt(a)}</span>`;
  const good = b > a;
  return `<span>${fmt(a)} → <b class="${good ? 'up-good' : 'down-bad'}">${fmt(b)} ${good ? '▲' : '▼'}</b></span>`;
}

// ---------------------------------------------------------------- odds

// Win chance in five plain bands. The exact number stays hidden: it's an
// estimate from practice fights, and bands read faster on a phone.
export function oddsBand(p) {
  if (p >= 0.85) return { label: 'Easy win', cls: 'o5' };
  if (p >= 0.6) return { label: 'Favored', cls: 'o4' };
  if (p >= 0.4) return { label: 'Even', cls: 'o3' };
  if (p >= 0.15) return { label: 'Risky', cls: 'o2' };
  return { label: 'Deadly', cls: 'o1' };
}
export function oddsChip(p, prefix = '') {
  const b = oddsBand(p);
  const pips = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= +b.cls[1] ? 'on' : ''}"></i>`).join('');
  return `<span class="odds-chip ${b.cls}">${prefix}<span class="pips5">${pips}</span>${b.label}</span>`;
}

// ---------------------------------------------------------------- first-time popups

// A short centred popup shown the first time a screen appears (per device).
// It waits a beat so the screen underneath is visible first.
export function firstTime(key, title, body) {
  if (tipSeen(key)) return;
  markTip(key);
  setTimeout(() => {
    const root = document.getElementById('sheet-root');
    if (root.children.length) return; // something else is open; skip quietly
    root.innerHTML = `<div class="scrim"></div>
      <div class="modal" role="dialog" aria-labelledby="modal-t">
        <h2 id="modal-t">${title}</h2>
        <div class="modal-body">${body}</div>
        <button class="btn primary" id="modal-ok">Got it</button>
      </div>`;
    const close = () => { root.innerHTML = ''; };
    root.querySelector('#modal-ok').onclick = close;
    root.querySelector('.scrim').onclick = close;
  }, 350);
}
