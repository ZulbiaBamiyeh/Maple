/**
 * The trade window. Hawker on the left, player on the right, exactly as it was.
 * §8.1, §4.5
 *
 * Every single thing the hawker says goes through one queue with think and
 * typing delays. Nothing bypasses it — that is what makes them read as a person.
 */
import { getCharacterSprite, getItemIcon, type Expression } from '../assets/index';
import { Rng } from '../core/rng';
import { item, type Item } from '../core/items';
import {
  CLAIM_LABELS, CLAIM_MULTIPLIERS, hesitation, idleCheck, judgeClaim, judgeTrade,
  mesoWord, openingScript, parse, probe, respond, spendPatience, thinkDelay, typingTime,
  valueToThem, pileValue, type Hawker, type Line, type Reaction, type TableItem,
} from '../core/negotiate';
import { adjustReputation, record, type Run } from '../core/game';
import { logNegotiation } from '../core/log';
import { clear, el, mesos, short, timestamp } from './dom';
import { bindTip, hideTip } from './tooltip';
import { makeWindow, setTitle, type Win } from './window';

interface Queued {
  line: Line;
  seq: number;
}

export class TradeWindow {
  readonly win: Win;
  private theirPortrait = el('div', 'portrait-box');
  private theirName = el('div', 'nameplate');
  private theirGrid = el('div', 'grid');
  private theirMesos = el('div', 'mesos-row');
  private theirSide = el('div', 'side');
  private myPortrait = el('div', 'portrait-box');
  private myName = el('div', 'nameplate');
  private myGrid = el('div', 'grid');
  private myMesos = el('div', 'mesos-row');
  private mySide = el('div', 'side');
  private log = el('div', 'chatlog');
  private typing = el('div', 'typing');
  private input = el('input');
  private notice = el('div', 'notice');
  private tradeBtn = el('button', 'btn blue', 'Trade');
  private leaveBtn = el('button', 'btn green', 'Leave');
  private actions = el('div', 'btn-row');

  /** The player's separate ITEM window, to the right. §8.1 */
  readonly bagWin: Win;
  private bagGrid = el('div', 'grid');
  private claimMenu = el('div', 'panel');

  private h!: Hawker;
  private rng!: Rng;
  private table: TableItem[] = [];
  private offerMesos = 0;
  private queue: Queued[] = [];
  private seq = 0;
  private busy = false;
  private timer = 0;
  private dotTimer = 0;
  private locked = false;
  private pips = 0;
  private lies = 0;
  private caught = 0;
  private settled: number | null = null;
  private closing = false;

  constructor(private run: Run, private onChange: () => void, private onClosed: () => void) {
    this.win = makeWindow('Trade', { x: 170, y: 70, width: 386 });

    this.theirSide.append(this.theirPortrait, this.theirName, this.theirGrid, panelWrap(this.theirMesos));
    this.mySide.append(this.myPortrait, this.myName, this.myGrid, panelWrap(this.myMesos));
    const grids = el('div', 'trade-grid');
    grids.append(this.theirSide, this.mySide);

    const logPanel = el('div');
    logPanel.append(this.log, this.typing);

    const row = el('div', 'chatin');
    this.input.placeholder = 'say something…';
    this.input.maxLength = 80;
    const send = el('button', 'btn small', 'send');
    row.append(this.input, send);

    for (const [label, fn] of [
      ['ask about it', () => this.doProbe()],
      ['too much', () => this.say('too much')],
      ['u offer first', () => this.say('u offer')],
      ['inspect', () => this.say('inspect')],
    ] as [string, () => void][]) {
      const b = el('button', 'btn small', label);
      b.addEventListener('click', fn);
      this.actions.append(b);
    }

    const bottom = el('div', 'btn-row');
    bottom.append(this.leaveBtn, this.tradeBtn);

    this.win.body.append(grids, logPanel, row, this.actions, this.notice, bottom);

    send.addEventListener('click', () => this.submit());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
      e.stopPropagation();
    });
    this.leaveBtn.addEventListener('click', () => this.finish('left'));
    this.tradeBtn.addEventListener('click', () => this.pressTrade());
    this.win.onClose = () => { if (!this.closing) this.finish('left'); };

    this.bagWin = makeWindow('Items', { x: 580, y: 70, width: 184 });
    const bagPanel = el('div', 'panel');
    bagPanel.append(this.bagGrid);
    const mesoRow = el('div', 'chatin');
    const mesoInput = el('input');
    mesoInput.placeholder = 'mesos…';
    const put = el('button', 'btn small', 'put up');
    mesoRow.append(mesoInput, put);
    put.addEventListener('click', () => {
      const v = Math.max(0, Math.min(this.run.mesos, Math.round(Number(mesoInput.value) || 0)));
      this.offerMesos = v;
      mesoInput.value = '';
      this.renderTable();
    });
    mesoInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.claimMenu.style.display = 'none';
    this.bagWin.body.append(bagPanel, mesoRow, this.claimMenu);
  }

  // ------------------------------------------------------------------ opening

  open(h: Hawker, rng: Rng) {
    this.h = h;
    this.rng = rng;
    this.table = [];
    this.offerMesos = 0;
    this.queue = [];
    this.busy = false;
    this.locked = false;
    this.closing = false;
    this.pips = 0;
    this.lies = 0;
    this.caught = 0;
    this.settled = null;
    clear(this.log);
    this.notice.textContent = '';
    setTitle(this.win, 'Trade');
    this.theirName.textContent = h.name;
    this.myName.textContent = 'you';
    this.renderPortraits();
    this.renderTable();
    this.renderBag();
    this.win.open();
    this.bagWin.open();
    this.input.focus();

    // 900–2200ms, then they greet. §8.3
    this.timer = this.rng.float(900, 2200);
    this.enqueue(openingScript(this.rng, h));
  }

  private renderPortraits() {
    for (const [box, look, expr] of [
      [this.theirPortrait, this.h.look, this.expression()],
      [this.myPortrait, this.run.looks[0], 'default' as Expression],
    ] as const) {
      clear(box);
      if (!look) continue;
      const r = getCharacterSprite(look, 'stand1', 0, expr);
      box.append(r.canvas);
    }
  }

  /** Their face carries the mood the numbers never show. §8.9 */
  private expression(): Expression {
    const m = this.h.mood;
    if (m <= -5) return 'angry';
    if (m <= -2) return 'troubled';
    if (m >= 4) return 'love';
    if (m >= 2) return 'smile';
    return 'default';
  }

  // -------------------------------------------------------------------- queue

  private enqueue(lines: Line[]) {
    for (const line of lines) {
      if (line.flush) this.queue.length = 0;
      // Filler is silently dropped if they already said it. §8.3
      if (line.droppable && this.h.recent.includes(line.text)) continue;
      if (line.droppable && (this.busy || this.queue.length)) continue;
      this.queue.push({ line, seq: this.seq++ });
    }
  }

  /** Actions first, then priority, then order. They put the item up before they quote. */
  private takeNext(): Queued | null {
    if (!this.queue.length) return null;
    let best = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const a = this.queue[best].line, b = this.queue[i].line;
      const aScore = (a.action ? 100 : 0) + (a.priority ?? 0);
      const bScore = (b.action ? 100 : 0) + (b.priority ?? 0);
      if (bScore > aScore) best = i;
    }
    return this.queue.splice(best, 1)[0];
  }

  private tick(dt: number) {
    if (!this.win.isOpen || !this.h) return;
    this.dotTimer += dt;
    if (this.typing.dataset.on === '1') {
      const dots = '.'.repeat(1 + (Math.floor(this.dotTimer / 320) % 3));
      this.typing.textContent = `${this.h.name} is typing${dots}`;
    }
    if (this.timer > 0) { this.timer -= dt; return; }
    if (this.busy) return;
    const next = this.takeNext();
    if (!next) { this.showTyping(false); return; }
    this.play(next.line);
  }

  private showTyping(on: boolean) {
    this.typing.dataset.on = on ? '1' : '0';
    if (!on) this.typing.textContent = '';
  }

  private play(line: Line) {
    this.busy = true;
    const think = thinkDelay(this.rng);
    setTimeout(() => {
      if (!this.win.isOpen) return;
      if (!line.text) { this.resolve(line); return; }
      this.showTyping(true);
      let dur = typingTime(this.rng, line.text, this.h.wpm);
      const hes = hesitation(this.rng, dur);
      if (hes) {
        // dots run, stop as if they deleted it, then resume
        dur += hes.extend;
        setTimeout(() => this.showTyping(false), hes.runFor);
        setTimeout(() => this.showTyping(true), hes.runFor + hes.pauseFor);
      }
      setTimeout(() => {
        if (!this.win.isOpen) return;
        this.showTyping(false);
        this.resolve(line);
      }, dur);
    }, think);
  }

  private resolve(line: Line) {
    if (line.text) {
      this.write(this.h.name, line.text);
      this.h.recent = [...this.h.recent, line.text].slice(-5);
    }
    switch (line.action) {
      case 'place':
        this.h.placed = true;
        this.renderTable(true);
        break;
      case 'pull':
        this.h.placed = false;
        this.renderTable();
        this.system('they take their things back.');
        break;
      case 'leave':
        this.finish('temper');
        return;
      case 'accept':
        this.completeTrade();
        return;
      case 'decline':
        this.unlock();
        break;
    }
    this.renderPortraits();
    this.busy = false;
    this.timer = 0;
  }

  // -------------------------------------------------------------------- chat

  private write(who: string, text: string, mine = false) {
    const row = el('div', mine ? 'me' : '');
    row.append(el('span', 'ts', timestamp() + ' '), el('span', 'who', who + ': '), document.createTextNode(text));
    this.log.append(row);
    this.log.scrollTop = this.log.scrollHeight;
  }

  private system(text: string) {
    const row = el('div', 'sys');
    row.textContent = text;
    this.log.append(row);
    this.log.scrollTop = this.log.scrollHeight;
  }

  private say(text: string) {
    this.input.value = text;
    this.submit();
  }

  private submit() {
    const raw = this.input.value.trim();
    this.input.value = '';
    if (!raw || this.locked || this.h.gone) return;
    this.write('you', raw, true);
    const intent = parse(raw, this.run.bag);
    this.apply(respond(this.rng, this.h, intent, this.table, this.offerMesos));
    const idle = idleCheck(this.h);
    if (idle) this.apply(idle);
  }

  private doProbe() {
    if (this.locked || this.h.gone) return;
    this.write('you', 'is it any good?', true);
    this.apply(probe(this.rng, this.h));
  }

  private apply(r: Reaction) {
    if (r.pip) this.pips += r.pip;
    if (r.reputation) adjustReputation(this.run, r.reputation);
    if (r.caught) this.caught++;
    if (r.settled !== undefined) this.settled = r.settled;
    this.enqueue(r.lines);
    this.renderPortraits();
  }

  // ------------------------------------------------------------------- table

  private renderTable(pop = false) {
    clear(this.theirGrid);
    const theirs: (Item | null)[] = [];
    if (this.h.placed && this.h.give.type === 'item') theirs.push(item(this.h.give.id!));
    for (let i = 0; i < 8; i++) {
      const it = theirs[i];
      const cell = el('div', 'cell' + (it ? ' filled' : ''));
      if (it) {
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        if (pop) {
          cell.animate(
            [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
            { duration: 260, easing: 'ease-out' },
          );
        }
        // The player is never told what a thing is worth. §6.4
        bindTip(cell, () => ({ item: it, opts: { hidePrice: true, note: 'theirs' } }));
      }
      this.theirGrid.append(cell);
    }
    clear(this.theirMesos);
    const coin = el('div', 'coin');
    const amt = this.h.placed && this.h.give.type === 'mesos' ? this.h.give.amt! : 0;
    this.theirMesos.append(coin, el('span', undefined, amt ? mesos(amt) : '—'));

    clear(this.myGrid);
    for (let i = 0; i < 8; i++) {
      const entry = this.table[i];
      const cell = el('div', 'cell' + (entry ? ' filled' : ''));
      if (entry) {
        const it = item(entry.itemId);
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        const claimed = Math.round(it.price * entry.claim);
        const tag = el('div', 'tag' + (entry.claim > 1 ? ' lie' : ''), short(claimed));
        cell.append(tag);
        bindTip(cell, () => ({
          item: it,
          opts: {
            note: `you are calling it ${short(claimed)} · they'd value it at ${short(valueToThem(this.h, it))}`,
          },
        }));
        // Clicking the item takes it back; clicking the tag opens the claim menu.
        cell.addEventListener('click', (e) => {
          if (e.target === tag) return;
          this.table.splice(i, 1);
          hideTip();
          this.renderTable();
          this.renderBag();
        });
        tag.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClaimMenu(i);
        });
      }
      this.myGrid.append(cell);
    }
    clear(this.myMesos);
    this.myMesos.append(el('div', 'coin'), el('span', undefined, this.offerMesos ? mesos(this.offerMesos) : '—'));

    const total = pileValue(this.h, this.table, this.offerMesos);
    this.tradeBtn.textContent = total ? `Trade  ${short(total)}` : 'Trade';
  }

  private renderBag() {
    clear(this.bagGrid);
    const used = new Map<number, number>();
    for (const t of this.table) used.set(t.itemId, (used.get(t.itemId) ?? 0) + 1);
    const counts = new Map<number, number>();
    for (const id of this.run.bag) counts.set(id, (counts.get(id) ?? 0) + 1);

    let shown = 0;
    for (const [id, n] of counts) {
      const free = n - (used.get(id) ?? 0);
      const it = item(id);
      for (let k = 0; k < free; k++) {
        const cell = el('div', 'cell filled');
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        bindTip(cell, () => ({
          item: it,
          opts: { note: `they'd value it at ${short(valueToThem(this.h, it))}` },
        }));
        cell.addEventListener('click', () => {
          if (this.locked) return;
          this.table.push({ itemId: id, claim: 1 });
          hideTip();
          this.renderTable();
          this.renderBag();
        });
        this.bagGrid.append(cell);
        shown++;
      }
    }
    for (let i = shown; i < 12; i++) this.bagGrid.append(el('div', 'cell'));
  }

  /** The bluff is visible on the table before committing. §8.7 */
  private openClaimMenu(index: number) {
    const entry = this.table[index];
    const it = item(entry.itemId);
    clear(this.claimMenu);
    this.claimMenu.style.display = 'block';
    const head = el('div', 'shop-head');
    head.innerHTML = `<b>${it.name}</b> — really worth ${short(it.price)}. what do you tell them?`;
    this.claimMenu.append(head);
    CLAIM_MULTIPLIERS.forEach((mult, i) => {
      const btn = el('button', 'btn small', `${CLAIM_LABELS[i]}   "${short(Math.round(it.price * mult))}"`);
      btn.style.textAlign = 'left';
      btn.style.textTransform = 'none';
      btn.addEventListener('click', () => {
        entry.claim = mult;
        this.claimMenu.style.display = 'none';
        this.renderTable();
        if (mult !== 1) {
          if (mult > 1) this.lies++;
          this.apply(judgeClaim(this.rng, this.h, it, mult));
        }
      });
      this.claimMenu.append(btn);
    });
  }

  // --------------------------------------------------------------- handshake

  private pressTrade() {
    if (this.locked || this.h.gone) return;
    const total = pileValue(this.h, this.table, this.offerMesos);
    if (!total) { this.system('put something up first.'); return; }
    this.locked = true;
    this.mySide.classList.add('locked');
    if (!this.mySide.querySelector('.tick')) {
      const tick = el('div', 'tick', '✓');
      this.mySide.style.position = 'relative';
      this.mySide.append(tick);
    }
    this.tradeBtn.setAttribute('disabled', '');
    this.input.setAttribute('disabled', '');
    this.notice.textContent = `Waiting for ${this.h.name} to accept…`;
    // Resolution goes through the queue: three to four seconds they cannot take back.
    this.timer = this.rng.float(3000, 4200);
    this.enqueue(judgeTrade(this.rng, this.h, total).lines);
    const judged = judgeTrade;
    void judged;
  }

  private unlock() {
    this.locked = false;
    this.mySide.classList.remove('locked');
    this.mySide.querySelector('.tick')?.remove();
    this.tradeBtn.removeAttribute('disabled');
    this.input.removeAttribute('disabled');
    this.notice.textContent = '';
    this.pips++;
  }

  private completeTrade() {
    this.theirSide.classList.add('locked');
    if (!this.theirSide.querySelector('.tick')) {
      const tick = el('div', 'tick', '✓');
      this.theirSide.style.position = 'relative';
      this.theirSide.append(tick);
    }
    const total = pileValue(this.h, this.table, this.offerMesos);

    // What actually changes hands.
    this.run.mesos -= this.offerMesos;
    for (const t of this.table) {
      const i = this.run.bag.indexOf(t.itemId);
      if (i >= 0) this.run.bag.splice(i, 1);
      const it = item(t.itemId);
      record(this.run, { kind: 'sold', what: it.name, who: this.h.name, amount: 0, trueValue: it.price });
    }
    if (this.h.give.type === 'item') {
      const it = item(this.h.give.id!);
      this.run.bag.push(it.id);
      record(this.run, { kind: 'bought', what: it.name, who: this.h.name, amount: total, trueValue: it.price });
    } else {
      this.run.mesos += this.h.give.amt!;
      record(this.run, {
        kind: 'sold', what: this.table.map((t) => item(t.itemId).name).join(', ') || 'mesos',
        who: this.h.name, amount: this.h.give.amt!,
        trueValue: this.table.reduce((n, t) => n + item(t.itemId).price, 0),
      });
    }
    adjustReputation(this.run, 1);
    this.onChange();
    this.notice.textContent = 'trade complete';
    setTimeout(() => this.finish('traded'), 1100);
  }

  private finish(outcome: 'traded' | 'walked' | 'patience' | 'temper' | 'left') {
    if (this.closing) return;
    this.closing = true;
    logNegotiation({
      day: this.run.day,
      hawker: this.h.name,
      buyer: this.h.buyer,
      ask: this.h.ask,
      floor: this.h.floor,
      trueValue: this.h.trueValue,
      settled: this.settled,
      pipsUsed: this.pips,
      moodEnd: this.h.mood,
      lieAttempts: this.lies,
      lieCaught: this.caught,
      outcome,
    });
    this.h.gone = true;
    this.queue.length = 0;
    this.showTyping(false);
    hideTip();
    this.win.close();
    this.bagWin.close();
    this.onClosed();
  }

  /** Driven from the main loop so delays stay tied to real time. */
  step(dtMs: number) {
    this.tick(dtMs);
    if (this.h && this.h.patience <= 0 && !this.closing && !this.queue.length && !this.busy) {
      this.enqueue(spendPatience(this.h, 0));
    }
  }
}

function panelWrap(node: HTMLElement): HTMLElement {
  const p = el('div', 'panel');
  p.style.padding = '4px 6px';
  p.append(node);
  return p;
}

export function itemName(id: number): string { return item(id).name; }
export { mesoWord };
