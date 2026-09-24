// Find each monster's power multiplier (HP and damage) for every day it can be
// fought on, since biomes land on a random day each run. Rewrites MOB_POWER in
// src/mobpower.js. Normal and Elite are tuned against careful players' builds
// of that day (they hunt carefully, shop and merge). Easy is tuned against a
// struggling player (easy hunts only, random drops, no shop), so a weak run can
// always catch up on Easy monsters.
// node tools/tune.mjs [runs] [passes]
import { MOBS, BIOMES, MOB_POWER, DAYS_IN_RUN } from '../src/data.js';
import { GHOST_POWER } from '../src/mobpower.js';
import { simulate } from '../src/sim.js';
import { mobFighter } from '../src/items.js';
import { playRun, smart, writePowers } from './bots.mjs';

const N = +(process.argv[2] || 40);
const PASSES = +(process.argv[3] || 2);
const TARGET = { easy: 0.8, normal: 0.62, elite: 0.42 };
const ids = BIOMES.flatMap((b) => Object.values(b.tiers).flat());

// 1. builds per day from careful and struggling runs, played through all days
function collect(weak) {
  const builds = {}; // day -> [{ me, round }]
  for (let seed = 1; seed <= N; seed++) {
    playRun(seed * 977 + (weak ? 11 : 3), weak ? () => 'easy' : smart, 'greedy', {
      endless: true, random: weak, shopping: !weak,
      onRound: (run) => { if (!run.isDuel) (builds[run.day] = builds[run.day] || []).push({ me: run.fighter(), round: run.round }); },
    });
  }
  return builds;
}

// 2. binary-search each monster's power on each day
function rate(id, day, power, sample) {
  MOB_POWER[id][day - 1] = power;
  let w = 0, n = 0;
  for (const b of sample) {
    const foe = mobFighter(id, b.round);
    for (let k = 0; k < 4; k++, n++) if (simulate(b.me, foe, 700 + k).winner === 0) w++;
  }
  return n ? w / n : 0;
}

// Start from the last tables; a new day starts from the day before it.
for (const id of ids) {
  const row = MOB_POWER[id] || [1];
  MOB_POWER[id] = Array.from({ length: DAYS_IN_RUN }, (_, d) => row[Math.min(d, row.length - 1)]);
}
for (let pass = 1; pass <= PASSES; pass++) {
  // Careful players pick hunts by these powers, so later passes see truer builds.
  const careful = collect(false);
  const weak = collect(true);
  for (const id of ids) {
    const tier = MOBS[id].tier;
    for (let day = 1; day <= DAYS_IN_RUN; day++) {
      const sample = ((tier === 'easy' ? weak : careful)[day] || []).filter((_, i) => i % 2 === 0);
      let lo = 0.1, hi = 8;
      for (let it = 0; it < 11; it++) {
        const mid = (lo + hi) / 2;
        if (rate(id, day, mid, sample) > TARGET[tier]) lo = mid; else hi = mid;
      }
      MOB_POWER[id][day - 1] = Math.round(((lo + hi) / 2) * 100) / 100;
    }
    console.error(`pass ${pass} ${tier.padEnd(6)} ${MOBS[id].name.padEnd(18)} ${MOB_POWER[id].join(' ')}`);
  }
}
writePowers(MOB_POWER, GHOST_POWER, DAYS_IN_RUN);
console.error('wrote src/mobpower.js');
