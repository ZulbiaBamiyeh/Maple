import { getItemIcon } from '../assets/index';
import { item } from '../core/items';
import { buy, type Run } from '../core/game';
import type { Stall } from '../core/stalls';
import type { BoardMessage } from '../core/board';
import { clear, el, short } from './dom';
import { bindTip, hideTip } from './tooltip';
import { makeWindow, setTitle, type Win } from './window';

/**
 * A pitch, not a shop: fixed prices, an owner with days left on the lease, sold
 * slots left visible and greyed, and the notice board underneath. §7
 */
export class ShopPanel {
  readonly win: Win;
  private head = el('div', 'shop-head');
  private stock = el('div', 'stock');
  private board = el('div', 'board');
  private input = el('input');
  private stall!: Stall;

  constructor(private run: Run, private onChange: () => void) {
    this.win = makeWindow('Stall', { x: 300, y: 60, width: 430, cls: 'w-shop' });

    const stockPanel = el('div', 'panel');
    stockPanel.append(this.head, this.stock);

    const boardPanel = el('div', 'panel');
    const label = el('div', 'shop-head');
    label.innerHTML = '<b>NOTICE BOARD</b>';
    const row = el('div', 'chatin');
    this.input.placeholder = '';
    this.input.maxLength = 60;
    const post = el('button', 'btn small', 'post');
    row.append(this.input, post);
    boardPanel.append(label, this.board, row);

    post.addEventListener('click', () => this.post());
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.post(); });

    this.win.body.append(stockPanel, boardPanel);
  }

  private post() {
    const text = this.input.value.trim();
    if (!text) return;
    // Persists for the life of the stall and does nothing mechanically. §7.3
    this.stall.board.push({ kind: 'noise', author: 'you', text, day: this.run.day, mine: true });
    this.input.value = '';
    this.renderBoard();
    this.board.scrollTop = this.board.scrollHeight;
  }

  open(stall: Stall) {
    this.stall = stall;
    setTitle(this.win, stall.name);
    this.render();
    this.win.open();
  }

  render() {
    const s = this.stall;
    const sold = s.stock.filter((e) => e.sold).length;
    this.head.innerHTML = '';
    const title = el('div');
    title.innerHTML = `<b>${s.name}</b>`;
    const days = s.daysLeft <= 1 ? 'last day here' : `here for ${s.daysLeft} more days`;
    const meta = el('div', 'meta', `${days} · ${s.stock.length - sold} for sale · ${sold} already sold`);
    this.head.append(title, meta);

    clear(this.stock);
    for (const entry of s.stock) {
      const it = item(entry.itemId);
      const afford = this.run.mesos >= entry.ask;
      const card = el('div', 'card' + (entry.sold ? ' sold' : afford ? '' : ' cant'));
      const img = el('img');
      img.src = getItemIcon(it.iconKey);
      card.append(img, el('div', 'nm', it.name), el('div', 'pr', short(entry.ask)));
      bindTip(card, () => ({
        item: it,
        opts: {
          hidePrice: true,
          priceLabel: 'ASKING',
          warn: entry.sold ? 'SOLD' : afford ? undefined : 'NOT ENOUGH MESOS',
        },
      }));
      if (!entry.sold && afford) {
        card.addEventListener('click', () => {
          buy(this.run, it, entry.ask, s.name);
          entry.sold = true;
          hideTip();
          this.render();
          this.onChange();
        });
      }
      this.stock.append(card);
    }

    this.renderBoard();
  }

  private renderBoard() {
    clear(this.board);
    for (const msg of this.stall.board) this.board.append(renderMessage(msg, this.run.day));
  }
}

/** Messages older than two days render faded. §7.3 */
export function renderMessage(msg: BoardMessage, today: number): HTMLElement {
  const node = el('div', 'msg ' + msg.kind + (today - msg.day > 2 ? ' old' : '') + (msg.mine ? ' mine' : ''));
  const author = el('span', 'au', msg.author + ': ');
  node.append(author, document.createTextNode(msg.text));
  return node;
}
