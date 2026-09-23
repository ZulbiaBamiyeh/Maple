import { getItemIcon } from '../assets/index';
import { rollUp } from '../core/combat';
import { item, type Slot } from '../core/items';
import { equip, sellToStall, unequip, type Run } from '../core/game';
import { clear, el, mesos } from './dom';
import { bindTip, hideTip } from './tooltip';
import { makeWindow, type Win } from './window';

/**
 * Two windows, the way the client had them: an Equipment Inventory with the
 * slots laid out anatomically over a body outline and captioned, and an Item
 * Inventory with the tab strip, a 4x6 grid and the meso line. §4.5
 */

/** Slot captions and where they sit on the figure, as percentages of the panel. */
const PLACES: { slot: Slot; label: string; x: number; y: number }[] = [
  { slot: 'pendant', label: 'PENDANT', x: 20, y: 2 },
  { slot: 'helm', label: 'FOREHEAD', x: 50, y: 2 },
  { slot: 'earring', label: 'EARS', x: 80, y: 2 },
  { slot: 'gloves', label: 'GLOVES', x: 20, y: 26 },
  { slot: 'body', label: 'TOP', x: 50, y: 26 },
  { slot: 'cape', label: 'CAPE', x: 80, y: 26 },
  { slot: 'weapon', label: 'WEAPON', x: 20, y: 50 },
  { slot: 'legs', label: 'PANTLEG', x: 50, y: 50 },
  { slot: 'shield', label: 'SHIELD', x: 80, y: 50 },
  { slot: 'ring', label: 'RING', x: 20, y: 74 },
  { slot: 'boots', label: 'SHOES', x: 50, y: 74 },
];

const TABS = ['Equip', 'Use', 'Set-up', 'Etc'] as const;

export class InventoryPanel {
  readonly win: Win;
  readonly itemWin: Win;
  private board = el('div', 'eq-board');
  private stats = el('div', 'statlist');
  private bag = el('div', 'grid');
  private purse = el('div', 'meso-line');
  private tabStrip = el('div', 'tabs');
  private activeTab = 0;

  constructor(private run: Run, private onChange: () => void) {
    this.win = makeWindow('Equipment Inventory', { x: 40, y: 66, width: 250 });
    this.board.append(figure());
    this.win.body.append(this.board, wrapPanel(this.stats));

    this.itemWin = makeWindow('Item Inventory', { x: 320, y: 66, width: 188 });
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
    this.itemWin.body.append(this.tabStrip, bagPanel, this.purse);

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

    for (const node of Array.from(this.board.querySelectorAll('.eq-place'))) node.remove();
    for (const place of PLACES) {
      const holder = el('div', 'eq-place');
      holder.style.left = place.x + '%';
      holder.style.top = place.y + '%';
      holder.append(el('div', 'eq-cap', place.label));
      const id = run.gear[place.slot];
      const cell = el('div', 'slot' + (id !== undefined ? ' filled' : ''));
      if (id !== undefined) {
        const it = item(id);
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        bindTip(cell, () => ({ item: it }));
        cell.addEventListener('click', () => {
          unequip(run, place.slot);
          hideTip();
          this.render();
          this.onChange();
        });
      }
      holder.append(cell);
      this.board.append(holder);
    }

    clear(this.bag);
    const worn = new Set(Object.values(run.gear));
    const counted = new Map<number, number>();
    if (this.activeTab === 0) for (const id of run.bag) counted.set(id, (counted.get(id) ?? 0) + 1);
    let shown = 0;
    for (const [id, n] of counted) {
      const it = item(id);
      for (let k = 0; k < n; k++) {
        const cell = el('div', 'cell filled');
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        if (worn.has(id) && k === 0) cell.append(el('div', 'tag', 'E'));
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

    this.purse.textContent = mesos(run.mesos) + ' mesos';
  }
}

function wrapPanel(node: HTMLElement): HTMLElement {
  const p = el('div', 'panel');
  p.append(node);
  return p;
}

/** The faint figure the slots hang off. */
function figure(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 150');
  svg.setAttribute('class', 'eq-figure');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', [
    'M50 8 a13 13 0 1 1 -0.1 0 Z',
    'M38 34 h24 l6 8 v30 h-9 v46 h-8 v-30 h-2 v30 h-8 v-46 h-9 v-30 Z',
    'M32 42 l-10 6 v26 h6 v-22 Z',
    'M68 42 l10 6 v26 h-6 v-22 Z',
  ].join(' '));
  path.setAttribute('fill', 'rgba(255,255,255,0.55)');
  path.setAttribute('stroke', 'rgba(90,100,120,0.45)');
  path.setAttribute('stroke-width', '1');
  svg.append(path);
  return svg;
}
