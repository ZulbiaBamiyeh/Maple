import type { LedgerEntry, Run } from '../core/game';
import { clear, el, short } from './dom';
import { makeWindow, setTitle, type Win } from './window';

/**
 * At the HOME door: what the day's trades actually were, against what the
 * things were actually worth. Facts, not lessons. §11.2
 */
export class LedgerPanel {
  readonly win: Win;
  private body = el('div', 'ledger');

  constructor(private run: Run, private onDone: () => void) {
    this.win = makeWindow('Day', { x: 260, y: 120, width: 520, cls: 'w-ledger' });
    const panel = el('div', 'panel');
    panel.append(this.body);
    const btn = el('button', 'btn blue', 'sleep');
    btn.addEventListener('click', () => { this.win.close(); this.onDone(); });
    this.win.body.append(panel, btn);
    this.win.onClose = () => this.onDone();
  }

  show(day: number, entries: LedgerEntry[], from: number, to: number) {
    setTitle(this.win, `Day ${day}`);
    clear(this.body);

    const head = el('div', 'head');
    head.append(el('span', undefined, `DAY ${day}`), el('span', undefined, `${short(from)} → ${short(to)}`));
    this.body.append(head, el('div', 'tip-rule'));

    if (!entries.length) {
      this.body.append(el('div', 'sum', 'nothing changed hands today.'));
    }

    for (const e of entries) {
      const row = el('div', 'row' + (e.mark ? ' ' + e.mark : ''));
      const verb = e.kind === 'bought' ? 'bought' : e.kind === 'sold' ? 'sold' : 'wagered';
      const prep = e.kind === 'bought' ? 'from' : e.kind === 'sold' ? 'to' : 'vs';
      const money = e.kind === 'bought' ? `paid ${short(e.amount)}`
        : e.kind === 'sold' ? `got  ${short(e.amount)}`
          : `${e.amount >= 0 ? 'won' : 'lost'}  ${short(Math.abs(e.amount))}`;
      row.append(
        el('span', undefined, verb),
        el('span', undefined, e.what),
        el('span', undefined, `${prep}  ${e.who}`),
        el('span', undefined, money),
        el('span', 'worth', e.trueValue ? `(worth ${short(e.trueValue)})` : ''),
        el('span', undefined, e.mark === 'worst' ? '✗' : ''),
      );
      this.body.append(row);
    }

    const best = entries.find((e) => e.mark === 'best');
    const worst = entries.find((e) => e.mark === 'worst');
    if (best || worst) {
      const sum = el('div', 'sum');
      if (best) sum.append(el('div', undefined, `best deal today:  ${best.what}, ${pct(best)} ${best.kind === 'bought' ? 'under' : 'over'}`));
      if (worst) sum.append(el('div', undefined, `worst:            ${worst.what}, ${pct(worst)} ${worst.kind === 'bought' ? 'over' : 'under'}`));
      this.body.append(sum);
    }

    void this.run;
    this.win.open();
  }
}

function pct(e: LedgerEntry): string {
  const diff = Math.abs(e.amount - e.trueValue) / e.trueValue;
  return Math.round(diff * 100) + '%';
}
