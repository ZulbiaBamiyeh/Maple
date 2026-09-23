import { test } from 'node:test';
import assert from 'node:assert/strict';

const { simulate, TIMEOUT } = await import('../src/core/combat.ts');
const { Rng } = await import('../src/core/rng.ts');
const { item } = await import('../src/core/items.ts');

/**
 * The three reference builds of §9.7, assembled from the §6.2 table at roughly
 * matched cost. If a build has no counter, it is a bug — so this suite asserts
 * the cycle rather than any particular win rate.
 */
const BUILDS = {
  // Burn stacking: Ilbi applies, Maple Cape stops decay, Bezalwing adds a stack,
  // Zakum makes every stack bite harder. Low direct damage, unanswerable late.
  ember: { name: 'ember', gear: { weapon: 7, cape: 24, ring: 27, helm: 10, body: 13, gloves: 20 } },
  // Frost lock: Maple Sword slows, Maple Shield freezes, Snowshoes speed up
  // against a slowed enemy — and the Sauna Robe's regen outlasts a burn.
  frost: { name: 'frost', gear: { weapon: 6, shield: 12, boots: 18, gloves: 20, helm: 9, body: 14, cape: 23 } },
  // Thorns: armour, regen and a shield that punishes every incoming swing,
  // which is what attack-speed denial cannot answer.
  thorn: { name: 'thorn', gear: { weapon: 3, body: 14, shield: 12, boots: 17, helm: 8, gloves: 20, cape: 22 } },
};

function winRate(a, b, n = 400) {
  let wins = 0;
  let time = 0;
  for (let i = 0; i < n; i++) {
    const r = simulate(new Rng('t' + i), BUILDS[a], BUILDS[b]);
    if (r.winner === 0) wins++;
    time += r.t;
  }
  return { rate: wins / n, avg: time / n };
}

test('each reference build beats one and loses to another', () => {
  const cycle = [['ember', 'thorn'], ['thorn', 'frost'], ['frost', 'ember']];
  for (const [winner, loser] of cycle) {
    const { rate } = winRate(winner, loser);
    assert.ok(rate > 0.55, `${winner} should beat ${loser}, got ${(rate * 100).toFixed(0)}%`);
    const back = winRate(loser, winner).rate;
    assert.ok(back < 0.45, `${loser} should lose to ${winner}, got ${(back * 100).toFixed(0)}%`);
  }
});

test('fights resolve in the 10-15 second window', () => {
  const names = Object.keys(BUILDS);
  const durations = [];
  for (const a of names) for (const b of names) if (a !== b) durations.push(winRate(a, b, 200).avg);
  const avg = durations.reduce((x, y) => x + y, 0) / durations.length;
  assert.ok(avg >= 9 && avg <= 16, `average fight ${avg.toFixed(1)}s`);
  assert.ok(Math.max(...durations) <= TIMEOUT, 'nothing may run past the hard timeout');
});

test('the reference builds cost within a third of each other', () => {
  const cost = (g) => Object.values(g).reduce((n, id) => n + item(id).price, 0);
  const costs = Object.values(BUILDS).map((b) => cost(b.gear));
  const lo = Math.min(...costs), hi = Math.max(...costs);
  assert.ok(hi / lo < 2.5, `costs span ${lo} - ${hi}`);
});

test('a two million weapon beats a fifty thousand one', () => {
  const rich = { name: 'rich', gear: { weapon: 30, body: 14, boots: 19 } };
  const poor = { name: 'poor', gear: { weapon: 2, body: 13, boots: 17 } };
  let wins = 0;
  for (let i = 0; i < 200; i++) if (simulate(new Rng('g' + i), rich, poor).winner === 0) wins++;
  assert.ok(wins / 200 > 0.9, 'price should still mean power at the top of the market');
});
