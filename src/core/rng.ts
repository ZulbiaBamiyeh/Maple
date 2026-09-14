/**
 * Seeded RNG. One seed per run, a derived sub-seed per day, so any run can be
 * replayed exactly from its seed. §3
 */
export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  /** mulberry32 — small, fast, good enough, and trivially portable to Lua. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Picks n distinct entries, or as many as exist. */
  sample<T>(list: readonly T[], n: number): T[] {
    const pool = [...list];
    const out: T[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0]);
    return out;
  }

  shuffle<T>(list: T[]): T[] {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /** A sub-seed that is stable for a given run and day. */
  derive(label: string): Rng {
    return new Rng(hashString(label + ':' + this.s));
  }
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
