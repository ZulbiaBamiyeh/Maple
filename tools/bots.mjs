// Shared bot play for the tuning and balance tools.
//
// Two ways to judge gear:
//   'greedy'  - DPS x EHP from the headline numbers. Blind to sets' rules,
//               keystones, relics and perks beyond their raw stats.
//   'fighter' - practice fights against today's monsters and the next duel's
//               rivals. Sees everything the sim does, so it's the one that
//               finds combos. Much slower.
import fs from 'node:fs';
import { Run, duelFighter } from '../src/game.js';
import { MOBS, GHOSTS, DUEL_ROUNDS, ROUNDS_PER_DAY, BAG_SIZE } from '../src/data.js';
import { simulate } from '../src/sim.js';
import { mobFighter, hydrate } from '../src/items.js';

// Practice opponents for this point in the run: today's Normal and Elite
// monsters, and the rivals of the next duel.
function benchmark(run) {
  if (run._bench?.round === run.round) return run._bench.foes;
  const duelRound = DUEL_ROUNDS.find((r) => r >= run.round) ?? DUEL_ROUNDS.at(-1);
  const tiers = run.dayInfo().tiers;
  const foes = [
    ...[...tiers.normal, ...tiers.elite].slice(0, 3).map((id) => mobFighter(id, run.round)),
    ...GHOSTS.filter((g) => g.round === duelRound).map((g) => duelFighter(rival(g, duelRound), duelRound)),
  ];
  run._bench = { round: run.round, foes };
  return foes;
}
// A hand-written rival, geared the way Run.rollRound gears them.
const rival = (g, round) => ({
  ...g, equip: Object.fromEntries(Object.entries(g.equip).map(([s, i]) => [s, i ? hydrate(i, round, 0) : null])),
});

export function valueOf(run, equip, style) {
  const h = run.headline(equip);
  const greedy = h.dps * h.ehp;
  if (style !== 'fighter') return greedy;
  const me = run.fighter(equip);
  let w = 0, n = 0;
  for (const foe of benchmark(run)) {
    for (let k = 0; k < 2; k++, n++) {
      const r = simulate(me, foe, 4000 + k).winner;
      w += r === 0 ? 1 : r === -1 ? 0.5 : 0;
    }
  }
  return w / n + greedy * 1e-9; // win rate first; raw numbers break ties
}

// Put anything from the bag on if it makes the build better, merge twins, and
// sell down to one free bag slot.
export function tidy(run, style) {
  for (let pass = 0; pass < (style === 'fighter' ? 1 : 3); pass++) {
    for (const inst of run.bag.slice()) {
      const slot = run.slotFor(inst);
      if (valueOf(run, run.withItem(inst, slot), style) > valueOf(run, run.equip, style)) run.equipFromBag(inst.uid, slot);
    }
  }
  for (const inst of [...run.bag, ...Object.values(run.equip)].filter(Boolean)) if (run.find(inst.uid) && run.twinOf(inst)) run.merge(inst.uid);
  while (run.bag.length > BAG_SIZE - 1) run.sell(run.bag[0].uid);
}

export function shop(run, style) {
  let bought = true;
  while (bought && run.shop) {
    bought = false;
    let best = -1, bestGain = 0;
    const now = valueOf(run, run.equip, style);
    run.shop.forEach((w, i) => {
      if (w.sold || w.price > run.gold) return;
      const gain = valueOf(run, run.withItem(w.inst), style) - now + (run.twinOf(w.inst) ? 1e-6 : 0);
      if (gain > bestGain) { bestGain = gain; best = i; }
    });
    if (best >= 0) { run.buy(best, run.bagFull() ? 'equip' : 'bag'); tidy(run, style); bought = true; }
  }
  run.leaveShop();
}

// Take the best of the loot by `style`: equip it if it helps, else bag it.
export function takeLoot(run, style, random = false) {
  while (run.loot) {
    let best = run.loot[0], bestS = -Infinity;
    if (random) best = run.loot[run.round % run.loot.length];
    else {
      for (const inst of run.loot) {
        const s = valueOf(run, run.withItem(inst), style) + (run.twinOf(inst) ? 1e-6 : 0);
        if (s > bestS) { bestS = s; best = inst; }
      }
    }
    const gain = valueOf(run, run.withItem(best), style) > valueOf(run, run.equip, style);
    run.takeLoot(best, gain ? 'equip' : run.bagFull() ? 'discard' : 'bag');
  }
}

// A careful hunter: the toughest tier they'd beat at least 7 times in 10.
export function smart(run) {
  const me = run.fighter();
  let pick = 'easy';
  for (const m of run.offers) {
    let w = 0;
    for (let k = 0; k < 10; k++) if (simulate(me, mobFighter(m, run.round), 1000 + k).winner === 0) w++;
    if (w >= 7) pick = MOBS[m].tier;
  }
  return pick;
}

// Play one run. `endless` keeps playing past a Crown or the last life, so
// tuning sees builds on every day. `onRound(run)` runs before each fight.
export function playRun(seed, policy, style = 'greedy', { endless = false, random = false, shopping = true, onRound } = {}) {
  const run = new Run(seed);
  if (endless) run.lives = 99;
  const tierWins = {};
  let guard = 0;
  while (!run.over && guard++ < 60) {
    onRound?.(run);
    const mob = run.isDuel ? undefined : run.offers.find((m) => MOBS[m].tier === policy(run)) || run.offers[0];
    run.fight(mob);
    const out = run.resolve();
    if (endless && run.crown) { run.crown = false; run.over = false; }
    const key = run.isDuel ? `D${run.day}duel` : `D${run.day}${{ easy: 'E', normal: 'N', elite: 'X' }[MOBS[mob].tier]}`;
    tierWins[key] = tierWins[key] || [0, 0];
    tierWins[key][0] += out.won ? 1 : 0;
    tierWins[key][1]++;
    takeLoot(run, style, random);
    if (!random) tidy(run, style);
    if (run.shop) { if (shopping && !random) shop(run, style); else run.leaveShop(); }
    if (run.event) run.endEvent(); // bots walk past events
    if (!run.over) run.next();
  }
  return { run, crown: run.crown, round: run.round, tierWins, wins: run.duelWins };
}

// src/mobpower.js holds both tables; each tuner rewrites its own and keeps the other.
export function writePowers(MOB_POWER, GHOST_POWER, days) {
  const ids = Object.keys(MOB_POWER).filter((id) => MOBS[id]);
  fs.writeFileSync(new URL('../src/mobpower.js', import.meta.url), `// Generated by tools/tune.mjs: each monster's power on days 1-${days}.
// A monster's HP and damage are multiplied by its power for the day it's
// fought on, so any biome can land on any day and still hit its tier's odds.
export const MOB_POWER = {
${ids.map((id) => `  ${id}: [${MOB_POWER[id].join(', ')}],`).join('\n')}
};

// Generated by tools/tune-duels.mjs: duel rivals' HP and damage per day.
export const GHOST_POWER = [${GHOST_POWER.join(', ')}];
`);
}

export { ROUNDS_PER_DAY };
