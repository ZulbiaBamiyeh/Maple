/**
 * Damage numbers the Maple way: each digit is its own glyph with a black
 * outline and a vertical gradient, and the digits bounce in sequence 45ms
 * apart — which is why a three-digit hit feels bigger than a two-digit one for
 * free. Plus flame, sparks, and hitstop. §9.6
 */

export type NumberKind = 'hit' | 'crit' | 'burn' | 'heal';

interface Glyph {
  ch: string;
  delay: number;
}

interface FloatingNumber {
  glyphs: Glyph[];
  kind: NumberKind;
  x: number;
  y: number;
  t: number;
  life: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; kind: 'flame' | 'spark'; colour: string; size: number;
}

const PALETTE: Record<NumberKind, { top: string; bottom: string; outline: string; size: number }> = {
  hit: { top: '#fff4d0', bottom: '#f2b03a', outline: '#59300e', size: 23 },
  crit: { top: '#fff0d8', bottom: '#d61f2a', outline: '#4a0810', size: 32 },
  burn: { top: '#ffc46b', bottom: '#e03a1c', outline: '#4a1206', size: 20 },
  heal: { top: '#d8ffcf', bottom: '#3fa845', outline: '#11400f', size: 18 },
};

export class Fx {
  private numbers: FloatingNumber[] = [];
  private particles: Particle[] = [];
  /** Frozen frames on impact — the cheapest impact trick there is. */
  hitstop = 0;
  shake = 0;

  popNumber(value: number, kind: NumberKind, x: number, y: number) {
    const text = (kind === 'heal' ? '+' : '') + Math.max(0, Math.round(value));
    this.numbers.push({
      glyphs: [...text].map((ch, i) => ({ ch, delay: i * 0.045 })),
      kind, x, y, t: 0, life: 1.15,
    });
    if (kind === 'crit') {
      this.hitstop = Math.max(this.hitstop, 0.085);
      this.shake = Math.max(this.shake, 7);
      this.spark(x, y, 14, '#ffd27a');
    } else if (kind === 'hit') {
      this.hitstop = Math.max(this.hitstop, 0.04);
    }
  }

  spark(x: number, y: number, n: number, colour: string) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0, max: 0.28 + Math.random() * 0.3, kind: 'spark', colour, size: 2 + Math.random() * 2,
      });
    }
  }

  /** Spawn rate scales with stack count: 2 stacks is a lick, 15 is a column. */
  flame(x: number, y: number, stacks: number, dt: number) {
    const rate = Math.min(90, stacks * 7) * dt;
    let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
    while (n-- > 0) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * (10 + stacks),
        y: y - Math.random() * 6,
        vx: (Math.random() - 0.5) * 22,
        vy: -46 - Math.random() * 60 - stacks * 1.4,
        life: 0, max: 0.38 + Math.random() * 0.4,
        kind: 'flame', colour: '', size: 2 + Math.random() * 2.6,
      });
    }
  }

  update(dt: number) {
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.shake *= 0.86;
    for (const n of this.numbers) n.t += dt;
    this.numbers = this.numbers.filter((n) => n.t < n.life);
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 520 * dt;
      else p.vy += 34 * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  /** A warm glow pooling on the ground under whatever is burning. */
  drawBurnGlow(ctx: CanvasRenderingContext2D, x: number, y: number, stacks: number) {
    if (stacks <= 0) return;
    const r = 26 + stacks * 2.4;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    const a = Math.min(0.5, 0.12 + stacks * 0.03);
    g.addColorStop(0, `rgba(255, 150, 50, ${a})`);
    g.addColorStop(1, 'rgba(255, 110, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      if (p.kind === 'flame') {
        // white -> orange -> dark red as it rises
        const colour = k < 0.22 ? '#fff3c8' : k < 0.5 ? '#ffb037' : k < 0.78 ? '#f1601f' : '#8c1a10';
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = colour;
        const s = p.size * (1 - k * 0.5);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.colour;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const n of this.numbers) {
      const pal = PALETTE[n.kind];
      const width = pal.size * 0.62;
      const total = n.glyphs.length * width;
      n.glyphs.forEach((g, i) => {
        const t = Math.max(0, n.t - g.delay);
        if (t <= 0) return;
        const k = Math.min(1, t / n.life);
        // up on an ease-out, hang, drift down, fade
        const rise = k < 0.36 ? 34 * (1 - (1 - k / 0.36) ** 3) : 34 - (k - 0.36) * 16;
        const alpha = k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
        const gx = n.x - total / 2 + i * width + width / 2;
        const gy = n.y - rise;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `${pal.size}px Silkscreen, monospace`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = pal.outline;
        ctx.strokeText(g.ch, gx, gy);
        const grad = ctx.createLinearGradient(0, gy - pal.size, 0, gy + 2);
        grad.addColorStop(0, pal.top);
        grad.addColorStop(1, pal.bottom);
        ctx.fillStyle = grad;
        ctx.fillText(g.ch, gx, gy);
      });
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.numbers.length = 0;
    this.particles.length = 0;
    this.hitstop = 0;
    this.shake = 0;
  }
}
