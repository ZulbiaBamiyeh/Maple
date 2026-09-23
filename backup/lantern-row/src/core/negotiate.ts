/**
 * The hawker. No DOM, no timers — this module decides what is said and what it
 * costs; the shell owns the clock and the queue. §8
 *
 * Two rules that hold everywhere in here:
 *   - nothing ever explains itself to the player
 *   - neither patience nor temper is ever shown as a number
 */
import { Rng, clamp } from './rng';
import { ITEMS, item, itemsNearValue, type Item, type Slot } from './items';
import type { Appearance } from './appearance';
import type { Slot as GearSlot } from './items';

export type Style = 'pricer' | 'offerer' | 'mixed';

export interface Give {
  type: 'item' | 'mesos';
  id?: number;
  amt?: number;
}

export interface Hawker {
  name: string;
  look: Appearance;
  /** What they are actually wearing, drawn from the same table. */
  gear: Partial<Record<GearSlot, number>>;
  buyer: boolean;
  give: Give;
  wantSlot?: Slot;
  trueValue: number;
  ask: number;
  floor: number;
  threshold: number;
  patience: number;
  maxPatience: number;
  mood: number;
  savvy: number;
  stubborn: number;
  style: Style;
  wpm: number;
  placed: boolean;
  greeted: boolean;
  /** Last five things they said, so they don't repeat themselves. §8.3 */
  recent: string[];
  /** A figure they accepted. Putting less than 95% of it up gets called. §8.6 */
  promised?: number;
  standoff: number;
  pushes: number;
  asked: Record<string, number>;
  probed: number;
  chatSinceOffer: number;
  finalOffer: boolean;
  warned: boolean;
  gone: boolean;
  /** Scaled by price tier — the guy flipping 14k gear is gullible. §11.4 */
  inspectable: boolean;
  lying: boolean;
}

export interface Line {
  text: string;
  /** Filler that may be dropped if they're already talking. */
  droppable?: boolean;
  /** Direct answers jump the queue — but never ahead of a pending action. §8.3 */
  priority?: number;
  /** Puts their item into the window, with a pop. */
  action?: 'place' | 'pull' | 'leave' | 'accept' | 'decline';
  /** Flushes anything queued behind it — they don't finish what they were typing. */
  flush?: boolean;
  mood?: number;
}

// -------------------------------------------------------------------- making one

const GREETS = ['hey', 'yo', 'sup', 'hi', 'hello', 'yo yo', 'hey there'];
const SECONDS = ['one sec', 'u buying?', 'wat u got', 'brb', 'k', 'im here'];

/** savvy climbs with the money on the table. §11.4 */
export function savvyFor(rng: Rng, value: number): number {
  const tier = clamp(Math.log10(Math.max(1000, value)) - 3, 0, 3.3) / 3.3;
  return clamp(0.25 + tier * 0.55 + rng.float(-0.1, 0.15), 0.25, 0.95);
}

export interface HawkerSeed {
  name: string;
  look: Appearance;
  gear: Partial<Record<GearSlot, number>>;
  /** Roughly what this trader is playing for. */
  tierValue: number;
  reputation: number;
  buyer?: boolean;
}

/** Nobody carries 8,689 mesos on purpose. */
function roundMesos(v: number): number {
  const mag = v >= 1_000_000 ? 50_000 : v >= 100_000 ? 5000 : v >= 10_000 ? 1000 : 500;
  return Math.max(mag, Math.round(v / mag) * mag);
}

export function makeHawker(rng: Rng, seed: HawkerSeed): Hawker {
  const buyer = seed.buyer ?? rng.chance(0.45);
  const pool = itemsNearValue(seed.tierValue);
  const goods: Item = rng.pick(pool.length ? pool : ITEMS);
  const rep = seed.reputation;

  const trueValue = goods.price;
  let ask = Math.round(trueValue * (1.25 + rng.float(0, 0.45) - rep / 400));
  let floor = Math.round(trueValue * (0.7 + rng.float(0, 0.18)));
  if (floor >= ask) floor = Math.round(ask * 0.7);
  ask = Math.max(ask, floor + 1);

  const maxPatience = 4 + Math.floor(rep / 30) + rng.int(0, 2);

  return {
    name: seed.name,
    look: seed.look,
    gear: seed.gear,
    buyer,
    give: buyer
      ? { type: 'mesos', amt: roundMesos(trueValue * rng.float(0.9, 1.6)) }
      : { type: 'item', id: goods.id },
    wantSlot: buyer ? goods.slot : undefined,
    trueValue,
    ask,
    floor,
    threshold: ask,
    patience: maxPatience,
    maxPatience,
    mood: 0,
    savvy: savvyFor(rng, trueValue),
    stubborn: rng.float(0, 1),
    style: rng.pick<Style>(['pricer', 'offerer', 'mixed']),
    wpm: rng.int(26, 58),
    placed: false,
    greeted: false,
    recent: [],
    standoff: 0,
    pushes: 0,
    asked: {},
    probed: 0,
    chatSinceOffer: 0,
    finalOffer: false,
    warned: false,
    gone: false,
    inspectable: trueValue >= 50_000,
    // At a million it is absurd that everything they say is true. §11.4
    lying: trueValue >= 200_000 && rng.chance(0.28),
  };
}

// ---------------------------------------------------------------- conversation

/** §8.3 — the numbers that make it read like a person typing. */
export function thinkDelay(rng: Rng): number {
  return 650 + rng.float(0, 950);
}

export function typingTime(rng: Rng, text: string, wpm: number): number {
  return clamp(text.length * (1200 / wpm) * 4.2 + 520 + rng.float(0, 520), 950, 4200);
}

export interface Hesitation {
  runFor: number;
  pauseFor: number;
  extend: number;
}

/** Reads exactly like someone deleting what they typed. §8.3 */
export function hesitation(rng: Rng, typing: number): Hesitation | null {
  if (typing <= 1400 || !rng.chance(0.16)) return null;
  return {
    runFor: rng.float(350, 850),
    pauseFor: rng.float(500, 1400),
    extend: rng.float(700, 1400),
  };
}

/**
 * Open the window, they greet, then their item drops into their grid with a pop,
 * and only then do they talk price — and only if their style says so. §8.3
 *
 * The priorities keep that order against the queue's rule that actions outrank
 * everything else.
 */
export function openingScript(rng: Rng, h: Hawker): Line[] {
  const lines: Line[] = [{ text: rng.pick(GREETS), droppable: true, priority: 140 }];
  if (rng.chance(0.45)) lines.push({ text: rng.pick(SECONDS), droppable: true, priority: 130 });
  lines.push({ text: '', action: 'place' });
  if (h.style === 'pricer' || (h.style === 'mixed' && rng.chance(0.5))) {
    lines.push({ text: quote(rng, h) });
  }
  return lines;
}

export function mesoWord(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return (Number.isInteger(m) ? m : Number(m.toFixed(1))) + 'm';
  }
  if (v >= 1000) return Math.round(v / 1000) + 'k';
  return String(v);
}

function quote(rng: Rng, h: Hawker): string {
  const v = mesoWord(h.threshold);
  return rng.pick([
    `${v}`, `${v} for it`, `im asking ${v}`, `${v}, firm`, `${v} and its urs`,
    h.buyer ? `ill pay ${v}` : `${v} obo`,
  ]);
}

const DEFLECT = ['offer', 'u offer first', 'just offer', 'make me an offer', 'what u thinking', 'offer me something'];
const SHORT = ['i said it already', 'read it lol', 'its in the window', 'i told u', 'scroll up'];

// ----------------------------------------------------------------- valuation

/** The spread the whole economy runs on. §8.10 */
export function valueToThem(h: Hawker, it: Item): number {
  if (h.buyer) return Math.round(it.price * (it.slot === h.wantSlot ? 1.35 : 0.6));
  return Math.round(it.price * 0.85);
}

export interface TableItem {
  itemId: number;
  /** What the player claims it is worth, as a multiple of true value. §8.7 */
  claim: number;
}

export const CLAIM_MULTIPLIERS = [0.7, 1.0, 1.35, 1.8, 2.5] as const;

export const CLAIM_LABELS = [
  'undersell it — "it\'s honestly not worth much"',
  'straight value, no games',
  'talk it up a little',
  'talk it up a lot',
  'lie through your teeth',
] as const;

export function detectChance(multiplier: number, savvy: number): number {
  return clamp((multiplier - 1) * 0.78 * savvy, 0, 0.92);
}

/** What the player has actually put up, at the prices they claimed. */
export function pileValue(h: Hawker, table: TableItem[], mesos: number): number {
  return mesos + table.reduce((n, t) => n + Math.round(valueToThem(h, item(t.itemId)) * t.claim), 0);
}

// ------------------------------------------------------------------ reactions

export interface Reaction {
  lines: Line[];
  /** Costed actions burn a pip; free ones don't. §8.5 */
  pip?: number;
  mood?: number;
  /** Set when the hawker agrees a number — the deal can now be closed at it. */
  settled?: number;
  reputation?: number;
  caught?: boolean;
}

export function nudgeMood(h: Hawker, n: number) {
  h.mood = clamp(h.mood + n, -8, 6);
}

/** §8.9 — the two clocks. Neither is ever shown. */
export function spendPatience(h: Hawker, n = 1): Line[] {
  h.patience -= n;
  if (h.patience > 0) return [];
  h.gone = true;
  return [{ text: pickStatic(['k im out', 'nvm', 'forget it, im busy', 'this is taking too long']), action: 'leave', flush: true }];
}

export function checkTemper(h: Hawker): Line[] {
  if (h.mood <= -6) {
    h.gone = true;
    return [{ text: 'forget this', action: 'pull', flush: true }];
  }
  if (h.mood <= -4 && !h.warned) {
    h.warned = true;
    h.threshold = Math.round(h.threshold * 1.05);
    return [{ text: pickStatic(['last chance man', 'careful', 'dont push it']), priority: 2 }];
  }
  return [];
}

let staticRng = new Rng(1234);
export function setStaticRng(r: Rng) { staticRng = r; }
function pickStatic<T>(list: readonly T[]): T { return staticRng.pick(list); }

// -------------------------------------------------------------------- parsing

export type Intent =
  | { kind: 'greet' } | { kind: 'insult' } | { kind: 'askPrice' } | { kind: 'noYouOffer' }
  | { kind: 'push' } | { kind: 'offer'; value: number } | { kind: 'claim'; value: number }
  | { kind: 'business' } | { kind: 'stat' } | { kind: 'poor' } | { kind: 'pitch'; itemId: number }
  | { kind: 'final' } | { kind: 'wait' } | { kind: 'inspect' } | { kind: 'unparsed' };

const NUM = /(\d+(?:\.\d+)?)\s*([km])?/i;

/** `60`, `60k`, `1.2m` — and a bare number under 10,000 means thousands. §8.5 */
export function parseNumber(raw: string): number | null {
  const m = raw.match(NUM);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k') v *= 1000;
  else if (unit === 'm') v *= 1_000_000;
  else if (v < 10_000) v *= 1000;
  return Math.round(v);
}

export function parse(raw: string, bag: number[]): Intent {
  const t = raw.trim().toLowerCase();
  if (!t) return { kind: 'unparsed' };

  if (/\b(noob|nub|scam|scammer|idiot|stupid|hacker|ugly|trash)\b/.test(t)) return { kind: 'insult' };
  if (/\b(final offer|thats it|take it or leave)\b/.test(t)) return { kind: 'final' };
  if (/\b(hold on|wait|1 sec|one sec|brb|sec)\b/.test(t)) return { kind: 'wait' };
  if (/\b(u offer|you offer|no u|you first|u first|ur turn)\b/.test(t)) return { kind: 'noYouOffer' };
  if (/\b(how much|price|hm\?|howmuch|whats it|what do u want)\b/.test(t) || t === 'hm') return { kind: 'askPrice' };
  if (/\b(too much|expensive|cmon|come on|thats a lot|pricey|lower|cheaper|less)\b/.test(t)) return { kind: 'push' };
  if (/\b(im poor|i'm poor|cant afford|can't afford|no mesos|broke)\b/.test(t)) return { kind: 'poor' };
  if (/\b(inspect|let me see|can i see|is it real|check it)\b/.test(t)) return { kind: 'inspect' };
  if (/\b(what are you buying|what r u buying|wts|wtb|what do you want|buying|selling)\b/.test(t)) return { kind: 'business' };
  if (/\b(any good|is it good|stats|how good|worth it)\b/.test(t)) return { kind: 'stat' };

  const seen = /\b(seen|saw|goes for|going for|worth|sells for|sold for)\b/.test(t);
  const value = parseNumber(t);
  if (value !== null && seen) return { kind: 'claim', value };
  if (value !== null && /\b(ill give|i'll give|give u|for|\?|offer|take)\b/.test(t)) return { kind: 'offer', value };
  if (value !== null && /^\s*[\d.]+\s*[km]?\s*\??\s*$/.test(t)) return { kind: 'offer', value };

  const pitched = bag.map((id) => item(id)).find((it) => t.includes(it.name.toLowerCase().split(' ')[0]));
  if (pitched && /\b(want|need|u want|interested|how about my|my)\b/.test(t)) {
    return { kind: 'pitch', itemId: pitched.id };
  }

  if (/\b(hi|hey|yo|hello|sup|ty|thanks|thx|pls|please|np|sorry)\b/.test(t)) return { kind: 'greet' };
  return { kind: 'unparsed' };
}

// ------------------------------------------------------------------ responses

function askedBefore(h: Hawker, key: string): boolean {
  h.asked[key] = (h.asked[key] ?? 0) + 1;
  return h.asked[key] > 1;
}

export function respond(rng: Rng, h: Hawker, intent: Intent, table: TableItem[], mesos: number): Reaction {
  setStaticRng(rng);
  const nothingOnTable = !table.length && mesos <= 0;
  if (nothingOnTable) h.chatSinceOffer++;

  switch (intent.kind) {
    case 'greet':
      nudgeMood(h, 1);
      return { lines: [{ text: rng.pick(['hey', 'yo', 'np', 'sup', 'ty', 'k']), droppable: true }] };

    case 'insult':
      nudgeMood(h, -2);
      h.threshold = Math.round(h.threshold * 1.06);
      return { lines: [{ text: rng.pick(['wow', 'rude', 'nice one', 'ok then', 'k.']), flush: true }] };

    case 'askPrice': {
      if (askedBefore(h, 'price')) return { lines: [{ text: rng.pick(SHORT) }] };
      if (h.style === 'offerer' || (h.style === 'mixed' && rng.chance(0.5))) {
        return { lines: [{ text: rng.pick(DEFLECT) }] };
      }
      return { lines: [{ text: quote(rng, h) }] };
    }

    case 'noYouOffer': {
      h.standoff++;
      const cave = 0.2 + h.standoff * 0.22 + h.mood * 0.04 - h.stubborn * 0.3;
      const lines: Line[] = [];
      if (rng.chance(cave)) {
        h.threshold = Math.round(h.threshold * 0.94);
        lines.push({ text: quote(rng, h) });
      } else {
        lines.push({ text: rng.pick(['no u', 'i asked first', 'u offer', 'nah u go', 'im not going first']) });
      }
      return { lines: [...lines, ...spendPatience(h)], pip: 1 };
    }

    case 'push': {
      h.pushes++;
      const cost = h.pushes === 1 ? -1 : -2;
      nudgeMood(h, cost);
      const give = rng.chance(clamp(0.42 - h.stubborn * 0.25, 0.08, 0.5));
      const lines: Line[] = [];
      if (give) {
        h.threshold = Math.max(h.floor, Math.round(h.threshold * 0.93));
        lines.push({ text: rng.pick([`fine, ${mesoWord(h.threshold)}`, `${mesoWord(h.threshold)} then`, `ugh. ${mesoWord(h.threshold)}`]) });
      } else {
        lines.push({ text: rng.pick(['its worth it', 'thats the price', 'nah', 'go look upstairs then', 'its cheap already']) });
      }
      return { lines: [...lines, ...checkTemper(h), ...spendPatience(h)], pip: 1, mood: cost };
    }

    case 'offer':
      return verbalOffer(rng, h, intent.value);

    case 'claim':
      return marketClaim(rng, h, intent.value);

    case 'business': {
      if (askedBefore(h, 'business')) return { lines: [{ text: rng.pick(SHORT) }] };
      const text = h.buyer
        ? rng.pick([`buying ${h.wantSlot}s`, `im after a ${h.wantSlot}`, `wtb ${h.wantSlot}, got one?`])
        : rng.pick([`selling my ${item(h.give.id!).name.toLowerCase()}`, `its all in the window`, `wts, u interested`]);
      return { lines: [{ text }] };
    }

    case 'stat': {
      if (h.buyer) return { lines: [{ text: rng.pick(['i just need one', 'any is fine', 'dont care much']) }] };
      const it = item(h.give.id!);
      const claims = [
        it.dmg ? `hits ${it.dmg[0]}-${it.dmg[1]}` : null,
        it.armour ? `${it.armour} armour` : null,
        it.str ? `+${it.str} str` : null,
        it.text[0] ? it.text[0].toLowerCase() : null,
      ].filter(Boolean) as string[];
      const line = h.lying && rng.chance(0.5)
        ? rng.pick(['its clean', 'barely used', 'best in slot trust me'])
        : rng.pick(claims.length ? claims : ['its fine']);
      return { lines: [{ text: line }] };
    }

    case 'poor': {
      const lines: Line[] = [];
      if (rng.chance(0.35)) {
        h.threshold = Math.max(h.floor, Math.round(h.threshold * 0.93));
        lines.push({ text: rng.pick([`ok ${mesoWord(h.threshold)}`, 'fine, little less', 'ugh ok']) });
      } else {
        lines.push({ text: rng.pick(['everyone is', 'not my problem', 'so am i', 'come back with mesos']) });
      }
      return { lines: [...lines, ...spendPatience(h)], pip: 1 };
    }

    case 'pitch': {
      const it = item(intent.itemId);
      const worth = valueToThem(h, it);
      const keen = h.buyer && it.slot === h.wantSlot;
      return {
        lines: [{
          text: keen
            ? rng.pick(['yes', 'ya put it up', 'thats what i want', 'lets see it'])
            : worth > h.trueValue * 0.5
              ? rng.pick(['maybe', 'ill look', 'put it in the window'])
              : rng.pick(['no thanks', 'dont need it', 'nah', 'not interested in that']),
        }],
      };
    }

    case 'inspect': {
      if (!h.inspectable) return { lines: [{ text: rng.pick(['its right there', 'look at it lol']) }] };
      const honest = !h.lying;
      return {
        lines: [{ text: honest
          ? rng.pick(['sure, its exactly as listed', 'go ahead. its clean', 'nothing to hide'])
          : rng.pick(['its fine', 'do u want it or not', 'no time for that', 'trust me its clean']) }],
        pip: 1,
      };
    }

    case 'final':
      h.finalOffer = true;
      return { lines: [{ text: rng.pick(['k', 'we will see', 'alright then', 'go on then']) }] };

    case 'wait':
      return { lines: [{ text: 'k', droppable: true }] };

    case 'unparsed':
    default:
      return { lines: [{ text: rng.pick(['?', 'wdym', 'huh', 'wat', '??']), droppable: true }] };
  }
}

/** Naming a figure is the strongest and most dangerous move. §8.6 */
export function verbalOffer(rng: Rng, h: Hawker, value: number): Reaction {
  const lines: Line[] = [];
  if (value < h.floor) {
    const gap = h.threshold - h.floor;
    h.threshold = Math.max(h.floor, Math.round(h.threshold - gap * 0.12));
    const lowball = value < h.floor * 0.5;
    nudgeMood(h, lowball ? -2 : -1);
    lines.push({ text: rng.pick(lowball
      ? ['lol no', 'are u serious', 'thats an insult', 'no.']
      : ['too low', 'cant do that', 'nah thats under what i paid', 'no chance']) });
    return { lines: [...lines, ...checkTemper(h), ...spendPatience(h)], pip: 1, mood: lowball ? -2 : -1 };
  }
  if (value >= h.threshold) {
    h.promised = value;
    lines.push({ text: rng.pick(['deal', 'yes', 'done, put it up', 'ya ok!', 'sold']) });
    return { lines, pip: 1, settled: value };
  }
  // floor <= v < threshold — they take it, and three rounds of haggling vanish.
  h.threshold = value;
  h.promised = value;
  lines.push({ text: rng.pick(['ok', 'fine, deal', 'alright', 'ya ok', 'deal then']) });
  return { lines, pip: 1, settled: value };
}

/** Near the truth is effective. Far from it is catchable. §8.8 */
export function marketClaim(rng: Rng, h: Hawker, value: number): Reaction {
  if (value >= h.threshold) {
    return { lines: [{ text: `then pay ${mesoWord(value)} lol` }], pip: 1 };
  }
  if (value >= h.floor * 0.85) {
    const believe = clamp(0.45 + (h.savvy < 0.5 ? 0.1 : -0.1) + h.mood * 0.04, 0.05, 0.9);
    if (rng.chance(believe)) {
      h.threshold = Math.round((h.threshold + Math.max(value, h.floor)) / 2);
      return {
        lines: [{ text: rng.pick([`hm. ${mesoWord(h.threshold)} then`, `ok ${mesoWord(h.threshold)}`, 'maybe ur right']) }],
        pip: 1,
      };
    }
    return { lines: [{ text: rng.pick(['not from me', 'good for them', 'go buy it there then']) }], pip: 1 };
  }
  nudgeMood(h, -1);
  return {
    lines: [{ text: rng.pick(['lol where', 'thats a lie', 'no they didnt', 'sure they did']) }],
    pip: 1, mood: -1,
  };
}

/** Placing an item with a claim attached — and getting caught. §8.7 */
export function judgeClaim(rng: Rng, h: Hawker, it: Item, multiplier: number): Reaction {
  if (multiplier < 1) {
    nudgeMood(h, 2);
    h.threshold = Math.round(h.threshold * 0.94);
    return {
      lines: [{ text: rng.pick(['ur honest at least', 'huh, ok', 'appreciate that', 'thats fair of u']) }],
      reputation: 2, mood: 2,
    };
  }
  if (multiplier === 1) return { lines: [] };
  if (!rng.chance(detectChance(multiplier, h.savvy))) return { lines: [] };

  nudgeMood(h, -3);
  h.threshold = Math.round(h.threshold * 1.12);
  const walk = rng.chance(0.35);
  const lines: Line[] = [{
    text: rng.pick([
      `thats not worth ${mesoWord(Math.round(it.price * multiplier))}`,
      'lol i know what that goes for',
      'dont lie to me',
      `a ${it.name.toLowerCase()} is not that much`,
    ]),
    flush: true,
  }];
  if (walk) {
    h.gone = true;
    lines.push({ text: rng.pick(['im telling people about u', 'were done', 'nah. bye']), action: 'leave' });
  }
  return { lines, reputation: -7, mood: -3, caught: true };
}

/** A number they accepted binds. §8.6 */
export function checkPromise(rng: Rng, h: Hawker, offered: number): Reaction | null {
  if (h.promised === undefined) return null;
  if (offered >= h.promised * 0.95) return null;
  nudgeMood(h, -2);
  h.threshold = Math.round(h.threshold * 1.08);
  return {
    lines: [{ text: rng.pick([`u said ${mesoWord(h.promised)} tho`, 'thats not what u said', `where is the other ${mesoWord(h.promised - offered)}`]) }],
    pip: 1, mood: -2,
  };
}

/** Probing costs a pip and buys the knowledge to name a number safely. §8.6 */
export function probe(rng: Rng, h: Hawker): Reaction {
  h.probed++;
  const lines: Line[] = [];
  if (h.probed === 1) {
    lines.push({ text: h.savvy > 0.6
      ? rng.pick(['i know exactly what this is worth', 'ive sold three of these', 'i watch the boards'])
      : rng.pick(['i dunno really', 'my friend gave it me', 'is it good?']) });
  } else {
    const hint = Math.round(((h.floor + h.threshold) / 2) / 1000) * 1000;
    lines.push({ text: rng.pick([
      `id take somewhere around ${mesoWord(hint)} honestly`,
      `around ${mesoWord(hint)} and im happy`,
      `${mesoWord(hint)}ish`,
    ]) });
  }
  return { lines: [...lines, ...spendPatience(h)], pip: 1 };
}

/** Both sides press Trade. The pause before they answer is the commitment. §8.11 */
export function judgeTrade(rng: Rng, h: Hawker, offered: number): Reaction {
  const broken = checkPromise(rng, h, offered);
  if (broken) return { ...broken, lines: [...broken.lines, { action: 'decline', text: '' }] };
  if (offered >= h.threshold || (offered >= h.floor && rng.chance(0.35))) {
    return { lines: [{ text: rng.pick(['ok', 'done', 'pleasure', 'ty', 'gl with it']), action: 'accept' }], settled: offered };
  }
  if (h.finalOffer) {
    h.gone = true;
    return { lines: [{ text: rng.pick(['then no', 'were done here', 'nah. bye']), action: 'leave', flush: true }] };
  }
  const counter = Math.max(h.floor, Math.round((offered + h.threshold) / 2));
  h.threshold = counter;
  return {
    lines: [{ text: rng.pick([`${mesoWord(counter)} and its done`, `make it ${mesoWord(counter)}`, `${mesoWord(counter)}. thats it`]), action: 'decline' }],
    pip: 1,
  };
}

/** Five messages with nothing on the table and they start to sour. §8.9 */
export function idleCheck(h: Hawker): Reaction | null {
  if (h.chatSinceOffer < 5) return null;
  h.chatSinceOffer = 0;
  nudgeMood(h, -1);
  return { lines: [{ text: pickStatic(['u gonna offer or', 'im waiting', 'this is going nowhere']) }], mood: -1 };
}
