/**
 * The training dummy on the upper walkway: your real loadout, swinging on its
 * real timer, against something that hits back gently. It exists so the player
 * can see what a purchase actually did. §9
 *
 * The numbers and the flame are drawn into the scene over the dummy itself, not
 * into the window — the window is only the scoreboard.
 */
import { BASE_HP, canYield, startFight, step, type CombatEvent, type Fight } from '../core/combat';
import type { Run } from '../core/game';
import { Rng } from '../core/rng';
import type { Scene } from '../scene/scene';
import { WORLD } from '../scene/world';
import { SLOT_LABEL, type Slot } from '../core/items';
import { clear, el } from './dom';
import { makeWindow, type Win } from './window';

export class DummyWindow {
  readonly win: Win;
  private bars = el('div', 'panel');
  private feed = el('div', 'chatlog');
  private startBtn = el('button', 'btn green', 'swing');
  private fight: Fight | null = null;
  private burnB = 0;
  private procFlash = new Map<Slot, number>();
  private flashes = el('div', 'statlist');

  constructor(private run: Run) {
    this.win = makeWindow('Training Dummy', { x: 760, y: 90, width: 262 });
    this.win.body.append(this.bars, this.flashes, this.feed, this.startBtn);
    this.startBtn.addEventListener('click', () => this.begin());
  }

  open() {
    this.render();
    this.win.open();
  }

  private begin() {
    const rng = new Rng(String(Date.now()));
    this.fight = startFight(rng, { name: 'you', gear: this.run.gear }, { name: 'dummy', gear: { body: 11 } });
    this.fight.b.maxHp = this.fight.b.hp = BASE_HP * 3;
    this.fight.b.stats.min = 1;
    this.fight.b.stats.max = 3;
    this.burnB = 0;
    clear(this.feed);
    this.startBtn.textContent = 'swinging…';
  }

  private render() {
    clear(this.bars);
    const you = this.fight?.a;
    const them = this.fight?.b;
    this.bars.append(bar('you', you ? you.hp : BASE_HP, you ? you.maxHp : BASE_HP, '#4f9f5c'));
    this.bars.append(bar('dummy', them ? them.hp : BASE_HP * 3, them ? them.maxHp : BASE_HP * 3, '#c9524f'));
    clear(this.flashes);
    for (const [slot, t] of this.procFlash) {
      if (t <= 0) continue;
      const line = el('div', undefined, `${SLOT_LABEL[slot].toUpperCase()} fired`);
      line.style.color = '#b8860b';
      line.style.opacity = String(Math.min(1, t));
      this.flashes.append(line);
    }
  }

  step(dt: number, scene: Scene) {
    for (const [slot, t] of this.procFlash) this.procFlash.set(slot, t - dt);
    const dummyX = WORLD.dummyX;
    const dummyY = WORLD.upperFloor - 78;
    if (this.burnB > 0) {
      scene.fx.flame(dummyX, dummyY + 18, this.burnB, dt);
      scene.fx.drawBurnGlow;
    }
    if (!this.fight || this.fight.over) {
      if (this.fight?.over && this.startBtn.textContent === 'swinging…') {
        this.startBtn.textContent = 'swing again';
        this.render();
      }
      return;
    }
    if (scene.fx.hitstop > 0) { scene.fx.update(0); }
    const events = step(this.fight, dt);
    for (const e of events) this.handle(e, scene, dummyX, dummyY);
    this.render();
  }

  private handle(e: CombatEvent, scene: Scene, x: number, y: number) {
    switch (e.type) {
      case 'hit':
        if (e.side === 1) scene.fx.popNumber(e.amount, e.crit ? 'crit' : 'hit', x, y);
        break;
      case 'tick':
        if (e.side === 1) scene.fx.popNumber(e.amount, 'burn', x + 14, y + 26);
        break;
      case 'heal':
        if (e.side === 0) scene.fx.popNumber(e.amount, 'heal', scene.player.x, WORLD.upperFloor - 70);
        break;
      case 'status':
        if (e.status === 'burn') this.burnB = this.fight ? this.fight.b.burn : 0;
        break;
      case 'proc':
        // That slot lights up, which is how the player learns what did the cool thing. §9.6
        this.procFlash.set(e.slot, 1.2);
        this.line(`${SLOT_LABEL[e.slot]} → ${e.status}`);
        break;
      case 'end':
        this.line(e.winner === 0 ? `dummy down in ${this.fight!.t.toFixed(1)}s` : 'the dummy outlasted you');
        break;
    }
    this.burnB = this.fight ? this.fight.b.burn : 0;
    void canYield;
  }

  private line(text: string) {
    const row = el('div', 'sys', text);
    this.feed.append(row);
    this.feed.scrollTop = this.feed.scrollHeight;
  }
}

function bar(label: string, hp: number, max: number, colour: string): HTMLElement {
  const wrap = el('div');
  wrap.style.marginBottom = '4px';
  const head = el('div', 'statlist', `${label.toUpperCase()}  ${Math.max(0, Math.round(hp))}/${max}`);
  const track = el('div');
  track.style.cssText = 'height:9px;background:#8d8a7d;border:1px solid #6f6c62;';
  const fill = el('div');
  fill.style.cssText = `height:100%;width:${Math.max(0, (hp / max) * 100)}%;background:${colour};`;
  track.append(fill);
  wrap.append(head, track);
  return wrap;
}
