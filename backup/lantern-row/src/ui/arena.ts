/**
 * Where the fight actually happens. Two paper dolls on a boarded floor, their
 * real gear, their real timers — and the damage numbers, flame and hitstop that
 * make a swing land. §9.6
 */
import { getCharacterSprite, getItemIcon, type Pose } from '../assets/index';
import type { Appearance } from '../core/appearance';
import {
  canYield, startFight, step, yieldFight, type CombatEvent, type Fight,
} from '../core/combat';
import { SLOT_LABEL, item, type Slot } from '../core/items';
import { Fx } from '../scene/fx';
import { clear, el } from './dom';
import { dressed } from './look';

export interface Side {
  name: string;
  look: Appearance;
  gear: Partial<Record<Slot, number>>;
  record?: string;
}

interface Doll {
  side: Side;
  pose: Pose;
  frame: number;
  frameTime: number;
  swingFor: number;
  flinch: number;
}

export class Arena {
  readonly root: HTMLElement;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private fx = new Fx();
  private fight: Fight | null = null;
  private dolls: [Doll, Doll] | null = null;
  private procFlash = new Map<string, number>();
  private slotStrips: [HTMLElement, HTMLElement];
  private bars: [HTMLElement, HTMLElement];
  private yieldBtn = el('button', 'btn small', 'yield');
  private caption = el('div', 'notice');
  private onDone: ((winner: 0 | 1, yielded: boolean) => void) | null = null;
  private finished = false;

  constructor() {
    this.root = el('div');
    this.root.id = 'arena';
    this.root.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    const overlay = el('div', 'arena-ui');
    const left = el('div', 'arena-bar left');
    const right = el('div', 'arena-bar right');
    this.bars = [left, right];
    const stripL = el('div', 'arena-slots left');
    const stripR = el('div', 'arena-slots right');
    this.slotStrips = [stripL, stripR];
    const foot = el('div', 'arena-foot');
    foot.append(this.caption, this.yieldBtn);
    overlay.append(left, right, stripL, stripR, foot);
    this.root.append(overlay);
    document.getElementById('stage')!.append(this.root);

    this.yieldBtn.addEventListener('click', () => {
      if (!this.fight || !canYield(this.fight, 0)) return;
      const e = yieldFight(this.fight, 0);
      this.handle(e);
    });
  }

  open(a: Side, b: Side, seed: import('../core/rng').Rng) {
    this.finished = false;
    this.fight = startFight(seed, { name: a.name, gear: a.gear }, { name: b.name, gear: b.gear });
    this.dolls = [
      { side: a, pose: 'stand1', frame: 0, frameTime: 0, swingFor: 0, flinch: 0 },
      { side: b, pose: 'stand1', frame: 0, frameTime: 0, swingFor: 0, flinch: 0 },
    ];
    this.fx.clear();
    this.fx.scale = 2;
    this.procFlash.clear();
    this.caption.textContent = '';
    this.yieldBtn.style.visibility = 'hidden';
    this.renderStrips();
    this.root.classList.add('on');
    this.resize();
  }

  close() {
    this.root.classList.remove('on');
    this.fight = null;
  }

  get isOpen() { return this.root.classList.contains('on'); }

  onFinish(fn: (winner: 0 | 1, yielded: boolean) => void) { this.onDone = fn; }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.root.clientWidth * dpr);
    this.canvas.height = Math.floor(this.root.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private renderStrips() {
    if (!this.dolls) return;
    this.dolls.forEach((doll, i) => {
      const strip = this.slotStrips[i];
      clear(strip);
      for (const [slot, id] of Object.entries(doll.side.gear)) {
        if (typeof id !== 'number') continue;
        const cell = el('div', 'arena-slot');
        cell.dataset.key = `${i}:${slot}`;
        const img = el('img');
        img.src = getItemIcon(item(id).iconKey);
        cell.append(img);
        cell.title = `${SLOT_LABEL[slot as Slot]} — ${item(id).name}`;
        strip.append(cell);
      }
    });
  }

  step(dtSeconds: number) {
    if (!this.fight || !this.dolls) return;
    this.resize();

    for (const [k, v] of this.procFlash) this.procFlash.set(k, v - dtSeconds);

    if (this.fx.hitstop > 0) {
      this.fx.update(dtSeconds);
    } else if (!this.fight.over) {
      for (const e of step(this.fight, dtSeconds)) this.handle(e);
      this.fx.update(dtSeconds);
    } else {
      this.fx.update(dtSeconds);
    }

    const feet = this.floorY();
    const [ax, bx] = this.positions();
    if (this.fight.a.burn > 0) this.fx.flame(ax, feet - 12, this.fight.a.burn, dtSeconds);
    if (this.fight.b.burn > 0) this.fx.flame(bx, feet - 12, this.fight.b.burn, dtSeconds);

    for (const doll of this.dolls) {
      doll.swingFor = Math.max(0, doll.swingFor - dtSeconds);
      doll.flinch = Math.max(0, doll.flinch - dtSeconds);
      const want: Pose = doll.swingFor > 0 ? 'swingO1' : 'stand1';
      if (doll.pose !== want) { doll.pose = want; doll.frame = 0; doll.frameTime = 0; }
      doll.frameTime += dtSeconds * 1000;
      if (doll.frameTime > 90) {
        doll.frameTime = 0;
        doll.frame = doll.pose === 'swingO1' ? Math.min(2, doll.frame + 1) : (doll.frame + 1) % 3;
      }
    }

    if (this.fight && !this.finished) {
      this.yieldBtn.style.visibility = canYield(this.fight, 0) ? 'visible' : 'hidden';
    }

    this.draw();
    this.updateBars();
  }

  private handle(e: CombatEvent) {
    if (!this.fight || !this.dolls) return;
    const [ax, bx] = this.positions();
    const feet = this.floorY();
    const xOf = (side: 0 | 1) => (side === 0 ? ax : bx);

    switch (e.type) {
      case 'hit': {
        const attacker = e.side === 0 ? 1 : 0;
        this.dolls[attacker].swingFor = 0.34;
        this.dolls[attacker].frame = 0;
        this.dolls[e.side].flinch = 0.14;
        this.fx.popNumber(e.amount, e.crit ? 'crit' : 'hit', xOf(e.side), feet - 214);
        break;
      }
      case 'tick':
        this.fx.popNumber(e.amount, 'burn', xOf(e.side) + 40, feet - 52);
        break;
      case 'heal':
        this.fx.popNumber(e.amount, 'heal', xOf(e.side) - 46, feet - 246);
        break;
      case 'proc':
        // That slot lights up — how the player learns which item did the thing. §9.6
        this.procFlash.set(`${e.side}:${e.slot}`, 0.9);
        break;
      case 'end': {
        this.finished = true;
        this.yieldBtn.style.visibility = 'hidden';
        const yielded = e.reason === 'yield';
        this.caption.textContent = e.winner === 0 ? 'WIN' : 'LOSE';
        void yielded;
        setTimeout(() => this.onDone?.(e.winner, yielded), 1500);
        break;
      }
      case 'status':
        break;
    }
  }

  private floorY() { return this.root.clientHeight * 0.78; }
  private positions(): [number, number] {
    const w = this.root.clientWidth;
    return [w * 0.32, w * 0.68];
  }

  private draw() {
    if (!this.dolls || !this.fight) return;
    const ctx = this.ctx;
    const w = this.root.clientWidth, h = this.root.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const shakeX = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake : 0;
    const shakeY = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const feet = this.floorY();
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#20161c');
    bg.addColorStop(0.6, '#3a2a28');
    bg.addColorStop(1, '#1a1214');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const spot = ctx.createRadialGradient(w / 2, feet - 60, 20, w / 2, feet - 60, w * 0.5);
    spot.addColorStop(0, 'rgba(255, 190, 110, 0.17)');
    spot.addColorStop(1, 'rgba(255, 160, 70, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);

    // a wall of brick behind, boards underfoot, and a row of people watching
    ctx.fillStyle = 'rgba(255, 226, 180, 0.05)';
    for (let y = h * 0.1; y < feet - 40; y += 22) {
      for (let x = ((y / 22) % 2) * 34; x < w; x += 68) ctx.fillRect(x, y, 66, 20);
    }
    for (let i = 0; i < 26; i++) {
      const x = ((i * 97) % w) + ((i % 3) * 13);
      const bob = Math.sin(performance.now() / 620 + i) * 2;
      const size = 11 + (i % 4) * 2;
      ctx.fillStyle = `rgba(12, 9, 12, ${0.44 + (i % 3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, feet - 74 + bob, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - size * 0.8, feet - 72 + bob, size * 1.6, 74);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, feet - 8, w, 10);

    const boards = ctx.createLinearGradient(0, feet, 0, h);
    boards.addColorStop(0, '#8a5f34');
    boards.addColorStop(0.16, '#5d3f22');
    boards.addColorStop(1, '#24180f');
    ctx.fillStyle = boards;
    ctx.fillRect(0, feet, w, h - feet);
    ctx.strokeStyle = 'rgba(20, 12, 6, 0.55)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, feet);
      ctx.lineTo(x - 40, h);
      ctx.stroke();
    }

    const [ax, bx] = this.positions();
    for (const [i, x] of [[0, ax], [1, bx]] as [number, number][]) {
      const f = i === 0 ? this.fight.a : this.fight.b;
      this.fx.drawBurnGlow(ctx, x, feet + 2, f.burn);
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(x, feet + 2, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const scale = Math.max(2.4, Math.min(4, h / 215));
    this.dolls.forEach((doll, i) => {
      const x = i === 0 ? ax : bx;
      const dead = (i === 0 ? this.fight!.a : this.fight!.b).hp <= 0;
      const r = getCharacterSprite(
        dressed(doll.side.look, doll.side.gear),
        dead ? 'dead' : doll.pose,
        doll.frame,
        dead ? 'cry' : doll.flinch > 0 ? 'hit' : 'default',
      );
      ctx.save();
      ctx.translate(x, feet);
      ctx.scale(scale, scale);
      if (doll.flinch > 0) ctx.translate(-1.5, 0);
      ctx.drawImage(r.canvas, -r.anchor.x, -r.anchor.y);
      ctx.restore();

      const frozen = (i === 0 ? this.fight!.a : this.fight!.b).freeze > 0;
      if (frozen) {
        ctx.fillStyle = 'rgba(120, 200, 255, 0.26)';
        ctx.fillRect(x - 46, feet - 168, 92, 170);
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 46, feet - 168, 92, 170);
      }
    });

    this.fx.draw(ctx);
    ctx.restore();

    for (const [key, t] of this.procFlash) {
      if (t <= 0) continue;
      const node = this.root.querySelector(`[data-key="${CSS.escape(key)}"]`) as HTMLElement | null;
      if (node) node.style.setProperty('--flash', String(Math.min(1, t)));
    }
    for (const strip of this.slotStrips) {
      for (const child of Array.from(strip.children) as HTMLElement[]) {
        const t = this.procFlash.get(child.dataset.key ?? '') ?? 0;
        child.style.setProperty('--flash', String(Math.max(0, Math.min(1, t))));
      }
    }
  }

  private updateBars() {
    if (!this.fight || !this.dolls) return;
    this.dolls.forEach((doll, i) => {
      const f = i === 0 ? this.fight!.a : this.fight!.b;
      const pct = Math.max(0, (f.hp / f.maxHp) * 100);
      const bar = this.bars[i];
      if (!bar.firstChild) {
        bar.append(el('div', 'arena-name'), el('div', 'arena-track'), el('div', 'arena-status'));
        (bar.children[1] as HTMLElement).append(el('div', 'arena-fill'));
      }
      (bar.children[0] as HTMLElement).textContent =
        `${doll.side.name}${doll.side.record ? '  ' + doll.side.record : ''}`;
      const fill = bar.querySelector('.arena-fill') as HTMLElement;
      fill.style.width = pct + '%';
      fill.style.background = i === 0 ? 'linear-gradient(180deg,#6fd47a,#2f7a3c)' : 'linear-gradient(180deg,#e06a6a,#8f2020)';
      const tags: string[] = [];
      if (f.burn) tags.push(`burn ×${f.burn}`);
      if (f.poison) tags.push(`poison ×${f.poison}`);
      if (f.freeze > 0) tags.push('frozen');
      else if (f.slow > 0) tags.push('slowed');
      if (f.weaken > 0) tags.push('weakened');
      (bar.children[2] as HTMLElement).textContent = tags.join(' · ');
    });
  }
}
