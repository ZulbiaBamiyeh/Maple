import { getCharacterSprite, getItemIcon } from '../assets/index';
import { rollUp } from '../core/combat';
import { item, SLOTS, type Slot } from '../core/items';
import { equip, sellToStall, unequip, type Run } from '../core/game';
import { clear, el, mesos } from './dom';
import { bindTip, hideTip } from './tooltip';
import { dressed } from './look';
import { makeWindow, type Win } from './window';

/**
 * The client kept these apart, so this does too: an Equipment window laid out
 * anatomically around a character preview, and a separate Item window with the
 * tab strip across the top and the mesos row along the bottom. §4.5
 */

/** The anatomical grid. `null` is a blank cell — the shape is the point. */
const LAYOUT: (Slot | null)[][] = [
  ['ring', null, 'helm', null],
  ['ring', 'earring', 'pendant', 'cape'],
  ['ring', 'body', 'legs', 'boots'],
  ['ring', 'gloves', 'shield', 'weapon'],
];

const TABS = ['Equip', 'Use', 'Etc', 'Set-up', 'Cash'] as const;

export class InventoryPanel {
  readonly win: Win;
  readonly itemWin: Win;
  private doll = el('div', 'doll');
  private slots = el('div', 'eq-grid');
  private stats = el('div', 'statlist');
  private bag = el('div', 'grid');
  private purse = el('div', 'mesos-row');
  private tabStrip = el('div', 'tabs');
  private activeTab = 0;

  constructor(private run: Run, private onChange: () => void) {
    this.win = makeWindow('Equipment Inventory', { x: 40, y: 66, width: 302 });
    const row = el('div', 'eq-row');
    const dollPanel = el('div', 'panel eq-doll');
    dollPanel.append(this.doll);
    row.append(dollPanel, this.slots);
    const statPanel = el('div', 'panel');
    statPanel.append(this.stats);
    this.win.body.append(row, statPanel);

    this.itemWin = makeWindow('Item Inventory', { x: 360, y: 66, width: 206 });
    TABS.forEach((name, i) => {
      const tab = el('div', 'tab' + (i === 0 ? ' on' : ''), name);
      tab.addEventListener('click', () => {
        this.activeTab = i;
        [...this.tabStrip.children].forEach((c, k) => c.classList.toggle('on', k === i));
        this.render();
      });
      this.tabStrip.append(tab);
    });
    const bagPanel = el('div', 'panel');
    bagPanel.append(this.bag);
    const coin = el('div', 'coin');
    this.purse.append(coin, el('span', undefined, '0'));
    const pursePanel = el('div', 'panel');
    pursePanel.style.padding = '4px 6px';
    pursePanel.append(this.purse);
    this.itemWin.body.append(this.tabStrip, bagPanel, pursePanel);

    this.win.onClose = () => this.itemWin.close();
  }

  open() {
    this.render();
    this.win.open();
    this.itemWin.open();
  }

  get isOpen() { return this.win.isOpen; }

  render() {
    const run = this.run;

    clear(this.doll);
    const base = run.looks[0] ?? { skin: '0', face: 20000, hair: 30030, sitting: false };
    this.doll.append(getCharacterSprite(dressed(base, run.gear), 'stand1', 0).canvas);

    clear(this.slots);
    const ringsUsed: number[] = [];
    for (const rowSlots of LAYOUT) {
      for (const slot of rowSlots) {
        if (!slot) { this.slots.append(el('div', 'eq-blank')); continue; }
        // Four ring cells, one ring slot — the extra three stay empty, as they did.
        const id = slot === 'ring'
          ? (ringsUsed.length === 0 ? run.gear.ring : undefined)
          : run.gear[slot];
        if (slot === 'ring') ringsUsed.push(1);
        const cell = el('div', 'slot' + (id !== undefined ? ' filled' : ''));
        if (id !== undefined) {
          const it = item(id);
          const img = el('img');
          img.src = getItemIcon(it.iconKey);
          cell.append(img);
          bindTip(cell, () => ({ item: it }));
          cell.addEventListener('click', () => {
            unequip(run, slot);
            hideTip();
            this.render();
            this.onChange();
          });
        }
        this.slots.append(cell);
      }
    }

    clear(this.bag);
    const worn = new Set(Object.values(run.gear));
    const counted = new Map<number, number>();
    // Only the Equip tab holds anything; the others are here because they were.
    if (this.activeTab === 0) for (const id of run.bag) counted.set(id, (counted.get(id) ?? 0) + 1);
    let shown = 0;
    for (const [id, n] of counted) {
      const it = item(id);
      for (let k = 0; k < n; k++) {
        const cell = el('div', 'cell filled');
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        if (worn.has(id) && k === 0) cell.append(el('div', 'tag', 'WORN'));
        bindTip(cell, () => ({ item: it }));
        cell.addEventListener('click', () => { equip(run, it); this.render(); this.onChange(); });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          sellToStall(run, it);
          hideTip();
          this.render();
          this.onChange();
        });
        this.bag.append(cell);
        shown++;
      }
    }
    for (let i = shown; i < 24; i++) this.bag.append(el('div', 'cell'));

    const s = rollUp(run.gear);
    clear(this.stats);
    for (const line of [
      `ATTACK   ${s.min}-${s.max}`,
      `SPEED    ${s.speed.toFixed(2)}/s`,
      `ARMOUR   ${s.armour}`,
      `STR      ${s.str}`,
      `CRIT     ${s.crit}% / +${s.critDmg}%`,
    ]) this.stats.append(el('div', undefined, line));

    (this.purse.lastChild as HTMLElement).textContent = mesos(run.mesos) + ' mesos';
  }
}

export { SLOTS };
