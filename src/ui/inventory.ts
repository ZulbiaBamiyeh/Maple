import { getCharacterSprite, getItemIcon } from '../assets/index';
import { rollUp } from '../core/combat';
import { item, SLOTS, SLOT_LABEL, type Item, type Slot } from '../core/items';
import { equip, sellToStall, unequip, type Run } from '../core/game';
import { clear, el, mesos, short } from './dom';
import { bindTip, hideTip } from './tooltip';
import { makeWindow, type Win } from './window';

/** Paper doll, bag, live stat rollup, and the bad exit at 50%. §8.10, milestone 5 */
export class InventoryPanel {
  readonly win: Win;
  private doll = el('div', 'doll');
  private slots = el('div', 'slots');
  private bag = el('div', 'grid');
  private stats = el('div', 'statlist');
  private purse = el('div', 'mesos-row');

  constructor(private run: Run, private onChange: () => void) {
    this.win = makeWindow('Equipment', { x: 40, y: 70, width: 330 });

    const top = el('div');
    top.style.display = 'flex';
    top.style.gap = '8px';
    const right = el('div');
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '6px';
    right.append(this.slots);
    const statPanel = el('div', 'panel');
    statPanel.append(this.stats);
    right.append(statPanel);
    top.append(this.doll, right);

    const bagPanel = el('div', 'panel');
    const bagLabel = el('div', 'shop-head');
    bagLabel.innerHTML = '<b>ITEMS</b>';
    bagPanel.append(bagLabel, this.bag);

    const coin = el('div', 'coin');
    this.purse.append(coin, el('span', undefined, '0'));

    this.win.body.append(top, bagPanel, this.purse);
  }

  open() { this.render(); this.win.open(); }

  render() {
    const run = this.run;
    clear(this.doll);
    const sprite = getCharacterSprite(run.looks[0] ?? { skin: '0', face: 20000, hair: 30030, sitting: false }, 'stand1', 0);
    this.doll.append(sprite.canvas);

    clear(this.slots);
    for (const slot of SLOTS) {
      const id = run.gear[slot];
      const cell = el('div', 'slot' + (id ? ' filled' : ''));
      if (id === undefined) cell.append(el('div', 'lbl', SLOT_LABEL[slot].slice(0, 3).toUpperCase()));
      if (id !== undefined) {
        const it = item(id);
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        bindTip(cell, () => ({ item: it, opts: { note: 'click to take off' } }));
        cell.addEventListener('click', () => {
          unequip(run, slot);
          hideTip();
          this.render();
          this.onChange();
        });
      }
      this.slots.append(cell);
    }

    clear(this.bag);
    const counted = new Map<number, number>();
    for (const id of run.bag) counted.set(id, (counted.get(id) ?? 0) + 1);
    const worn = new Set(Object.values(run.gear));
    for (const [id, n] of counted) {
      const it = item(id);
      for (let k = 0; k < n; k++) {
        const cell = el('div', 'cell filled');
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        if (worn.has(id) && k === 0) {
          const tag = el('div', 'tag', 'WORN');
          cell.append(tag);
        }
        bindTip(cell, () => ({
          item: it,
          opts: { note: 'click to wear · right-click sells to a stall for ' + short(Math.round(it.price * 0.5)) },
        }));
        cell.addEventListener('click', () => { equip(run, it); this.render(); this.onChange(); });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          sellToStall(run, it);
          hideTip();
          this.render();
          this.onChange();
        });
        this.bag.append(cell);
      }
    }
    for (let i = counted.size; i < 16; i++) this.bag.append(el('div', 'cell'));

    const s = rollUp(run.gear);
    clear(this.stats);
    const lines = [
      `ATTACK   ${s.min}-${s.max}`,
      `SPEED    ${s.speed.toFixed(2)}/s`,
      `ARMOUR   ${s.armour}`,
      `STR      ${s.str}`,
      `CRIT     ${s.crit}% / +${s.critDmg}%`,
    ];
    for (const line of lines) this.stats.append(el('div', undefined, line));

    (this.purse.lastChild as HTMLElement).textContent = mesos(run.mesos) + ' mesos';
  }
}

export function itemOf(id: number): Item { return item(id); }
export type { Slot };
