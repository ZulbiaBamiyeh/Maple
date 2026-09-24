// Per-monster difficulty: play careful bot runs; at each hunt, fight every
// monster of that day with the current build and report average win rates.
// node tools/probe.mjs [runs]
import { Run } from '../src/game.js';
import { MOBS, DAYS } from '../src/data.js';
import { simulate } from '../src/sim.js';
import { mobFighter } from '../src/items.js';

const N = +(process.argv[2] || 60);
const score = (h) => h.dps * h.ehp;
const wins = {};

function winRate(run, mob, k = 6) {
  const me = run.fighter();
  let w = 0;
  for (let i = 0; i < k; i++) if (simulate(me, mobFighter(mob, run.round), 900 + i).winner === 0) w++;
  return w / k;
}

for (let seed = 1; seed <= N; seed++) {
  const run = new Run(seed * 131 + 7);
  let guard = 0;
  while (!run.over && guard++ < 40) {
    let mob;
    if (!run.isDuel) {
      const day = DAYS[run.day - 1];
      const rates = {};
      for (const ids of Object.values(day.tiers)) for (const id of ids) {
        rates[id] = winRate(run, id);
        (wins[id] = wins[id] || []).push(rates[id]);
      }
      // careful player: hardest offer with >= 70% odds, else the easiest
      mob = run.offers[0];
      for (const id of run.offers) if (rates[id] >= 0.7) mob = id;
    }
    run.fight(mob);
    run.resolve();
    while (run.loot) {
      let best = null, bestS = -1;
      for (const inst of run.loot) {
        const s = score(run.headline(run.withItem(inst)));
        if (s > bestS) { bestS = s; best = inst; }
      }
      run.takeLoot(best, bestS > score(run.headline()) ? 'equip' : run.bagFull() ? 'discard' : 'bag');
    }
    if (!run.over) run.next();
  }
}
for (const [d, day] of DAYS.entries()) {
  const row = Object.entries(day.tiers).map(([t, ids]) => ids.map((id) => {
    const a = wins[id] || [];
    const pct = a.length ? Math.round((100 * a.reduce((x, y) => x + y, 0)) / a.length) : '--';
    return `${t[0].toUpperCase()} ${MOBS[id].name} ${pct}%`;
  }).join(' | ')).join(' | ');
  console.log(`Day ${d + 1}: ${row}`);
}
