/** Run state: days, the bag, reputation, the ledger. §6.3, §11 */
import { Rng, clamp } from './rng';
import { ITEMS, item, type Item, type Slot } from './items';
import type { Appearance, Wardrobe } from './appearance';
import { makeDistinctAppearances } from './appearance';
import { makeHawker, type Hawker } from './negotiate';
import { makeStall, overnight, type Stall, BUYBACK_RATE } from './stalls';
import { nameFor } from './names';

export const START_MESOS = 50_000;
export const DAYS = 12;
export const TARGET = 10_000_000;

export interface LedgerEntry {
  kind: 'bought' | 'sold' | 'wagered';
  what: string;
  who: string;
  amount: number;
  trueValue: number;
  /** Set on the day's standout deals. */
  mark?: 'best' | 'worst';
}

export interface Run {
  seed: string;
  rng: Rng;
  day: number;
  mesos: number;
  /** Item ids in the bag, equipped or not. */
  bag: number[];
  gear: Partial<Record<Slot, number>>;
  /** Hidden. No number on screen. §11.3 */
  reputation: number;
  wins: number;
  losses: number;
  stalls: Stall[];
  hawkers: Hawker[];
  ledger: LedgerEntry[];
  history: LedgerEntry[][];
  peak: number;
  foughtToday: boolean;
  over: null | 'won' | 'busted' | 'closed' | 'out-of-days';
  dayStarted: number;
  wardrobe: Wardrobe;
  looks: Appearance[];
}

export function liquid(run: Run): number {
  return run.mesos;
}

export function netWorth(run: Run): number {
  return run.mesos + run.bag.reduce((n, id) => n + item(id).price, 0);
}

/** §11.3 — the player feels reputation as doors opening or closing. */
export function askMultiplier(run: Run): number {
  return 1.35 - run.reputation / 500;
}

export function patienceBonus(run: Run): number {
  return Math.floor(run.reputation / 30);
}

export function marketClosed(run: Run): boolean {
  return run.reputation <= -45;
}

function tierValueFor(run: Run, rng: Rng): number {
  const reach = Math.max(20_000, run.mesos * rng.float(0.8, 2.6));
  const affordable = ITEMS.filter((i) => i.price <= reach * 1.3);
  const pool = affordable.length ? affordable : ITEMS;
  return pool[Math.floor(rng.next() * pool.length)].price;
}

export function spawnHawkers(run: Run, rng: Rng): Hawker[] {
  const looks = makeDistinctAppearances(rng, run.wardrobe, 4);
  const names = rng.sample([...Array(78).keys()].map(nameFor), 4);
  const out: Hawker[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < looks.length; i++) {
    let h: Hawker | null = null;
    // Four people on the floor all shouting about work gloves reads as a bug,
    // so a pitch is only allowed to appear once.
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = makeHawker(rng, {
        name: names[i],
        look: looks[i],
        tierValue: tierValueFor(run, rng),
        reputation: run.reputation,
      });
      const key = candidate.buyer ? `b:${candidate.wantSlot}` : `s:${candidate.give.id}`;
      if (taken.has(key) && attempt < 7) continue;
      taken.add(key);
      h = candidate;
      break;
    }
    if (h) out.push(h);
  }
  return out;
}

export function newRun(seed: string, wardrobe: Wardrobe): Run {
  const rng = new Rng(seed);
  const run: Run = {
    seed, rng, day: 1, mesos: START_MESOS,
    bag: [3, 13], // a Sword and a Cotton Shirt §6.3
    gear: { weapon: 3, body: 13 },
    reputation: 0, wins: 0, losses: 0,
    stalls: [], hawkers: [], ledger: [], history: [],
    peak: START_MESOS, foughtToday: false, over: null,
    dayStarted: Date.now(), wardrobe, looks: [],
  };
  const dayRng = rng.derive('day1');
  run.hawkers = spawnHawkers(run, dayRng);
  const ctx = { day: 1, hawkers: run.hawkers.map((h) => h.name), wanted: rng.sample(ITEMS, 4) };
  run.stalls = [1, 2, 3].map((pitch) => makeStall(dayRng, wardrobe, pitch, 1, run.mesos, ctx));
  return run;
}

export function record(run: Run, entry: LedgerEntry) {
  run.ledger.push(entry);
  run.peak = Math.max(run.peak, run.mesos);
}

export function buy(run: Run, it: Item, paid: number, from: string) {
  run.mesos -= paid;
  run.bag.push(it.id);
  record(run, { kind: 'bought', what: it.name, who: from, amount: paid, trueValue: it.price });
}

export function sell(run: Run, it: Item, got: number, to: string) {
  const i = run.bag.indexOf(it.id);
  if (i >= 0) run.bag.splice(i, 1);
  for (const [slot, id] of Object.entries(run.gear)) {
    if (id === it.id) delete run.gear[slot as Slot];
  }
  run.mesos += got;
  record(run, { kind: 'sold', what: it.name, who: to, amount: got, trueValue: it.price });
}

export function sellToStall(run: Run, it: Item) {
  sell(run, it, Math.round(it.price * BUYBACK_RATE), 'the shop');
}

export function equip(run: Run, it: Item) {
  if (!run.bag.includes(it.id)) return;
  run.gear[it.slot] = it.id;
}

export function unequip(run: Run, slot: Slot) {
  delete run.gear[slot];
}

export function adjustReputation(run: Run, delta: number) {
  run.reputation = clamp(run.reputation + delta, -100, 100);
}

/** Facts, not lessons. §11.2 */
export function markLedger(entries: LedgerEntry[]): LedgerEntry[] {
  const deals = entries.filter((e) => e.kind !== 'wagered' && e.trueValue > 0);
  if (deals.length < 2) return entries;
  const margin = (e: LedgerEntry) =>
    e.kind === 'bought' ? (e.trueValue - e.amount) / e.trueValue : (e.amount - e.trueValue) / e.trueValue;
  const sorted = [...deals].sort((a, b) => margin(b) - margin(a));
  if (margin(sorted[0]) > 0) sorted[0].mark = 'best';
  const worst = sorted[sorted.length - 1];
  if (margin(worst) < 0) worst.mark = 'worst';
  return entries;
}

export function endDay(run: Run): void {
  markLedger(run.ledger);
  run.history.push(run.ledger);
  run.ledger = [];

  const dayRng = run.rng.derive(`day${run.day + 1}`);
  const ctx = {
    day: run.day + 1,
    hawkers: run.hawkers.map((h) => h.name),
    wanted: dayRng.sample(ITEMS, 4),
  };
  for (const stall of run.stalls) overnight(dayRng, stall, item, ctx, run.day + 1);
  run.stalls = run.stalls.map((s) =>
    s.daysLeft > 0 ? s : makeStall(dayRng, run.wardrobe, s.pitch, run.day + 1, run.mesos, ctx));

  run.day++;
  run.foughtToday = false;
  run.hawkers = spawnHawkers(run, dayRng);
  ctx.hawkers = run.hawkers.map((h) => h.name);

  if (run.mesos >= TARGET) run.over = 'won';
  else if (marketClosed(run)) run.over = 'closed';
  else if (run.day > DAYS) run.over = 'out-of-days';
  else if (run.mesos < 1000 && run.bag.length === 0) run.over = 'busted';
}

/** Stakes cap at 25% of liquid mesos, enforced in fiction. §10.2 */
export function stakeCap(run: Run): number {
  return Math.floor(run.mesos * 0.25);
}
