/** §13 — build this in milestone 1, not later. */
export interface NegotiationRecord {
  day: number;
  hawker: string;
  buyer: boolean;
  ask: number;
  floor: number;
  trueValue: number;
  settled: number | null;
  pipsUsed: number;
  moodEnd: number;
  lieAttempts: number;
  lieCaught: number;
  outcome: 'traded' | 'walked' | 'patience' | 'temper' | 'left';
}

export interface DayRecord {
  day: number;
  seconds: number;
  bankrollStart: number;
  bankrollEnd: number;
  unsoldMarkups: number[];
}

const negotiations: NegotiationRecord[] = [];
const days: DayRecord[] = [];

export function logNegotiation(r: NegotiationRecord) {
  negotiations.push(r);
  print('negotiation', [r]);
}

export function logDay(r: DayRecord) {
  days.push(r);
  print('day', [{
    day: r.day,
    seconds: Math.round(r.seconds),
    bankroll: r.bankrollEnd,
    delta: r.bankrollEnd - r.bankrollStart,
    unsoldMarkupMean: mean(r.unsoldMarkups),
  }]);
}

function mean(xs: number[]): number {
  return xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3)) : 0;
}

function print(label: string, rows: unknown[]) {
  // eslint-disable-next-line no-console
  console.groupCollapsed?.(`[${label}]`);
  // eslint-disable-next-line no-console
  console.table?.(rows);
  // eslint-disable-next-line no-console
  console.groupEnd?.();
}

export function dumpAll() {
  print('negotiations', negotiations);
  print('days', days);
}

export const instrumentation = { negotiations, days };
