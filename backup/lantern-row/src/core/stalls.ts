import { Rng, clamp } from './rng';
import { ITEMS, type Item, type Slot } from './items';
import { type BoardMessage, type BoardContext, seedBoard, addMessages } from './board';
import type { Appearance, Wardrobe } from './appearance';
import { makeAppearance, makeLoadout } from './appearance';

export interface StallStock {
  itemId: number;
  /** round(trueValue × uniform(0.78, 1.50)) — the markup decides how long it lasts. §7.2 */
  ask: number;
  sold: boolean;
}

export interface Stall {
  pitch: number;
  name: string;
  owner: string;
  look: Appearance;
  gear: Partial<Record<Slot, number>>;
  hue: number;
  daysLeft: number;
  stock: StallStock[];
  board: BoardMessage[];
}

const OWNERS = [
  'Odd Vell', 'Marla', 'Bones', 'Tinny', 'Old Gus', 'Pim', 'Hessa', 'Crooked Pete',
  'Mistress Yun', 'Fat Tam', 'Silver Ju', 'Narrow Dan', 'The Widow', 'Bright Eyes',
];

const SHOP_NAMES = [
  "%s's Curios", "%s & Daughter", 'The %s Pitch', "%s's Odds", '%s Supply',
  "%s's Leftovers", 'Honest %s', "%s's Second Hand", '%s Trading Co.',
];

function roundish(v: number): number {
  const mag = v >= 1_000_000 ? 25_000 : v >= 100_000 ? 5000 : v >= 10_000 ? 500 : 100;
  return Math.max(mag, Math.round(v / mag) * mag);
}

export function stockPrice(rng: Rng, it: Item): number {
  return roundish(it.price * rng.float(0.78, 1.5));
}

/**
 * A markup's chance of selling to somebody else overnight. Bargains evaporate;
 * overpriced stock sits until the stall leaves with it, which is why the shelves
 * fill up with junk after a few days. §7.2
 */
export function sellChance(ask: number, trueValue: number): number {
  const ratio = ask / trueValue;
  return clamp(0.62 - (ratio - 0.8) * 0.78, 0.03, 0.62);
}

function makeStock(rng: Rng, bankroll: number): StallStock[] {
  const n = rng.int(4, 8);
  const ceiling = Math.max(60_000, bankroll * 6);
  const affordable = ITEMS.filter((i) => i.price <= ceiling);
  // Always leave something unreachable on the shelf — the greyed-out card is the
  // progression system. §6.4
  const dream = ITEMS.filter((i) => i.price > ceiling);
  const picks = rng.sample(affordable.length >= n ? affordable : ITEMS, n);
  if (dream.length && rng.chance(0.7)) picks[picks.length - 1] = rng.pick(dream);
  return picks.map((it) => ({ itemId: it.id, ask: stockPrice(rng, it), sold: false }));
}

export function makeStall(rng: Rng, w: Wardrobe, pitch: number, day: number, bankroll: number, ctx: Omit<BoardContext, 'shopkeeper'>): Stall {
  const owner = rng.pick(OWNERS);
  const short = owner.split(' ').pop()!;
  const stall: Stall = {
    pitch,
    owner,
    name: rng.pick(SHOP_NAMES).replace('%s', rng.chance(0.5) ? owner : short),
    look: makeAppearance(rng, w),
    gear: makeLoadout(rng, 2),
    hue: rng.int(0, 359),
    daysLeft: rng.int(1, 3),
    stock: makeStock(rng, bankroll),
    board: [],
  };
  stall.board = seedBoard(rng, { ...ctx, day, shopkeeper: stall.owner });
  return stall;
}

/** Overnight: roll sell-through per item, then add a few lines to the board. §11.1 */
export function overnight(rng: Rng, stall: Stall, itemOf: (id: number) => Item, ctx: Omit<BoardContext, 'shopkeeper'>, day: number) {
  for (const entry of stall.stock) {
    if (entry.sold) continue;
    if (rng.chance(sellChance(entry.ask, itemOf(entry.itemId).price))) entry.sold = true;
  }
  addMessages(rng, stall.board, { ...ctx, day, shopkeeper: stall.owner }, rng.int(1, 3));
  stall.daysLeft--;
}

/** Dumping to a shop is always the bad exit. §8.10 */
export const BUYBACK_RATE = 0.5;
