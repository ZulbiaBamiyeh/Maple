import { getItemIcon } from '../assets/index';
import { SLOT_LABEL, statLines, type Item } from '../core/items';
import { clear, el, mesos } from './dom';

/**
 * The item tooltip, built the way the client's was: name across the top, a rule,
 * the icon in its own box beside the slot and price, then stat lines, then the
 * green passive and proc text. §9.2
 */
let tip: HTMLElement;
/** A tip opened by a long press stays up after the finger lifts, until the next tap. */
let pinned = false;
let lastTouch = false;

export function initTooltip() {
  tip = el('div');
  tip.id = 'tip';
  document.body.append(tip);
  window.addEventListener('pointermove', (e) => { if (!pinned) move(e.clientX, e.clientY, e.pointerType === 'touch'); });
  window.addEventListener('pointerdown', (e) => {
    lastTouch = e.pointerType === 'touch';
    if (pinned && !tip.contains(e.target as Node)) hideTip();
  }, true);
}

/** Whether the last press came from a finger — a long press is not a right-click. */
export function wasTouch(): boolean { return lastTouch; }

function move(cx: number, cy: number, finger = false) {
  if (tip.style.display !== 'block') return;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x: number, y: number;
  if (finger) {
    // Above the finger, so the thumb doesn't cover what it is asking about.
    x = Math.max(6, Math.min(vw - w - 6, cx - w / 2));
    y = cy - h - 28;
    if (y < 6) y = Math.min(vh - h - 6, cy + 28);
    if (y < 6) y = 6;
  } else {
    x = cx + 16; y = cy + 18;
    if (x + w > vw - 6) x = cx - w - 14;
    if (y + h > vh - 6) y = Math.max(6, cy - h - 12);
  }
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
  tip.classList.remove('pinned');
  pinned = false;
}

const HOLD_MS = 380;

/**
 * Wires hover on any element that stands for an item. A finger has no hover, so
 * on a touchscreen the tip comes up on a long press instead — and a tap still
 * does whatever tapping the item does. `action` adds a button to the pinned
 * tip for what a mouse does with a right-click.
 */
export function bindTip(
  node: HTMLElement,
  get: () => { item: Item; opts?: TipOptions } | null,
  action?: { label: string; run: () => void },
) {
  node.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    const data = get();
    if (data) showItemTip(data.item, data.opts);
    move(e.clientX, e.clientY);
  });
  node.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hideTip(); });

  let hold = 0;
  let held = false;
  let sx = 0, sy = 0;
  const cancel = () => { clearTimeout(hold); hold = 0; };
  node.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    held = false;
    sx = e.clientX; sy = e.clientY;
    cancel();
    hold = window.setTimeout(() => {
      hold = 0;
      const data = get();
      if (!data) return;
      held = true;
      showItemTip(data.item, data.opts);
      pinned = true;
      tip.classList.add('pinned');
      if (action) {
        const btn = el('button', 'btn small tip-act', action.label);
        btn.addEventListener('click', () => { hideTip(); action.run(); });
        tip.append(btn);
      }
      move(sx, sy, true);
      navigator.vibrate?.(8);
    }, HOLD_MS);
  });
  node.addEventListener('pointermove', (e) => {
    if (hold && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel();
  });
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);
  // The press was an inspection, not a tap: swallow the click that follows it.
  node.addEventListener('click', (e) => {
    if (!held) return;
    held = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  node.addEventListener('contextmenu', (e) => { if (wasTouch()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}
