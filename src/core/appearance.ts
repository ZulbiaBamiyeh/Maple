import { Rng } from './rng';

/** The wardrobe, handed in by the asset layer so this module stays renderer-free. §4.4 */
export interface Wardrobe {
  hair: number[];
  face: number[];
  cap: number[];
  coat: number[];
  pants: number[];
  shoes: number[];
  glove: number[];
  cape: number[];
  weapon: number[];
}

export interface Appearance {
  skin: string;
  face: number;
  hair: number;
  cap?: number;
  coat?: number;
  pants?: number;
  shoes?: number;
  glove?: number;
  cape?: number;
  weapon?: number;
  /** The classic AFK-in-FM look. Cosmetic, and entirely necessary. */
  sitting: boolean;
}

export type WealthTier = 0 | 1 | 2 | 3;

/**
 * Picks from the cheap end of a pool for poor traders and the dear end for rich
 * ones — but lies about it roughly one time in five, because the read-the-person
 * problem is the whole game.
 */
function tierPick(rng: Rng, pool: number[], tier: WealthTier): number {
  if (!pool.length) return 0;
  const honest = !rng.chance(0.2);
  const t = honest ? tier : (rng.int(0, 3) as WealthTier);
  const band = pool.length / 4;
  const lo = Math.floor(t * band);
  const hi = Math.min(pool.length - 1, Math.ceil((t + 1) * band));
  return pool[rng.int(lo, hi)];
}

const SKINS = ['0', '1', '2', '3', '4'];

/**
 * A whole person. Roughly 70% of the market reads as poor, so a well-dressed
 * trader is worth noticing — and a scruffy one occasionally has a million mesos.
 */
export function makeAppearance(rng: Rng, w: Wardrobe, tier?: WealthTier): Appearance {
  const t: WealthTier = tier ?? (rng.chance(0.7) ? (rng.chance(0.6) ? 0 : 1) : (rng.chance(0.6) ? 2 : 3));
  const look: Appearance = {
    skin: rng.pick(SKINS),
    face: rng.pick(w.face),
    hair: rng.pick(w.hair),
    coat: tierPick(rng, w.coat, t),
    pants: tierPick(rng, w.pants, t),
    shoes: tierPick(rng, w.shoes, t),
    sitting: rng.chance(0.3),
  };
  if (rng.chance(0.55)) look.cap = tierPick(rng, w.cap, t);
  if (rng.chance(0.45)) look.glove = tierPick(rng, w.glove, t);
  // A cape reads as wealth, so it stays rare and skews rich.
  if (rng.chance(t >= 2 ? 0.35 : 0.08)) look.cape = tierPick(rng, w.cape, t);
  // A weapon in hand is a tell. Let the player learn it.
  if (rng.chance(0.5)) look.weapon = tierPick(rng, w.weapon, t);
  return look;
}

export function lookSignature(a: Appearance): string {
  return [a.skin, a.face, a.hair, a.cap, a.coat, a.pants, a.shoes, a.glove, a.cape, a.weapon].join('.');
}

/** No two people on screen may share a full look. §4.4 */
export function makeDistinctAppearances(
  rng: Rng, w: Wardrobe, count: number, tiers?: WealthTier[],
): Appearance[] {
  const seen = new Set<string>();
  const out: Appearance[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const a = makeAppearance(rng, w, tiers?.[out.length]);
    const sig = lookSignature(a);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(a);
  }
  return out;
}
