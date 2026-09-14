import { getItemIcon } from '../assets/index';
import { SLOT_LABEL, statLines, type Item } from '../core/items';
import { clear, el, mesos } from './dom';

/**
 * The item tooltip, built the way the client's was: name across the top, a rule,
 * the icon in its own box beside the slot and price, then stat lines, then the
 * green passive and proc text. §9.2
 */
let tip: HTMLElement;

export function initTooltip() {
  tip = el('div');
  tip.id = 'tip';
  document.body.append(tip);
  window.addEventListener('pointermove', move);
}

function move(e: PointerEvent) {
  if (tip.style.display !== 'block') return;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 16, y = e.clientY + 18;
  if (x + w > window.innerWidth - 6) x = e.clientX - w - 14;
  if (y + h > window.innerHeight - 6) y = Math.max(6, e.clientY - h - 12);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

export interface TipOptions {
  /** Shown under the stats in italic — an asking price, a claim, a note. */
  note?: string;
  /** Shown in red: cannot afford, wrong slot, already sold. */
  warn?: string;
  /** Suppresses the true price — the player is not told what things are worth. */
  hidePrice?: boolean;
  priceLabel?: string;
  price?: number;
}

export function showItemTip(it: Item, opts: TipOptions = {}) {
  clear(tip);

  const name = el('div', 'tip-name', it.name);
  const rule = el('div', 'tip-rule');

  const head = el('div', 'tip-head');
  const iconBox = el('div', 'tip-icon');
  const img = el('img');
  img.src = getItemIcon(it.iconKey);
  iconBox.append(img);
  const meta = el('div');
  meta.append(el('div', 'tip-slot', SLOT_LABEL[it.slot].toUpperCase()));
  if (!opts.hidePrice) {
    const label = opts.priceLabel ?? 'PRICE';
    const value = opts.price ?? it.price;
    meta.append(el('div', 'tip-price', `${label}  ${mesos(value)}`));
  }
  head.append(iconBox, meta);

  const stats = el('div', 'tip-stats');
  for (const line of statLines(it)) stats.append(el('div', line));

  tip.append(name, rule, head, stats);
  for (const line of it.text) tip.append(el('div', 'tip-text', line));
  if (opts.note) tip.append(el('div', 'tip-note', opts.note));
  if (opts.warn) tip.append(el('div', 'tip-cant', opts.warn));

  tip.style.display = 'block';
}

export function hideTip() {
  tip.style.display = 'none';
}

/** Wires hover on any element that stands for an item. */
export function bindTip(node: HTMLElement, get: () => { item: Item; opts?: TipOptions } | null) {
  node.addEventListener('pointerenter', () => {
    const data = get();
    if (data) showItemTip(data.item, data.opts);
  });
  node.addEventListener('pointerleave', hideTip);
}
