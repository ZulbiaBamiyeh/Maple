// Bot runs for tuning: node tools/balance.mjs [runs]
import { Run } from '../src/game.js';
import { MOBS } from '../src/data.js';
import { simulate } from '../src/sim.js';
import { mobFighter } from '../src/items.js';

const N = +(process.argv[2] || 300);
const score = (h) => h.dps * h.ehp;

function playRun(seed, policy) {
  const run = new Run(seed);
  const tierWins = {};
  while (!run.over) {
    let mob;
    if (!run.isDuel) {
      const tier = policy(run);
      mob = run.offers.find((m) => MOBS[m].tier === tier);
    }
    run.fight(mob);
    const out = run.resolve();
    const key = run.isDuel ? `duel${run.round}` : `${MOBS[mob].tier}`;
    tierWins[key] = tierWins[key] || [0, 0];
    tierWins[key][0] += out.won ? 1 : 0;
    tierWins[key][1]++;
    if (run.loot) {
      let best = null, bestS = -1;
      for (const inst of run.loot) {
        const s = score(run.headline(run.withItem(inst)));
        if (s > bestS) { bestS = s; best = inst; }
      }
      const gain = bestS > score(run.headline());
      run.takeLoot(best, gain ? 'equip' : run.bagFull() ? 'scrap' : 'bag');
    }
    if (!run.over) run.next();
  }
  return { crown: run.crown, round: run.round, tierWins, h: run.headline() };
}

// A careful player: the toughest tier they'd beat most of the time.
function smart(run) {
  const me = run.fighter();
  let pick = 'easy';
  for (const m of run.offers) {
    let w = 0;
    for (let k = 0; k < 10; k++) if (simulate(me, mobFighter(m, run.round), 1000 + k).winner === 0) w++;
    if (w >= 7) pick = MOBS[m].tier;
  }
  return pick;
}

const policies = {
  smart,
  easy: () => 'easy',
  normal: () => 'normal',
  elite: () => 'elite',
  mixed: (run) => (run.round <= 2 ? 'easy' : run.round <= 5 ? 'normal' : 'elite'),
  ramp: (run) => (run.round === 1 ? 'easy' : run.round <= 4 ? 'normal' : 'elite'),
};
for (const [name, pol] of Object.entries(policies)) {
  let crowns = 0, rounds = 0;
  const agg = {};
  for (let s = 0; s < N; s++) {
    const r = playRun(s * 7919 + 1, pol);
    crowns += r.crown; rounds += r.round;
    for (const [k, [w, n]] of Object.entries(r.tierWins)) { agg[k] = agg[k] || [0, 0]; agg[k][0] += w; agg[k][1] += n; }
  }
  const tw = Object.entries(agg).map(([k, [w, n]]) => `${k} ${Math.round((100 * w) / n)}%`).join('  ');
  console.log(`${name.padEnd(7)} crown ${Math.round((100 * crowns) / N)}%  avg round ${(rounds / N).toFixed(1)}  | ${tw}`);
}
