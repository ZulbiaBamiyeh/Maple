import { Rng } from './rng';
import { ITEMS, type Item, type Slot } from './items';

/** Only the parts of a person that aren't equipment. §4.4 */
export interface Wardrobe {
  hair: number[];
  face: number[];
}

export interface Appearance {
  skin: string;
  face: number;
  hair: number;
  /** The classic AFK-in-FM look. */
  sitting: boolean;
}

export type WealthTier = 0 | 1 | 2 | 3;

const SKINS = ['0', '1', '2', '3', '4'];

export function makeAppearance(rng: Rng, w: Wardrobe): Appearance {
  return {
    skin: rng.pick(SKINS),
    face: rng.pick(w.face),
    hair: rng.pick(w.hair),
    sitting: rng.chance(0.3),
  };
}

export function lookSignature(a: Appearance): string {
  return [a.skin, a.face, a.hair].join('.');
}

/** No two people on screen may share a face. §4.4 */
export function makeDistinctAppearances(rng: Rng, w: Wardrobe, count: number): Appearance[] {
  const seen = new Set<string>();
  const out: Appearance[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const a = makeAppearance(rng, w);
    const sig = lookSignature(a);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(a);
  }
  return out;
}

/** Slots worth dressing someone in — the rest never showed on a character anyway. */
const VISIBLE: Slot[] = ['weapon', 'helm', 'body', 'legs', 'boots', 'gloves', 'cape'];

const CHEAP = 20_000;

/**
 * What somebody is wearing, drawn from the same table the player buys from —
 * so a trader in a Sauna Robe really is carrying a Sauna Robe, and the crowd is
 * dressed in things that exist. Most of the floor is poor, and a well-dressed
 * trader is worth noticing; appearance still lies about a fifth of the time.
 */
export function makeLoadout(rng: Rng, tier: WealthTier): Partial<Record<Slot, number>> {
  const gear: Partial<Record<Slot, number>> = {};
  const honest = !rng.chance(0.2);
  const t = honest ? tier : (rng.int(0, 3) as WealthTier);
  const ceiling = [CHEAP, 90_000, 400_000, 2_000_000][t];
  const floorPrice = [0, 3000, 40_000, 200_000][t];

  for (const slot of VISIBLE) {
    // Nobody has everything. The poor have very little.
    const odds = slot === 'weapon' ? 0.72 : slot === 'body' ? 0.9 : slot === 'cape' ? 0.18 + t * 0.12 : 0.52;
    if (!rng.chance(odds)) continue;
    const pool = ITEMS.filter(
      (i: Item) => i.slot === slot && i.price <= ceiling && i.price >= floorPrice,
    );
    const fallback = ITEMS.filter((i: Item) => i.slot === slot && i.price <= ceiling);
    const choices = pool.length ? pool : fallback;
    if (choices.length) gear[slot] = rng.pick(choices).id;
  }
  return gear;
}
