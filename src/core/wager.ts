/**
 * Combat has no intrinsic score. It has stakes, agreed beforehand, in a window
 * that works like the trade window. §10
 *
 * One rule does most of the work: items you stake are visible, mesos are not.
 * Scouting therefore costs something, bluffing has teeth, and a pure-mesos
 * wager is a blind fight.
 */
import { Rng, clamp } from './rng';
import { item, type Slot } from './items';
import { rollUp } from './combat';
import type { Appearance } from './appearance';

export interface Stake {
  /** Visible to the other side. */
  items: number[];
  /** Never visible. */
  mesos: number;
}

export interface Opponent {
  name: string;
  look: Appearance;
  gear: Partial<Record<Slot, number>>;
  wins: number;
  losses: number;
  /** Greedy ones take bad odds; cautious ones demand too much and you walk. §10.6 */
  greed: number;
  savvy: number;
  purse: number;
}

/** A single number for how dangerous a loadout looks. Used for odds, never shown. */
export function power(gear: Partial<Record<Slot, number>>): number {
  const s = rollUp(gear);
  const dps = ((s.min + s.max) / 2) * s.speed * (1 + (s.crit / 100) * (0.75 + s.critDmg / 100));
  const bulk = 1 + s.armour / 26;
  const tricks = Object.values(gear)
    .filter((id): id is number => typeof id === 'number')
    .reduce((n, id) => n + item(id).text.length * 2, 0);
  return dps * bulk + tricks + s.str;
}

const ARCHETYPES: Partial<Record<Slot, number>>[][] = [
  // cheap
  [{ weapon: 1, body: 13, boots: 17 }, { weapon: 2, helm: 8, body: 13 }, { weapon: 3, shield: 11, legs: 16 }],
  // middling
  [{ weapon: 4, gloves: 21, helm: 8, body: 13, shield: 11 },
   { weapon: 5, helm: 9, earring: 25, body: 13 },
   { weapon: 3, body: 14, shield: 11, gloves: 20, cape: 22 }],
  // dear
  [{ weapon: 7, cape: 24, ring: 27, helm: 10, body: 13, gloves: 20 },
   { weapon: 6, shield: 12, boots: 18, gloves: 20, helm: 9, body: 14 },
   { weapon: 5, helm: 9, pendant: 26, boots: 19, cape: 23, earring: 25, gloves: 21 }],
  // the top of the market
  [{ weapon: 30, body: 15, boots: 19, helm: 9, pendant: 26 },
   { weapon: 29, cape: 24, ring: 28, helm: 10, body: 15, boots: 19 }],
];

export function makeOpponent(rng: Rng, name: string, look: Appearance, wealth: number): Opponent {
  const tier = wealth >= 1_500_000 ? 3 : wealth >= 400_000 ? 2 : wealth >= 80_000 ? 1 : 0;
  const gear = rng.pick(ARCHETYPES[tier]);
  const fights = rng.int(0, 11);
  return {
    name, look, gear,
    wins: rng.int(0, fights),
    losses: fights - rng.int(0, fights),
    greed: rng.float(0, 1),
    savvy: clamp(0.25 + tier * 0.2 + rng.float(-0.1, 0.15), 0.2, 0.95),
    purse: Math.round(wealth * rng.float(0.4, 1.4)),
  };
}

export interface Odds {
  you: number;
  them: number;
}

export interface Proposal {
  kind: 'offer' | 'refuse';
  odds?: Odds;
  line: string;
}

function mesoWord(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return (Number.isInteger(m) ? m : Number(m.toFixed(1))) + 'm';
  }
  if (v >= 1000) return Math.round(v / 1000) + 'k';
  return String(v);
}

/** Stakes cap at 25% of liquid mesos, enforced in fiction, never by a UI limit. §10.2 */
export function capFor(liquid: number): number {
  return Math.max(1000, Math.floor(liquid * 0.25));
}

function roundStake(v: number): number {
  const mag = v >= 1_000_000 ? 50_000 : v >= 100_000 ? 5000 : v >= 10_000 ? 1000 : 500;
  return Math.max(mag, Math.round(v / mag) * mag);
}

/**
 * They look at what you have shown and at your public record, then name the
 * odds. A well-geared player has to buy the fight with bad odds — which is the
 * difficulty curve, with no knob to mis-tune. §10.2
 */
export function proposeOdds(
  rng: Rng,
  opp: Opponent,
  shown: number[],
  record: { wins: number; losses: number },
  liquid: number,
): Proposal {
  const theirs = power(opp.gear);
  // A discounted read: they do not assume you will actually wear what you showed.
  const shownGear: Partial<Record<Slot, number>> = {};
  for (const id of shown) shownGear[item(id).slot] = id;
  const seen = shown.length ? power(shownGear) * (0.55 + opp.savvy * 0.35) : theirs * 0.55;

  const fights = record.wins + record.losses;
  // Win/loss is the one thing they know rather than are shown. §10.3
  const form = fights ? (record.wins / fights - 0.5) * 2 : 0;
  const yourEstimate = seen * (1 + form * 0.35);

  const pThem = clamp(theirs / (theirs + yourEstimate), 0.05, 0.95);
  const pYou = 1 - pThem;

  if (pYou > 0.78 - opp.greed * 0.2) {
    return { kind: 'refuse', line: rng.pick(['nah ur too geared', 'not against that', 'find someone else lol', 'no chance, look at u']) };
  }

  const cap = capFor(liquid);
  const yourStake = roundStake(cap * rng.float(0.45, 1));
  const edge = 1 - (0.06 + opp.greed * -0.04 + rng.float(0, 0.1));
  let theirStake = roundStake(yourStake * (pThem / pYou) * edge);
  theirStake = Math.min(theirStake, opp.purse);
  if (theirStake < 500) return { kind: 'refuse', line: 'thats too rich for me' };

  return {
    kind: 'offer',
    odds: { you: yourStake, them: theirStake },
    line: `u put up ${mesoWord(yourStake)} i put up ${mesoWord(theirStake)}`,
  };
}

/** Their answer to the player's counter-offer. Greedy ones take bad odds. §10.6 */
export function judgeCounter(rng: Rng, opp: Opponent, proposed: Odds, fair: Odds): { ok: boolean; line: string } {
  const asked = proposed.them / Math.max(1, proposed.you);
  const want = fair.them / Math.max(1, fair.you);
  const slack = 0.12 + opp.greed * 0.4;
  if (asked <= want * (1 + slack)) {
    return { ok: true, line: rng.pick(['fine', 'ok deal', 'ya alright', 'done']) };
  }
  return { ok: false, line: rng.pick(['no', 'thats robbery', 'not for that', 'try again']) };
}

/** Their read on what you are bringing, once the re-gear window closes. §10.4 */
export function crossReference(rng: Rng, opp: Opponent, shown: number[], worn: Partial<Record<Slot, number>>): string | null {
  if (!shown.length) return null;
  const wearing = new Set(Object.values(worn));
  const bluffed = shown.filter((id) => !wearing.has(id));
  if (!bluffed.length) return null;
  if (!rng.chance(opp.savvy)) return null;
  const name = item(bluffed[0]).name.toLowerCase();
  return rng.pick([`u never run a ${name}`, `thats not what ur wearing`, `i dont believe the ${name}`]);
}

export interface Settlement {
  mesos: number;
  itemsWon: number[];
  itemsLost: number[];
}

/**
 * You lose exactly what you staked. Yielding costs half the pot, or one item
 * where items are up. §10.5
 */
export function settle(
  won: boolean,
  yielded: boolean,
  mine: Stake,
  theirs: Stake,
  rng: Rng,
): Settlement {
  if (won) {
    return { mesos: theirs.mesos, itemsWon: [...theirs.items], itemsLost: [] };
  }
  if (yielded) {
    const lostItem = mine.items.length ? [rng.pick(mine.items)] : [];
    return { mesos: -Math.round(mine.mesos / 2), itemsWon: [], itemsLost: lostItem };
  }
  return { mesos: -mine.mesos, itemsWon: [], itemsLost: [...mine.items] };
}

export { mesoWord as stakeWord };
