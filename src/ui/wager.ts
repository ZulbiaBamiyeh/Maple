/**
 * Agreeing the stakes. Works like the trade window on purpose — the two are the
 * same act, and one of them happens to end in a fight. §10
 */
import { getCharacterSprite, getItemIcon } from '../assets/index';
import { item, type Slot } from '../core/items';
import { Rng } from '../core/rng';
import { record, stakeCap, type Run } from '../core/game';
import {
  capFor, crossReference, makeOpponent, proposeOdds, settle, stakeWord,
  type Odds, type Opponent, type Stake,
} from '../core/wager';
import type { Appearance } from '../core/appearance';
import { Arena } from './arena';
import { clear, el, timestamp } from './dom';
import { bindTip, hideTip } from './tooltip';
import { makeWindow, setTitle, type Win } from './window';
import { dressed } from './look';

type Phase = 'staking' | 'agreed' | 'regear' | 'fighting';

export class WagerWindow {
  readonly win: Win;
  private portrait = el('div', 'portrait-box');
  private nameplate = el('div', 'nameplate');
  private stakeGrid = el('div', 'grid');
  private bagGrid = el('div', 'grid');
  private mesoInput = el('input');
  private oddsLine = el('div', 'odds');
  private log = el('div', 'chatlog');
  private askBtn = el('button', 'btn small', 'ask for odds');
  private acceptBtn = el('button', 'btn blue', 'agree');
  private walkBtn = el('button', 'btn green', 'walk away');
  private regearLine = el('div', 'regear');

  private opp!: Opponent;
  private rng!: Rng;
  private mine: Stake = { items: [], mesos: 0 };
  private theirs: Stake = { items: [], mesos: 0 };
  private odds: Odds | null = null;
  private phase: Phase = 'staking';
  private regearLeft = 0;

  constructor(
    private run: Run,
    private arena: Arena,
    private openGear: () => void,
    private onChange: () => void,
    private onClosed: () => void,
  ) {
    this.win = makeWindow('Wager', { x: 600, y: 70, width: 380 });

    const head = el('div', 'trade-grid');
    const left = el('div', 'side');
    left.append(this.portrait, this.nameplate);
    const right = el('div', 'side');
    right.append(this.stakeGrid);
    head.append(left, right);

    const purse = el('div', 'chatin');
    this.mesoInput.placeholder = '';
    const setBtn = el('button', 'btn small', 'set');
    purse.append(this.mesoInput, setBtn);
    setBtn.addEventListener('click', () => this.setMesos());
    this.mesoInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.setMesos();
    });

    const bagPanel = el('div', 'panel');
    bagPanel.append(this.bagGrid);

    const buttons = el('div', 'btn-row');
    buttons.append(this.askBtn);
    const bottom = el('div', 'btn-row');
    bottom.append(this.walkBtn, this.acceptBtn);

    this.win.body.append(head, purse, bagPanel, this.oddsLine, this.regearLine, this.log, buttons, bottom);

    this.askBtn.addEventListener('click', () => this.askOdds());
    this.acceptBtn.addEventListener('click', () => this.agree());
    this.walkBtn.addEventListener('click', () => this.win.close());
    this.win.onClose = () => { if (this.phase === 'staking') this.onClosed(); };

    this.arena.onFinish((winner, yielded) => this.resolve(winner === 0, yielded));
  }

  open(name: string, look: Appearance, wealth: number, rng: Rng) {
    this.rng = rng;
    this.opp = makeOpponent(rng, name, look, wealth);
    this.mine = { items: [], mesos: 0 };
    this.theirs = { items: [], mesos: 0 };
    this.odds = null;
    this.phase = 'staking';
    this.regearLine.textContent = '';
    clear(this.log);
    setTitle(this.win, 'Wager');
    this.nameplate.textContent = `${name}   ${this.opp.wins}W ${this.opp.losses}L`;
    clear(this.portrait);
    this.portrait.append(getCharacterSprite(dressed(look, this.opp.gear), 'stand1', 0).canvas);
    this.oddsLine.textContent = '';
    this.acceptBtn.setAttribute('disabled', '');
    this.say(name, rng.pick(['u wanna go?', 'lets fight for it', 'put something up then', 'what are we playing for']));
    this.render();
    this.win.open();
  }

  private say(who: string, text: string) {
    const row = el('div');
    row.append(el('span', 'ts', timestamp() + ' '), el('span', 'who', who + ': '), document.createTextNode(text));
    this.log.append(row);
    this.log.scrollTop = this.log.scrollHeight;
  }

  private setMesos() {
    const cap = stakeCap(this.run);
    const want = Math.max(0, Math.round(Number(this.mesoInput.value) || 0));
    if (want > cap) {
      // Enforced in fiction, never by a UI limit. §10.2
      this.say(this.opp.name, this.rng.pick(['thats too rich for me', 'i cant cover that', 'nah, smaller']));
      this.mine.mesos = cap;
    } else {
      this.mine.mesos = want;
    }
    this.mesoInput.value = '';
    this.odds = null;
    this.acceptBtn.setAttribute('disabled', '');
    this.render();
  }

  private askOdds() {
    if (this.phase !== 'staking') return;
    const proposal = proposeOdds(this.rng, this.opp, this.mine.items, this.run, this.run.mesos);
    this.say(this.opp.name, proposal.line);
    if (proposal.kind === 'refuse') {
      this.odds = null;
      this.oddsLine.textContent = '';
      this.acceptBtn.setAttribute('disabled', '');
      return;
    }
    this.odds = proposal.odds!;
    this.mine.mesos = this.odds.you;
    this.theirs.mesos = this.odds.them;
    this.oddsLine.textContent = `you ${stakeWord(this.odds.you)}   ·   them ${stakeWord(this.odds.them)}`;
    this.acceptBtn.removeAttribute('disabled');
    this.render();
  }

  private agree() {
    if (!this.odds || this.phase !== 'staking') return;
    if (this.mine.mesos > this.run.mesos) {
      this.say(this.opp.name, 'u dont have it');
      return;
    }
    this.phase = 'regear';
    this.regearLeft = 15;
    this.acceptBtn.setAttribute('disabled', '');
    this.askBtn.setAttribute('disabled', '');
    this.say(this.opp.name, this.rng.pick(['ok. get ready', 'fifteen seconds', 'go on then']));
    this.openGear();
  }

  /** Both sides get fifteen seconds with the paper doll open. §10.4 */
  step(dt: number) {
    if (this.phase !== 'regear') return;
    this.regearLeft -= dt;
    this.regearLine.textContent = `GEARING UP — ${Math.max(0, Math.ceil(this.regearLeft))}`;
    if (this.regearLeft > 0) return;
    this.regearLine.textContent = '';
    this.phase = 'fighting';

    const jab = crossReference(this.rng, this.opp, this.mine.items, this.run.gear);
    if (jab) this.say(this.opp.name, jab);

    this.win.close();
    hideTip();
    this.arena.open(
      { name: 'you', look: this.run.looks[0], gear: this.run.gear, record: `${this.run.wins}W ${this.run.losses}L` },
      { name: this.opp.name, look: this.opp.look, gear: this.opp.gear, record: `${this.opp.wins}W ${this.opp.losses}L` },
      this.rng.derive('fight'),
    );
  }

  private resolve(won: boolean, yielded: boolean) {
    if (this.phase !== 'fighting') return;
    this.phase = 'staking';
    const s = settle(won, yielded, this.mine, this.theirs, this.rng);
    this.run.mesos += s.mesos;
    for (const id of s.itemsWon) this.run.bag.push(id);
    for (const id of s.itemsLost) {
      const i = this.run.bag.indexOf(id);
      if (i >= 0) this.run.bag.splice(i, 1);
      for (const [slot, worn] of Object.entries(this.run.gear)) {
        if (worn === id) delete this.run.gear[slot as Slot];
      }
    }
    if (won) this.run.wins++; else this.run.losses++;
    this.run.foughtToday = true;
    record(this.run, {
      kind: 'wagered', what: stakeWord(Math.abs(s.mesos)), who: this.opp.name,
      amount: s.mesos, trueValue: 0,
    });
    this.arena.close();
    this.onChange();
    this.onClosed();
  }

  private render() {
    clear(this.stakeGrid);
    for (let i = 0; i < 8; i++) {
      const id = this.mine.items[i];
      const cell = el('div', 'cell' + (id !== undefined ? ' filled' : ''));
      if (id !== undefined) {
        const it = item(id);
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        bindTip(cell, () => ({ item: it }));
        cell.addEventListener('click', () => {
          if (this.phase !== 'staking') return;
          this.mine.items.splice(i, 1);
          this.odds = null;
          hideTip();
          this.render();
        });
      }
      this.stakeGrid.append(cell);
    }

    clear(this.bagGrid);
    const staked = new Map<number, number>();
    for (const id of this.mine.items) staked.set(id, (staked.get(id) ?? 0) + 1);
    const counts = new Map<number, number>();
    for (const id of this.run.bag) counts.set(id, (counts.get(id) ?? 0) + 1);
    let shown = 0;
    for (const [id, n] of counts) {
      const free = n - (staked.get(id) ?? 0);
      const it = item(id);
      for (let k = 0; k < free; k++) {
        const cell = el('div', 'cell filled');
        const img = el('img');
        img.src = getItemIcon(it.iconKey);
        cell.append(img);
        bindTip(cell, () => ({ item: it }));
        cell.addEventListener('click', () => {
          if (this.phase !== 'staking') return;
          this.mine.items.push(id);
          this.odds = null;
          this.acceptBtn.setAttribute('disabled', '');
          hideTip();
          this.render();
        });
        this.bagGrid.append(cell);
        shown++;
      }
    }
    for (let i = shown; i < 12; i++) this.bagGrid.append(el('div', 'cell'));

    const cap = capFor(this.run.mesos);
    this.oddsLine.title = '';
    if (!this.odds) {
      this.oddsLine.textContent = this.mine.mesos
        ? `you ${stakeWord(this.mine.mesos)}   ·   them ?`
        : '';
    }
    this.regearLine.dataset.cap = String(cap);
  }
}
