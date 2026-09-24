// The run state machine: full runs complete, invariants hold, saves round-trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../src/game.js';
import { MOBS, BAG_SIZE, LIVES, ROUNDS, SLOTS, GOLD_WIN } from '../src/data.js';

// A simple player: alternates tiers, equips drops that help, bags or scraps the rest,
// and scrolls whatever it can afford.
function play(run, step) {
  let guard = 0;
  while (!run.over && guard++ < 50) {
    const tier = ['easy', 'normal', 'elite'][run.round % 3];
    const mob = run.isDuel ? undefined : run.offers.find((m) => MOBS[m].tier === tier);
    run.fight(mob);
    run.resolve();
    step?.(run);
    if (run.loot) {
      const inst = run.loot[run.round % 3];
      const better = run.headline(run.withItem(inst)).dps >= run.headline().dps;
      run.takeLoot(inst, better ? 'equip' : run.bagFull() ? 'scrap' : 'bag');
    }
    for (const it of [...run.bag, ...Object.values(run.equip)].filter(Boolean)) {
      if (run.gold >= 2) run.scroll(it.uid, 'sure');
    }
    step?.(run);
    if (!run.over) run.next();
  }
  return run;
}

function invariants(run) {
  assert.ok(run.bag.length <= BAG_SIZE, 'bag overflow');
  assert.ok(run.lives >= 0 && run.lives <= LIVES, 'lives out of range');
  assert.ok(run.gold >= 0, 'negative gold');
  assert.ok(run.round >= 1 && run.round <= ROUNDS, 'round out of range');
  for (const s of SLOTS) if (run.equip[s]) assert.ok(run.equip[s].upgrades.used <= 3, 'too many scrolls');
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

test('winning pays gold by tier', () => {
  const run = new Run(11);
  const mob = run.offers.find((m) => MOBS[m].tier === 'easy');
  const before = run.gold;
  run.fight(mob);
  const out = run.resolve();
  if (out.won) assert.equal(run.gold - before, GOLD_WIN.easy);
  else assert.equal(run.gold - before, 2);
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

test('a shop opens before every duel, stocked only with shop items', async () => {
  const { ITEMS, DUEL_ROUNDS, SHOP_SIZE } = await import('../src/data.js');
  for (let seed = 1; seed <= 20; seed++) {
    const run = new Run(seed);
    assert.equal(run.shop, null);
    for (const r of DUEL_ROUNDS) {
      run.round = r;
      run.rollRound();
      assert.equal(run.shop.length, SHOP_SIZE);
      assert.equal(new Set(run.shop.map((w) => w.inst.item)).size, SHOP_SIZE, 'duplicate wares');
      for (const w of run.shop) assert.ok(ITEMS[w.inst.item].shop, `${w.inst.item} is not a shop item`);
    }
    for (const m of Object.values(MOBS)) for (const d of m.drops) assert.ok(!ITEMS[d].shop, `${d} drops from a mob`);
  }
});

test('buying costs gold, needs enough of it, and handles a full bag', () => {
  const run = new Run(8);
  run.round = 3;
  run.rollRound();
  run.gold = 0;
  assert.equal(run.buy(0, 'bag'), false);
  run.gold = 100;
  const price = run.shop[0].price;
  assert.equal(run.buy(0, 'bag'), true);
  assert.equal(run.gold, 100 - price);
  assert.equal(run.buy(0, 'bag'), false, 'bought the same ware twice');
  while (!run.bagFull()) run.bag.push({ ...run.bag[0], uid: 'x' + run.bag.length });
  assert.equal(run.buy(1, 'bag'), false, 'bought into a full bag');
  const w = run.shop[1];
  assert.equal(run.buy(1, 'equip'), true);
  assert.equal(run.equip[run.slotFor(w.inst)]?.uid ?? Object.values(run.equip).find((x) => x?.uid === w.inst.uid)?.uid, w.inst.uid);
  const json = JSON.parse(JSON.stringify(run));
  assert.equal(Run.fromJSON(json).shop[1].sold, true);
});
