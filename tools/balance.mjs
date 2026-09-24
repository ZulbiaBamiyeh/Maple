// Bot runs for tuning: node tools/balance.mjs [runs] [fighter-runs]
// 'smart' and the tier bots are greedy: they judge gear by DPS x EHP only.
// 'fighter' hunts like smart but judges gear by practice fights, so it sees
// sets, keystones, relics and perks. If it clearly beats 'smart', builds and
// combos matter beyond raw numbers.
import { playRun, smart } from './bots.mjs';

const N = +(process.argv[2] || 300);
const NF = +(process.argv[3] || 60);

const policies = {
  smart,
  easy: () => 'easy',
  normal: () => 'normal',
  elite: () => 'elite',
  mixed: (run) => (run.round <= 2 ? 'easy' : run.round <= 5 ? 'normal' : 'elite'),
  ramp: (run) => (run.round === 1 ? 'easy' : run.round <= 4 ? 'normal' : 'elite'),
};
const runs = [...Object.entries(policies).map(([n, p]) => [n, p, 'greedy']), ['fighter', smart, 'fighter']];
for (const [name, pol, style] of runs) {
  let crowns = 0, rounds = 0, wins = 0;
  const agg = {};
  for (let s = 0; s < N; s++) {
    if (style === 'fighter' && s >= NF) break;
    const r = playRun(s * 7919 + 1, pol, style);
    crowns += r.crown; rounds += r.round; wins += r.wins;
    for (const [k, [w, n]] of Object.entries(r.tierWins)) { agg[k] = agg[k] || [0, 0]; agg[k][0] += w; agg[k][1] += n; }
  }
  const tw = Object.entries(agg).sort().map(([k, [w, n]]) => `${k} ${Math.round((100 * w) / n)}%`).join(' ');
  const n = style === 'fighter' ? Math.min(N, NF) : N;
  console.log(`${name.padEnd(7)} crown ${Math.round((100 * crowns) / n)}%  duel wins ${(wins / n).toFixed(2)}  avg round ${(rounds / n).toFixed(1)}  (${n} runs)\n   ${tw}`);
}
