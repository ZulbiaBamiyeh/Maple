// M1 acceptance: determinism, and the poison-dagger counter triangle.
// Run with: node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/sim.js';
import { heroFighter, mobFighter, hydrate, headline } from '../src/items.js';
import { GHOSTS, MOBS } from '../src/data.js';

const build = (round, equip) => heroFighter({
  name: 'test', round,
  equip: Object.fromEntries(Object.entries(equip).map(([s, i]) => [s, hydrate({ item: i, rarity: 'common' }, round, 0)])),
});

const poisonDagger = build(5, { weapon: 'spore_shiv', trinket1: 'viper_fang', hat: 'spore_hood', shoes: 'spore_boots' });
const glassCannon = build(5, { weapon: 'wooden_sword', top: 'linen_shirt', gloves: 'gel_gloves' });

function tank() {
  const f = build(5, { weapon: 'boulder_maul', top: 'golem_plate', hat: 'golem_helm' });
  f.def = 8;
  f.resist = 0.5;
  return f;
}

test('same builds and seed give the same fight', () => {
  const a = simulate(poisonDagger, glassCannon, 1234);
  const b = simulate(poisonDagger, glassCannon, 1234);
  assert.deepEqual(a.events, b.events);
  assert.equal(a.winner, b.winner);
  const c = simulate(poisonDagger, glassCannon, 999);
  assert.notDeepEqual(a.events, c.events);
});

test('poison dagger beats a build with no Def', () => {
  let wins = 0;
  for (let s = 0; s < 50; s++) if (simulate(poisonDagger, glassCannon, s).winner === 0) wins++;
  assert.ok(wins >= 35, `poison dagger won only ${wins}/50`);
});

test('poison dagger loses to a Def 8 + Resist tank', () => {
  let losses = 0;
  for (let s = 0; s < 50; s++) if (simulate(poisonDagger, tank(), s).winner === 1) losses++;
  assert.ok(losses >= 35, `poison dagger lost only ${losses}/50`);
});

test('every ghost and mob fights to a result', () => {
  for (const gh of GHOSTS) {
    const f = heroFighter({ name: gh.name, round: gh.round,
      equip: Object.fromEntries(Object.entries(gh.equip).map(([s, i]) => [s, hydrate(i, gh.round)])) });
    for (const id of Object.keys(MOBS)) {
      const r = simulate(f, mobFighter(id, gh.round), 7);
      assert.ok([0, 1, -1].includes(r.winner));
      assert.ok(r.frames.length > 1);
    }
    const h = headline(f);
    assert.ok(h.dps > 0 && h.ehp > 0);
  }
});

test('stun cannot chain: 2s immunity after a stun ends', () => {
  const stunner = build(1, { weapon: 'boulder_maul', trinket1: 'metronome' });
  stunner.onHit = [{ chance: 1, apply: 'stun', duration: 0.8 }];
  stunner.weapon.interval = 0.3;
  const r = simulate(stunner, glassCannon, 3);
  const stuns = r.events.filter((e) => e.type === 'status' && e.status === 'stun' && e.dst === 1).map((e) => e.t);
  for (let i = 1; i < stuns.length; i++) assert.ok(stuns[i] - stuns[i - 1] >= 16 + 40, `stuns too close: ${stuns}`);
});
