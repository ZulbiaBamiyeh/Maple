/**
 * The walking-around layer: camera, actors, click-to-walk with cross-floor
 * routing, and the chat bubbles overhead. §5
 */
import { getCharacterSprite, frameCount, frameDelay, type Pose } from '../assets/index';
import type { Appearance } from '../core/appearance';
import type { Slot } from '../core/items';
import { dressed } from '../ui/look';
import { paintBackdrop } from './backdrop';
import { WORLD, floorY, nearest, type Floor, type Target } from './world';
import { Fx } from './fx';

const WALK_SPEED = 148;
const CLIMB_SPEED = 116;

export interface Actor {
  look: Appearance;
  /** What they are wearing — the character on screen is the character's gear. */
  gear: Partial<Record<Slot, number>>;
  x: number;
  floor: Floor;
  facing: 1 | -1;
  pose: Pose;
  frame: number;
  frameTime: number;
  /** Shop chat, the way the floor wrote it: the message, then rows of @ to shove it up. */
  bubble?: string[];
  name?: string;
}

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backdrop: HTMLCanvasElement;
  readonly fx = new Fx();

  player: Actor;
  npcs: Actor[] = [];
  stallKeepers: Actor[] = [];
  targets: Target[] = [];

  camera = 0;
  /** Set while a window is open — the player stops taking input. */
  frozen = false;
  private keys = new Set<string>();
  private walkTo: { x: number; floor: Floor; then?: Target } | null = null;
  private climbing = false;
  private climbY = 0;

  onInteract?: (t: Target) => void;
  onPrompt?: (t: Target | null) => void;

  constructor(canvas: HTMLCanvasElement, playerLook: Appearance, playerGear: Partial<Record<Slot, number>>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.backdrop = paintBackdrop();
    this.player = {
      look: playerLook, gear: playerGear, x: 300, floor: 'lower', facing: 1,
      pose: 'stand1', frame: 0, frameTime: 0,
    };
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private get viewW() { return this.canvas.clientWidth; }
  private get viewH() { return this.canvas.clientHeight; }
  /** The whole hall, floor to bunting, always fits the viewport. */
  private get scale() { return Math.max(0.75, Math.min(2.4, this.viewH / (WORLD.height + 8))); }

  private bindInput() {
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.key);
      if (e.key.startsWith('Arrow')) this.walkTo = null;
      if (e.key === 'ArrowUp' && !this.frozen) this.tryInteract();
      if (e.key === 'ArrowDown' && !this.frozen) this.tryDescend();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    this.canvas.addEventListener('click', (e) => {
      if (this.frozen) return;
      const rect = this.canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / this.scale + this.camera;
      const worldY = (e.clientY - rect.top) / this.scale;
      const floor: Floor = worldY < (WORLD.upperFloor + WORLD.lowerFloor) / 2 ? 'upper' : 'lower';
      const t = nearest(this.targets, worldX, floor, 74);
      this.walkTo = t ? { x: t.x, floor: t.floor, then: t } : { x: worldX, floor };
    });
  }

  private tryInteract() {
    const t = nearest(this.targets, this.player.x, this.player.floor);
    if (t) this.onInteract?.(t);
  }

  private tryDescend() {
    if (Math.abs(this.player.x - WORLD.ladderX) > 34) return;
    this.startClimb(this.player.floor === 'upper' ? 'lower' : 'upper');
  }

  private startClimb(to: Floor) {
    this.climbing = true;
    this.climbY = floorY(this.player.floor);
    this.player.pose = 'ladder';
    this.player.x = WORLD.ladderX;
    this.pendingFloor = to;
  }

  private pendingFloor: Floor = 'lower';

  /** A route across floors always goes via the ladder. §5 */
  private stepAuto(dt: number) {
    const goal = this.walkTo;
    if (!goal) return;
    if (goal.floor !== this.player.floor && !this.climbing) {
      if (Math.abs(this.player.x - WORLD.ladderX) > 4) {
        this.moveToward(WORLD.ladderX, dt);
        return;
      }
      this.startClimb(goal.floor);
      return;
    }
    if (this.climbing) return;
    if (Math.abs(this.player.x - goal.x) > 5) {
      this.moveToward(goal.x, dt);
      return;
    }
    this.walkTo = null;
    this.player.pose = 'stand1';
    if (goal.then) this.onInteract?.(goal.then);
  }

  private moveToward(x: number, dt: number) {
    const dir = Math.sign(x - this.player.x) as 1 | -1;
    this.player.x += dir * WALK_SPEED * dt;
    this.player.facing = dir;
    this.player.pose = 'walk1';
  }

  private stepClimb(dt: number) {
    const targetY = floorY(this.pendingFloor);
    const dir = Math.sign(targetY - this.climbY);
    this.climbY += dir * CLIMB_SPEED * dt;
    if ((dir > 0 && this.climbY >= targetY) || (dir < 0 && this.climbY <= targetY)) {
      this.climbY = targetY;
      this.climbing = false;
      this.player.floor = this.pendingFloor;
      this.player.pose = 'stand1';
    }
  }

  update(dt: number) {
    const p = this.player;
    if (!this.frozen) {
      if (this.climbing) {
        this.stepClimb(dt);
      } else if (this.keys.has('ArrowLeft') || this.keys.has('ArrowRight')) {
        const dir = this.keys.has('ArrowLeft') ? -1 : 1;
        p.x += dir * WALK_SPEED * dt;
        p.facing = dir as 1 | -1;
        p.pose = 'walk1';
      } else if (this.walkTo) {
        this.stepAuto(dt);
      } else {
        p.pose = 'stand1';
      }
    } else {
      p.pose = 'stand1';
    }
    p.x = Math.max(WORLD.leftWall, Math.min(WORLD.rightWall, p.x));

    const frames = frameCount(p.pose);
    p.frameTime += dt * 1000;
    while (p.frameTime > frameDelay(p.pose, p.frame)) {
      p.frameTime -= frameDelay(p.pose, p.frame);
      p.frame = (p.frame + 1) % frames;
    }
    for (const npc of [...this.npcs, ...this.stallKeepers]) {
      npc.frameTime += dt * 1000;
      const n = frameCount(npc.pose);
      while (npc.frameTime > frameDelay(npc.pose, npc.frame)) {
        npc.frameTime -= frameDelay(npc.pose, npc.frame);
        npc.frame = (npc.frame + 1) % n;
      }
    }

    const want = p.x - this.viewW / this.scale / 2;
    this.camera += (want - this.camera) * Math.min(1, dt * 6);
    this.camera = Math.max(0, Math.min(WORLD.width - this.viewW / this.scale, this.camera));

    this.fx.update(dt);
    this.onPrompt?.(this.frozen ? null : nearest(this.targets, p.x, p.floor));
  }

  private drawActor(ctx: CanvasRenderingContext2D, a: Actor, y: number) {
    const pose: Pose = a.look.sitting && a.pose === 'stand1' ? 'sit' : a.pose;
    const r = getCharacterSprite(dressed(a.look, a.gear), pose, a.frame);
    ctx.save();
    ctx.translate(a.x, y);
    if (a.facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(r.canvas, -r.anchor.x, -r.anchor.y);
    ctx.restore();
  }

  /**
   * The shop balloon, as the Free Market actually looked: the pitch on top and
   * rows of @ underneath, because that is how everyone shoved their text up
   * where it could be read over the crowd. §5
   */
  private drawBubble(ctx: CanvasRenderingContext2D, a: Actor, y: number) {
    if (!a.bubble || !a.bubble.length) return;
    ctx.font = '11px Silkscreen, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = 13;
    const w = Math.max(...a.bubble.map((t) => ctx.measureText(t).width)) + 18;
    const h = a.bubble.length * lineH + 8;
    const bottom = y - 78;
    const top = bottom - h;

    ctx.fillStyle = 'rgba(253, 252, 248, 0.97)';
    ctx.strokeStyle = '#14130f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(a.x - w / 2, top, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x - 6, bottom - 1);
    ctx.lineTo(a.x + 6, bottom - 1);
    ctx.lineTo(a.x, bottom + 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(253, 252, 248, 0.97)';
    ctx.fill();
    ctx.stroke();

    a.bubble.forEach((line, i) => {
      // The padding is written in the market's own colour: nobody reads it.
      ctx.fillStyle = /^@+$/.test(line) ? '#b8b3a2' : '#14130f';
      ctx.fillText(line, a.x, top + 4 + lineH * i + lineH / 2);
    });
  }

  private drawName(ctx: CanvasRenderingContext2D, a: Actor, y: number) {
    if (!a.name) return;
    ctx.font = '10px Silkscreen, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(a.name).width + 8;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
    ctx.fillRect(a.x - w / 2, y + 3, w, 13);
    ctx.fillStyle = '#e8eef8';
    ctx.fillText(a.name, a.x, y + 10);
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    const shakeX = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake : 0;
    const shakeY = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake : 0;
    ctx.scale(this.scale, this.scale);
    ctx.translate(-Math.round(this.camera) + shakeX, shakeY);

    ctx.drawImage(this.backdrop, 0, 0);

    for (const keeper of this.stallKeepers) this.drawActor(ctx, keeper, floorY(keeper.floor));
    for (const npc of this.npcs) {
      const y = floorY(npc.floor);
      this.drawActor(ctx, npc, y);
      this.drawName(ctx, npc, y);
      this.drawBubble(ctx, npc, y);
    }

    const py = this.climbing ? this.climbY : floorY(this.player.floor);
    this.drawActor(ctx, this.player, py);
    this.drawName(ctx, this.player, py);

    this.fx.draw(ctx);
    ctx.restore();
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.camera) * this.scale, y: y * this.scale };
  }
}
