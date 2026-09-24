// Hover cards for items, on devices with a mouse. Tiles register their item
// instance under data-tip; bare item ids (a monster's drop table) use data-tipdef.
// Touch devices never see these: tapping still opens the item sheet.

import { ITEMS, RARITIES, FAMILIES, SLOT_LABEL, WEAPON_TYPES, STATUSES, STAT_HELP, MOBS } from '../data.js';
import { statLines, hydrate } from '../items.js';

const insts = new Map();
export const registerTip = (inst) => { insts.set(inst.uid, inst); return `data-tip="${inst.uid}"`; };

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const kind = (it) => (it.relic ? 'Relic' : it.slot === 'weapon' ? WEAPON_TYPES[it.type].name : SLOT_LABEL[it.slot] || cap(it.slot));

function card(inst, fromTable) {
  const it = ITEMS[inst.item];
  const fam = it.family ? FAMILIES[it.family] : null;
  const rar = fromTable ? '' : `${RARITIES[inst.rarity].name} `;
  const lines = statLines(inst).map((l) => `<li class="${l.startsWith('✦') ? 'perk' : ''}">${l}</li>`).join('');
  return `
    <div class="tt-nm rc-${fromTable ? 'common' : inst.rarity}">${it.relic ? '<span class="relic-tag">RELIC</span> ' : ''}${it.name}</div>
    <div class="tt-meta">${rar}${kind(it)}${fam ? ` · ${fam.name}` : ''}</div>
    <ul class="tt-lines">${lines}</ul>
    ${fam ? `<div class="tt-set"><b>${fam.set.name}</b> (2): ${fam.set.desc}</div>` : ''}
    ${it.flavor ? `<div class="tt-flavor">${it.flavor}</div>` : ''}
    ${fromTable ? `<div class="tt-flavor">${it.relic ? 'Drops Rare or Epic.' : 'Drops at any rarity.'} Numbers grow with the day.</div>` : ''}`;
}

// Set bonuses, statuses and stat names get small explainer cards.
function setCard(fam) {
  const f = FAMILIES[fam];
  const from = Object.values(MOBS).filter((m) => m.family === fam).map((m) => m.name);
  return `<div class="tt-nm" style="color:#c6f5a8">${f.set.name}</div>
    <div class="tt-meta">Set bonus · wear 2 ${f.name} pieces</div>
    <div class="tt-body">${f.set.desc}</div>
    ${from.length ? `<div class="tt-flavor">Dropped by ${from.join(', ')}.</div>` : ''}`;
}
function statusCard(id) {
  const st = STATUSES[id];
  if (!st) return null;
  return `<div class="tt-nm" style="color:${st.color}">${st.name}</div>
    <div class="tt-meta">${st.harmful ? 'Harmful status' : 'Helpful status'}</div>
    <div class="tt-body">${st.desc}</div>`;
}
const statCard = (k) => (STAT_HELP[k] ? `<div class="tt-nm">${k}</div><div class="tt-body">${STAT_HELP[k]}</div>` : null);

const TIP_SEL = '[data-tip], [data-tipdef], [data-tipset], [data-tipstatus], [data-tipstat]';
function contentFor(el) {
  const d = el.dataset;
  if (d.tipset) return FAMILIES[d.tipset] ? setCard(d.tipset) : null;
  if (d.tipstatus) return statusCard(d.tipstatus);
  if (d.tipstat) return statCard(d.tipstat);
  const inst = d.tip ? insts.get(d.tip) : hydrate({ item: d.tipdef, rarity: 'common' }, 1, 0);
  if (!inst || !ITEMS[inst.item]) return null;
  return card(inst, !d.tip);
}

export function installTooltips() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  document.body.append(tip);
  let cur = null;

  const place = (el) => {
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.right + 10;
    if (x + w > innerWidth - 8) x = r.left - w - 10;
    if (x < 8) x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    let y = r.top + r.height / 2 - h / 2;
    y = Math.max(8, Math.min(innerHeight - h - 8, y));
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };

  document.addEventListener('mouseover', (ev) => {
    const el = ev.target.closest?.(TIP_SEL);
    if (el === cur) return;
    cur = el;
    if (!el) { tip.hidden = true; return; }
    const html = contentFor(el);
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.classList.toggle('small', !el.dataset.tip && !el.dataset.tipdef);
    tip.hidden = false;
    place(el);
  });
  // anything that re-renders the screen or opens a sheet hides the card
  document.addEventListener('mousedown', () => { tip.hidden = true; cur = null; });
  addEventListener('scroll', () => { tip.hidden = true; cur = null; }, true);
}
