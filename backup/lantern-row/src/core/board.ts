import { Rng, clamp } from './rng';
import { ITEMS, item, type Item } from './items';
import { HANDLES } from './names';

export type BoardKind = 'gossip' | 'wanted' | 'warning' | 'shopkeeper' | 'noise';

export interface BoardMessage {
  kind: BoardKind;
  author: string;
  text: string;
  /** Day the message was written; anything older than two days renders faded. */
  day: number;
  mine?: boolean;
}

const NOISE = [
  'any1 got a spare 10k', 'lvl 34 sin lf ptyyy', 'hacker on the bottom floor',
  'smega spam is out of control', 'brb food', 'who keeps writing on this board',
  '@@@@@@@@@@', 'i miss the old market', 'first', 'is this thing on',
  'wts 2 fresh pigs mmk', 'anyone selling scrolls', 'my ping is awful today',
  'lf> ppl to kill ht', 'why is everyone afk', 'selling nothing, just looking',
  'cc pls', 'the guy in fm3 is a scammer', 'i got scrolled 10% and it passed',
  'bought a pet, worth it', 'does anyone read these',
];

const SINGLES = ['lol', 'o/', 'xd', '???', 'rofl', 'omgg', 'ty', 'np', 'kk', 'zzz', 'gl hf', 'ok.'];

const SHOPKEEPER = [
  'no haggling. this is not downstairs.', 'prices are prices.',
  'i do not hold items. do not ask.', 'first come first served.',
  'if it is on the shelf it is for sale.', 'no, i will not go lower.',
  'stock changes when i feel like it.', 'buy or move along please.',
];

const WANTED_TAILS = [
  'paying well, ask for me', 'pm me', 'will pay over', 'need it today',
  'dont lowball me i know what i have', 'have mesos ready',
];

const WARNINGS = [
  'watch out for %s, said it was clean and it wasnt',
  '%s scammed me. dont trade him',
  'dont trust %s',
  '%s tried to sell me junk at triple',
  'avoid %s, wasted 10 mins of my life',
];

const GOSSIP = [
  'got a %s for %v off some guy downstairs',
  'anyone know what a %s actually goes for',
  'saw a %s go for %v earlier',
  '%s is %v these days right',
  'paid %v for my %s, did i get robbed',
  'someone in fm2 wanted %v for a %s lmao',
  'if anyone offers you less than %v for a %s walk away',
];

function mesoWord(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + 'm';
  if (v >= 1000) return Math.round(v / 1000) + 'k';
  return String(v);
}

/** Quoted figures land at 72–127% of true value. Any one is unreliable. §7.3 */
export function gossipPrice(rng: Rng, it: Item): number {
  const v = it.price * rng.float(0.72, 1.27);
  const mag = v >= 1_000_000 ? 50_000 : v >= 100_000 ? 5000 : v >= 10_000 ? 1000 : 500;
  return Math.max(mag, Math.round(v / mag) * mag);
}

export interface BoardContext {
  day: number;
  /** Names of hawkers actually on the floor — warnings must name live people. */
  hawkers: string[];
  /** Items the floor is hungry for. */
  wanted: Item[];
  shopkeeper: string;
}

function oneMessage(rng: Rng, ctx: BoardContext): BoardMessage {
  const roll = rng.next();
  const author = rng.pick(HANDLES);
  if (roll < 0.3) {
    const it = rng.pick(ITEMS);
    const text = rng.pick(GOSSIP)
      .replace('%s', it.name.toLowerCase())
      .replace('%v', mesoWord(gossipPrice(rng, it)));
    return { kind: 'gossip', author, text, day: ctx.day };
  }
  if (roll < 0.44) {
    const it = ctx.wanted.length ? rng.pick(ctx.wanted) : rng.pick(ITEMS);
    return {
      kind: 'wanted', author, day: ctx.day,
      text: `wtb ${it.name.toLowerCase()}, ${rng.pick(WANTED_TAILS)}`,
    };
  }
  if (roll < 0.54 && ctx.hawkers.length) {
    return {
      kind: 'warning', author, day: ctx.day,
      text: rng.pick(WARNINGS).replace('%s', rng.pick(ctx.hawkers)),
    };
  }
  if (roll < 0.62) {
    return { kind: 'shopkeeper', author: ctx.shopkeeper, text: rng.pick(SHOPKEEPER), day: ctx.day };
  }
  return {
    kind: 'noise', author, day: ctx.day,
    text: rng.chance(0.25) ? rng.pick(SINGLES) : rng.pick(NOISE),
  };
}

/** Retries up to six times rather than repeat a line already on the board. §7.3 */
export function addMessages(rng: Rng, board: BoardMessage[], ctx: BoardContext, n: number) {
  for (let i = 0; i < n; i++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const msg = oneMessage(rng, ctx);
      if (board.some((m) => m.text === msg.text)) continue;
      board.push(msg);
      break;
    }
  }
}

export function seedBoard(rng: Rng, ctx: BoardContext): BoardMessage[] {
  const board: BoardMessage[] = [];
  addMessages(rng, board, ctx, rng.int(3, 6));
  return board;
}

export function messageAge(msg: BoardMessage, today: number): number {
  return clamp(today - msg.day, 0, 99);
}

export { item as boardItem };
