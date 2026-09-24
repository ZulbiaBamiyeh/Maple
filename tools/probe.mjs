// Per-monster difficulty: play careful bot runs; at each hunt, fight every
// monster of that day's biome with the current build and report average win
// rates, per monster and per day.
// node tools/probe.mjs [runs]
import { Run } from '../src/game.js';
import { MOBS, BIOMES } from '../src/data.js';
import { simulate } from '../src/sim.js';
import { mobFighter } from '../src/items.js';

const N = +(process.argv[2] || 60);
const score = (h) => h.dps * h.ehp;
const wins = {};
const byDay = {};

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
      const day = run.dayInfo();
      const rates = {};
      for (const ids of Object.values(day.tiers)) for (const id of ids) {
        rates[id] = winRate(run, id);
        (wins[id] = wins[id] || []).push(rates[id]);
        const k = `${MOBS[id].tier}:${run.day}`;
        (byDay[k] = byDay[k] || []).push(rates[id]);
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
const avg = (a) => (a && a.length ? Math.round((100 * a.reduce((x, y) => x + y, 0)) / a.length) + '%' : '--');
for (const b of BIOMES) {
  const row = Object.entries(b.tiers).map(([t, ids]) => ids.map((id) => `${t[0].toUpperCase()} ${MOBS[id].name} ${avg(wins[id])}`).join(' | ')).join(' | ');
  console.log(`${b.name}: ${row}`);
}
for (const t of ['easy', 'normal', 'elite']) {
  console.log(`${t.padEnd(6)} by day: ${[1, 2, 3, 4, 5].map((d) => avg(byDay[`${t}:${d}`])).join('  ')}`);
}
