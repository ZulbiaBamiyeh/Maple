// Find each day's GHOST_POWER: how much the hand-written duel rivals' HP and
// damage are multiplied, so a careful player (who hunts, shops and merges)
// wins about 60% of duels on every day. With 5 wins needed before 3 losses,
// that's a Crown rate a little over 40%. Rewrites GHOST_POWER in src/mobpower.js.
// node tools/tune-duels.mjs [runs]
import { GHOSTS, DUEL_ROUNDS, DAYS_IN_RUN, MOB_POWER } from '../src/data.js';
import { GHOST_POWER } from '../src/mobpower.js';
import { hydrate } from '../src/items.js';
import { duelFighter } from '../src/game.js';
import { simulate } from '../src/sim.js';
import { playRun, smart, writePowers } from './bots.mjs';

const N = +(process.argv[2] || 60);
// The first duel is a little gentler. The rest aim at 52% here, because
// these builds come from runs that never end: in real runs the weaker builds
// are knocked out along the way, and the survivors land near 60%.
const TARGET = [0.62, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52];

// Careful players' builds as they walk into each duel.
const builds = {};
for (let seed = 1; seed <= N; seed++) {
  playRun(seed * 613 + 5, smart, 'greedy', {
    endless: true,
    onRound: (run) => { if (run.isDuel) (builds[run.day] = builds[run.day] || []).push(run.fighter()); },
  });
}

for (let day = 1; day <= DAYS_IN_RUN; day++) {
  const round = DUEL_ROUNDS[day - 1];
  const rivals = GHOSTS.filter((g) => g.round === round).map((g) => ({
    ...g, equip: Object.fromEntries(Object.entries(g.equip).map(([s, i]) => [s, i ? hydrate(i, round, 0) : null])),
  }));
  const rate = (p) => {
    GHOST_POWER[day - 1] = p;
    let w = 0, n = 0;
    for (const me of builds[day] || []) {
      for (const g of rivals) {
        const foe = duelFighter(g, round);
        for (let k = 0; k < 3; k++, n++) {
          const r = simulate(me, foe, 900 + k).winner;
          w += r === 0 ? 1 : r === -1 ? 0.5 : 0;
        }
      }
    }
    return n ? w / n : 0;
  };
  let lo = 0.3, hi = 6;
  for (let it = 0; it < 12; it++) {
    const mid = (lo + hi) / 2;
    if (rate(mid) > TARGET[day - 1]) lo = mid; else hi = mid;
  }
  GHOST_POWER[day - 1] = Math.round(((lo + hi) / 2) * 100) / 100;
  console.error(`day ${day}: ${builds[day]?.length || 0} builds, rival power ${GHOST_POWER[day - 1]}`);
}
writePowers(MOB_POWER, GHOST_POWER, DAYS_IN_RUN);
console.error('wrote src/mobpower.js');
