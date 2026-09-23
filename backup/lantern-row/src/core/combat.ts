/**
 * Both fighters auto-attack on a timer. That is the entire engine. §9
 *
 * The simulation is a pure stepper: feed it dt, read the events back out. The
 * renderer turns events into damage numbers, flame, hitstop and proc flashes; it
 * never asks the fight what to do.
 */
import { Rng, clamp } from './rng';
import { item, type Item, type Slot } from './items';

export type Status = 'burn' | 'poison' | 'slow' | 'freeze' | 'weaken' | 'regen' | 'shield' | 'thorns';

export interface Loadout {
  name: string;
  /** slot -> item id */
  gear: Partial<Record<Slot, number>>;
}

export interface Stats {
  min: number;
  max: number;
  speed: number;
  crit: number;
  critDmg: number;
  armour: number;
  str: number;
  hp: number;
}

export const BASE_HP = 190;

export function rollUp(gear: Partial<Record<Slot, number>>): Stats {
  const worn = Object.values(gear).filter((v): v is number => typeof v === 'number').map(item);
  const weapon = worn.find((i) => i.slot === 'weapon');
  const s: Stats = {
    min: weapon?.dmg?.[0] ?? 2,
    max: weapon?.dmg?.[1] ?? 5,
    speed: weapon?.spd ?? 1,
    crit: 5, critDmg: 0, armour: 0, str: 0, hp: BASE_HP,
  };
  let speedPct = 0;
  for (const it of worn) {
    s.armour += it.armour ?? 0;
    s.str += it.str ?? 0;
    s.crit += it.crit ?? 0;
    s.critDmg += it.critDmg ?? 0;
    speedPct += it.spdPct ?? 0;
    s.min += it.minDmg ?? 0;
  }
  s.speed *= 1 + speedPct / 100;
  s.max = Math.max(s.max, s.min);
  return s;
}

interface Effects {
  onHitBurn: number;
  burnExtraStack: number;
  burnBonusPerStack: number;
  burnNoDecay: boolean;
  burnDouble: boolean;
  healPerBurnStack: number;
  slowToFreeze: number;
  spdPctVsSlowed: number;
  /** Attackers take this much, and armour does not help them. §9.3 */
  thorns: number;
  /** Heal per second — the fast early healing that answers a burn build. §9.7 */
  regen: number;
  procs: { chance: number; status: Status; dur: number; slot: Slot }[];
}

function effectsOf(gear: Partial<Record<Slot, number>>): Effects {
  const e: Effects = {
    onHitBurn: 0, burnExtraStack: 0, burnBonusPerStack: 0, burnNoDecay: false,
    burnDouble: false, healPerBurnStack: 0, slowToFreeze: 0, spdPctVsSlowed: 0,
    thorns: 0, regen: 0, procs: [],
  };
  for (const [slot, id] of Object.entries(gear)) {
    if (typeof id !== 'number') continue;
    const it: Item = item(id);
    e.onHitBurn += it.onHitBurn ?? 0;
    e.burnExtraStack += it.burnExtraStack ?? 0;
    e.burnBonusPerStack += it.burnBonusPerStack ?? 0;
    e.burnNoDecay ||= !!it.burnNoDecay;
    e.burnDouble ||= !!it.burnDouble;
    e.healPerBurnStack += it.healPerBurnStack ?? 0;
    e.slowToFreeze = Math.max(e.slowToFreeze, it.slowToFreeze ?? 0);
    e.spdPctVsSlowed += it.spdPctVsSlowed ?? 0;
    e.thorns += it.thorns ?? 0;
    e.regen += it.regen ?? 0;
    if (it.proc) e.procs.push({ ...it.proc, slot: slot as Slot });
  }
  return e;
}

export interface Fighter {
  name: string;
  gear: Partial<Record<Slot, number>>;
  stats: Stats;
  fx: Effects;
  hp: number;
  maxHp: number;
  cooldown: number;
  burn: number;
  burnTick: number;
  poison: number;
  slow: number;
  freeze: number;
  weaken: number;
}

export function makeFighter(l: Loadout): Fighter {
  const stats = rollUp(l.gear);
  return {
    name: l.name, gear: l.gear, stats, fx: effectsOf(l.gear),
    hp: stats.hp, maxHp: stats.hp, cooldown: 0.35,
    burn: 0, burnTick: 0, poison: 0, slow: 0, freeze: 0, weaken: 0,
  };
}

export type CombatEvent =
  | { type: 'hit'; side: 0 | 1; amount: number; crit: boolean }
  | { type: 'tick'; side: 0 | 1; amount: number; status: Status }
  | { type: 'heal'; side: 0 | 1; amount: number }
  | { type: 'status'; side: 0 | 1; status: Status }
  /** The slot that fired, so the paper doll can light it up. §9.6 */
  | { type: 'proc'; side: 0 | 1; slot: Slot; status: Status }
  | { type: 'end'; winner: 0 | 1; reason: 'kill' | 'timeout' | 'yield' };

export interface Fight {
  a: Fighter;
  b: Fighter;
  t: number;
  over: boolean;
  winner?: 0 | 1;
  reason?: 'kill' | 'timeout' | 'yield';
  rng: Rng;
}

/** Hard timeout at 20s; the higher HP% takes it. That kills stalls. §9.6 */
export const TIMEOUT = 20;

/** Armour halves incoming damage at this value. */
export const ARMOUR_K = 26;

/**
 * A ceiling on stacking statuses. Without it a burn build's damage grows with
 * the square of the clock and nothing in the table can answer it. §9.7 asks for
 * every build to have a counter, and this is what makes one possible.
 */
export const MAX_STACKS = 4;

export function startFight(rng: Rng, a: Loadout, b: Loadout): Fight {
  return { a: makeFighter(a), b: makeFighter(b), t: 0, over: false, rng };
}

function attackInterval(f: Fighter, foe: Fighter): number {
  let speed = f.stats.speed;
  if (foe.slow > 0) speed *= 1 + f.fx.spdPctVsSlowed / 100;
  if (f.slow > 0) speed *= 0.75;
  return 2 / Math.max(0.05, speed);
}

function applyBurn(rng: Rng, src: Fighter, target: Fighter, out: CombatEvent[], side: 0 | 1) {
  const stacks = src.fx.onHitBurn + (src.fx.onHitBurn > 0 ? src.fx.burnExtraStack : 0);
  if (stacks <= 0) return;
  target.burn = Math.min(MAX_STACKS, target.burn + stacks);
  out.push({ type: 'status', side: side === 0 ? 1 : 0, status: 'burn' });
  void rng;
}

function swing(fight: Fight, side: 0 | 1, out: CombatEvent[]) {
  const f = side === 0 ? fight.a : fight.b;
  const foe = side === 0 ? fight.b : fight.a;
  const rng = fight.rng;

  const raw = rng.int(f.stats.min, f.stats.max) + f.stats.str;
  // Armour blunts a hit, it never deletes one: flat subtraction would reduce a
  // 9-14 weapon to nothing against a heavy build and make half the table junk.
  let dmg = Math.max(1, Math.round(raw * (1 - foe.stats.armour / (foe.stats.armour + ARMOUR_K))));
  if (f.weaken > 0) dmg = Math.round(dmg * 0.7);
  const crit = rng.chance(clamp(f.stats.crit, 0, 95) / 100);
  if (crit) dmg = Math.round(dmg * (1.75 + f.stats.critDmg / 100));

  foe.hp -= dmg;
  out.push({ type: 'hit', side: side === 0 ? 1 : 0, amount: dmg, crit });

  // Thorns do not care how fast you swing — which is the point of them.
  if (foe.fx.thorns > 0) {
    f.hp -= foe.fx.thorns;
    out.push({ type: 'tick', side, amount: foe.fx.thorns, status: 'thorns' });
  }

  applyBurn(rng, f, foe, out, side);

  for (const p of f.fx.procs) {
    if (!rng.chance(p.chance)) continue;
    let status: Status = p.status;
    // Maple Shield turns a slow into a freeze — the whole frost-lock build. §9.7
    if (status === 'slow' && f.fx.slowToFreeze && rng.chance(f.fx.slowToFreeze)) status = 'freeze';
    if (status === 'slow') foe.slow = Math.max(foe.slow, p.dur);
    else if (status === 'freeze') foe.freeze = Math.max(foe.freeze, 1.5);
    else if (status === 'weaken') foe.weaken = Math.max(foe.weaken, p.dur);
    else if (status === 'burn') foe.burn = Math.min(MAX_STACKS, foe.burn + 1);
    else if (status === 'poison') foe.poison = Math.min(MAX_STACKS, foe.poison + 1);
    out.push({ type: 'proc', side, slot: p.slot, status });
    out.push({ type: 'status', side: side === 0 ? 1 : 0, status });
  }
}

/** `f` is the one burning; the amplifiers belong to whoever set them alight. */
function tickStatuses(fight: Fight, f: Fighter, side: 0 | 1, dt: number, out: CombatEvent[]) {
  f.slow = Math.max(0, f.slow - dt);
  f.freeze = Math.max(0, f.freeze - dt);
  f.weaken = Math.max(0, f.weaken - dt);

  f.burnTick += dt;
  while (f.burnTick >= 1) {
    f.burnTick -= 1;
    if (f.fx.regen > 0 && f.hp > 0) {
      const heal = Math.min(f.fx.regen, f.maxHp - f.hp);
      if (heal > 0) {
        f.hp += heal;
        out.push({ type: 'heal', side, amount: heal });
      }
    }
    const source = side === 0 ? fight.b : fight.a;
    if (f.burn > 0) {
      // Burn ignores armour, and the Zakum Helmet makes every stack bite harder.
      let per = 3 + source.fx.burnBonusPerStack;
      if (source.fx.burnDouble) per *= 2;
      const amount = f.burn * per;
      f.hp -= amount;
      out.push({ type: 'tick', side, amount, status: 'burn' });
      if (source.fx.healPerBurnStack) {
        const heal = f.burn * source.fx.healPerBurnStack;
        source.hp = Math.min(source.maxHp, source.hp + heal);
        out.push({ type: 'heal', side: side === 0 ? 1 : 0, amount: heal });
      }
      if (!source.fx.burnNoDecay && fight.rng.chance(0.35)) f.burn--;
    }
    if (f.poison > 0) {
      const amount = f.poison * 2;
      f.hp -= amount;
      out.push({ type: 'tick', side, amount, status: 'poison' });
    }
  }
}

export function step(fight: Fight, dt: number): CombatEvent[] {
  const out: CombatEvent[] = [];
  if (fight.over) return out;
  fight.t += dt;

  for (const [f, side] of [[fight.a, 0], [fight.b, 1]] as [Fighter, 0 | 1][]) {
    tickStatuses(fight, f, side, dt, out);
  }

  for (const side of [0, 1] as const) {
    const f = side === 0 ? fight.a : fight.b;
    const foe = side === 0 ? fight.b : fight.a;
    if (f.hp <= 0 || foe.hp <= 0) continue;
    if (f.freeze > 0) continue;
    f.cooldown -= dt;
    if (f.cooldown <= 0) {
      f.cooldown += attackInterval(f, foe);
      swing(fight, side, out);
    }
  }

  if (fight.a.hp <= 0 || fight.b.hp <= 0) {
    fight.over = true;
    fight.winner = fight.a.hp <= 0 ? 1 : 0;
    fight.reason = 'kill';
    out.push({ type: 'end', winner: fight.winner, reason: 'kill' });
  } else if (fight.t >= TIMEOUT) {
    fight.over = true;
    fight.winner = fight.a.hp / fight.a.maxHp >= fight.b.hp / fight.b.maxHp ? 0 : 1;
    fight.reason = 'timeout';
    out.push({ type: 'end', winner: fight.winner, reason: 'timeout' });
  }
  return out;
}

/** Yield unlocks below 40% HP. Cutting losses is a merchant's skill. §10.5 */
export function canYield(fight: Fight, side: 0 | 1): boolean {
  const f = side === 0 ? fight.a : fight.b;
  return !fight.over && f.hp / f.maxHp < 0.4;
}

export function yieldFight(fight: Fight, side: 0 | 1): CombatEvent {
  fight.over = true;
  fight.winner = side === 0 ? 1 : 0;
  fight.reason = 'yield';
  return { type: 'end', winner: fight.winner, reason: 'yield' };
}

/** Runs a fight to the end with no rendering — used by the balance tests. */
export function simulate(rng: Rng, a: Loadout, b: Loadout): { winner: 0 | 1; t: number; reason: string } {
  const fight = startFight(rng, a, b);
  while (!fight.over) step(fight, 1 / 30);
  return { winner: fight.winner!, t: fight.t, reason: fight.reason! };
}
