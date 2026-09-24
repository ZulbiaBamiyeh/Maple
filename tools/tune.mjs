// Find each monster's power multiplier (HP and damage) so builds on that
// monster's day hit a target win rate. Prints a MOB_POWER table.
// Normal and Elite are tuned against careful players' builds. Easy is tuned
// against a struggling player (easy hunts only, random drops), so a weak run
// can always catch up on Easy monsters.
// node tools/tune.mjs [runs]
import { Run } from '../src/game.js';
import { MOBS, DAYS, MOB_POWER } from '../src/data.js';
import { simulate } from '../src/sim.js';
import { mobFighter } from '../src/items.js';

const N = +(process.argv[2] || 40);
const TARGET = { easy: 0.8, normal: 0.62, elite: 0.42 };
const FIXED = new Set(['tusk_boar', 'frost_wisp']); // day 1 normals are fine as they are
const score = (h) => h.dps * h.ehp;

// 1. collect builds from careful runs and from struggling runs
function collect(weak) {
  const builds = {}; // day -> [{ me, round }]
  for (let seed = 1; seed <= N; seed++) {
    const run = new Run(seed * 977 + (weak ? 11 : 3));
    let guard = 0;
    while (!run.over && guard++ < 40) {
      let mob;
      if (!run.isDuel) {
        (builds[run.day] = builds[run.day] || []).push({ me: run.fighter(), round: run.round });
        const me = run.fighter();
        mob = run.offers.find((id) => MOBS[id].tier === 'easy');
        if (!weak) {
          mob = run.offers[0];
          for (const id of run.offers) {
            let w = 0;
            for (let k = 0; k < 6; k++) if (simulate(me, mobFighter(id, run.round), 500 + k).winner === 0) w++;
            if (w >= 5) mob = id;
          }
        }
      }
      run.fight(mob);
      run.resolve();
      while (run.loot) {
        let best = null, bestS = -1;
        for (const inst of run.loot) {
          const s = score(run.headline(run.withItem(inst)));
          if (s > bestS) { bestS = s; best = inst; }
        }
        if (weak) best = run.loot[(seed + run.round) % run.loot.length]; // no idea what's good
        const s = score(run.headline(run.withItem(best)));
        run.takeLoot(best, s > score(run.headline()) ? 'equip' : run.bagFull() ? 'discard' : 'bag');
      }
      if (!run.over) run.next();
    }
  }
  return builds;
}
const careful = collect(false);
const weak = collect(true);

// 2. binary-search each monster's power
function rate(id, day, power) {
  MOB_POWER[id] = power;
  const sample = (MOBS[id].tier === 'easy' ? weak : careful)[day] || [];
  let w = 0, n = 0;
  for (const b of sample) {
    const foe = mobFighter(id, b.round);
    for (let k = 0; k < 4; k++, n++) if (simulate(b.me, foe, 700 + k).winner === 0) w++;
  }
  return n ? w / n : 0;
}
const out = {};
for (const [i, day] of DAYS.entries()) {
  for (const [tier, ids] of Object.entries(day.tiers)) {
    for (const id of ids) {
      if (FIXED.has(id)) continue;
      let lo = 0.2, hi = 4;
      for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) / 2;
        if (rate(id, i + 1, mid) > TARGET[tier]) lo = mid; else hi = mid;
      }
      out[id] = Math.round(((lo + hi) / 2) * 100) / 100;
      MOB_POWER[id] = out[id];
      console.error(`day ${i + 1} ${tier.padEnd(6)} ${MOBS[id].name.padEnd(18)} power ${out[id]}`);
    }
  }
}
console.log(JSON.stringify(out));
