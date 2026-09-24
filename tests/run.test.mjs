// The run state machine: full runs complete, invariants hold, saves round-trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../src/game.js';
import { MOBS, BAG_SIZE, LIVES, ROUNDS } from '../src/data.js';

// A simple player: mostly easy hunts, equips drops that help, bags or leaves the rest.
function play(run, step) {
  let guard = 0;
  while (!run.over && guard++ < 50) {
    const tier = run.round % 3 === 1 ? 'normal' : 'easy';
    const mob = run.isDuel ? undefined : run.offers.find((m) => MOBS[m].tier === tier);
    run.fight(mob);
    run.resolve();
    step?.(run);
    if (run.loot) {
      const score = (h) => h.dps * h.ehp;
      const inst = run.loot.reduce((a, b) => (score(run.headline(run.withItem(b))) > score(run.headline(run.withItem(a))) ? b : a));
      const better = score(run.headline(run.withItem(inst))) >= score(run.headline());
      run.takeLoot(inst, better ? 'equip' : run.bagFull() ? 'discard' : 'bag');
    }
    step?.(run);
    if (!run.over) run.next();
  }
  return run;
}

function invariants(run) {
  assert.ok(run.bag.length <= BAG_SIZE, 'bag overflow');
  assert.ok(run.lives >= 0 && run.lives <= LIVES, 'lives out of range');
  assert.ok(run.round >= 1 && run.round <= ROUNDS, 'round out of range');
  const uids = [...run.bag, ...Object.values(run.equip)].filter(Boolean).map((i) => i.uid);
  assert.equal(new Set(uids).size, uids.length, 'an item is in two places');
}

test('full runs finish on many seeds without breaking invariants', () => {
  let crowns = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const run = play(new Run(seed), invariants);
    assert.ok(run.over, `seed ${seed} never ended`);
    assert.ok(run.lives === 0 || run.round === ROUNDS, `seed ${seed} ended early with lives left`);
    if (run.crown) crowns++;
    assert.equal(run.history.length, run.wins + run.losses + run.history.filter((h) => h.result === 'D').length);
  }
  assert.ok(crowns > 0, 'nobody ever won a Crown');
});

test('save round-trip mid-run', () => {
  const run = new Run(123);
  // play a few rounds
  for (let i = 0; i < 4 && !run.over; i++) {
    run.fight(run.isDuel ? undefined : run.offers[0]);
    run.resolve();
    if (run.loot) run.takeLoot(run.loot[0], 'bag');
    if (!run.over) run.next();
  }
  const json = JSON.parse(JSON.stringify(run));
  const back = Run.fromJSON(json);
  assert.deepEqual(JSON.parse(JSON.stringify(back)), json);
  // both continue identically
  for (const r of [run, back]) {
    r.fight(r.isDuel ? undefined : r.offers[1]);
    r.resolve();
  }
  assert.equal(back.lastFight.result.winner, run.lastFight.result.winner);
  assert.deepEqual(back.lastFight.result.events, run.lastFight.result.events);
  assert.equal(Run.fromJSON({ v: 999 }), null);
});

test('odds estimates are in range and favour the weaker mob', () => {
  const run = new Run(5);
  const easy = run.offers.find((m) => MOBS[m].tier === 'easy');
  const elite = run.offers.find((m) => MOBS[m].tier === 'elite');
  const pe = run.mobOdds(easy);
  const px = run.mobOdds(elite);
  assert.ok(pe >= 0 && pe <= 1 && px >= 0 && px <= 1);
  assert.ok(pe > px, `easy ${pe} should beat elite ${px}`);
});

test('your saved build comes back as a duel ghost in later runs', async () => {
  const { savedGhosts } = await import('../src/game.js');
  const a = new Run(900);
  while (!a.isDuel) { a.fight(a.offers[0]); a.resolve(); if (a.loot) a.takeLoot(a.loot[0], 'equip'); a.next(); }
  const snap = JSON.parse(JSON.stringify(a.snapshot()));
  savedGhosts.push(snap);
  let met = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const b = new Run(seed);
    b.round = 3;
    b.rollRound();
    if (b.ghost.mine) {
      met++;
      assert.equal(b.ghost.name, snap.name);
      b.fight();
      assert.ok([0, 1, -1].includes(b.lastFight.result.winner));
    }
  }
  savedGhosts.length = 0;
  assert.ok(met > 5 && met < 35, `met own ghost ${met}/40 times`);
});

test('discarding frees bag space; leaving loot takes nothing', () => {
  const run = new Run(21);
  run.fight(run.offers[0]);
  run.resolve();
  if (run.loot) {
    const before = run.bag.length;
    run.takeLoot(run.loot[0], 'discard');
    assert.equal(run.bag.length, before);
    assert.equal(run.loot, null);
  }
  const top = run.equip.top;
  run.discard(top.uid);
  assert.equal(run.equip.top, null);
});

test('losing a hunt costs no life; losing a duel does', () => {
  let huntLosses = 0, duelLosses = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = new Run(seed);
    while (!run.over) {
      const before = run.lives;
      const elite = run.isDuel ? undefined : run.offers[2];
      run.fight(elite);
      const out = run.resolve();
      if (!out.won && !out.draw) {
        if (run.lastFight.duel) { duelLosses++; assert.equal(run.lives, before - 1); }
        else { huntLosses++; assert.equal(run.lives, before); assert.equal(run.loot, null); }
      }
      if (run.loot) run.takeLoot(run.loot[0], 'equip');
      if (!run.over) run.next();
    }
  }
  assert.ok(huntLosses > 0 && duelLosses > 0);
});

test('perks come from rarity: none on commons, some on rares, always on epics', async () => {
  const { rollInstance } = await import('../src/items.js');
  const { Rng } = await import('../src/rng.js');
  const r = new Rng(3);
  const roll = (rarity) => Array.from({ length: 200 }, () => rollInstance('spore_shiv', rarity, 5, r).perks.length);
  assert.ok(roll('common').every((n) => n === 0));
  const rare = roll('rare');
  const share = rare.filter((n) => n > 0).length / rare.length;
  assert.ok(share > 0.3 && share < 0.5, `rare perk share ${share}`);
  assert.ok(roll('epic').every((n) => n >= 1));
});
