// The run state machine: full runs complete, invariants hold, saves round-trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../src/game.js';
import { MOBS, ITEMS, BIOMES, BIOME, CLASSIC_ORDER, MOB_POWER, DAYS_IN_RUN, BAG_SIZE, LIVES, ROUNDS, DUEL_ROUNDS, WIN_TARGET, SHOP_AFTER_DAYS, KEYSTONES, FAMILIES } from '../src/data.js';
import { rollInstance, heroFighter } from '../src/items.js';
import { simulate } from '../src/sim.js';
import { EVENTS, EVENTS_PER_RUN, planEvents, eventOptions, chooseEvent } from '../src/events.js';
import { playRun, smart } from '../tools/bots.mjs';

// A simple player: mostly easy hunts, equips drops that help, bags or leaves the rest.
function play(run, step) {
  let guard = 0;
  while (!run.over && guard++ < 50) {
    const tier = (run.round - 1) % 4 === 0 ? 'normal' : 'easy';
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
  for (let seed = 1; seed <= 60; seed++) {
    const run = play(new Run(seed), invariants);
    assert.ok(run.over, `seed ${seed} never ended`);
    assert.ok(run.lives === 0 || run.crown || run.round === ROUNDS, `seed ${seed} ended early with lives left and no Crown`);
    if (run.crown) assert.equal(run.duelWins, WIN_TARGET);
    assert.equal(run.history.length, run.wins + run.losses + run.history.filter((h) => h.result === 'D').length);
  }
});

test('a careful player can win the Crown', () => {
  let crowns = 0;
  for (let seed = 1; seed <= 12 && !crowns; seed++) if (playRun(seed * 31, smart).crown) crowns++;
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
    b.round = DUEL_ROUNDS[0];
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

test('a duel win adds to the record but drops no items', () => {
  let duelWins = 0;
  for (let seed = 1; seed <= 30 && duelWins < 3; seed++) {
    const run = new Run(seed);
    while (!run.over) {
      const duel = run.isDuel;
      const wins = run.wins;
      run.fight(duel ? undefined : run.offers[0]);
      const out = run.resolve();
      if (duel && out.won) { duelWins++; assert.equal(run.loot, null); assert.equal(run.wins, wins + 1); }
      if (run.loot) run.takeLoot(run.loot[0], 'equip');
      if (!run.over) run.next();
    }
  }
  assert.ok(duelWins >= 3);
});

test('each run draws its own biome order, with no biome twice', () => {
  const orders = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const run = new Run(seed);
    assert.equal(run.biomes.length, DAYS_IN_RUN);
    assert.equal(new Set(run.biomes).size, DAYS_IN_RUN, `seed ${seed} repeats a biome`);
    for (const id of run.biomes) assert.ok(BIOME[id], `unknown biome ${id}`);
    orders.add(run.biomes.join(','));
  }
  assert.ok(orders.size > 30, 'biome orders barely vary');
  // Every biome shows up somewhere, on more than one day.
  const days = {};
  for (let seed = 1; seed <= 200; seed++) new Run(seed).biomes.forEach((id, d) => (days[id] = days[id] || new Set()).add(d));
  for (const b of BIOMES) assert.ok(days[b.id]?.size >= 3, `${b.name} is stuck on too few days`);
});

test('hunt offers come from the day\'s biome, and saves keep the order', () => {
  const run = new Run(77);
  const tiers = run.dayInfo().tiers;
  for (const id of run.offers) assert.ok(tiers[MOBS[id].tier].includes(id));
  const back = Run.fromJSON(JSON.parse(JSON.stringify(run)));
  assert.deepEqual(back.biomes, run.biomes);
  // Saves from before biomes were shuffled keep the old five-day order.
  const old = JSON.parse(JSON.stringify(run));
  delete old.biomes;
  assert.deepEqual(Run.fromJSON(old).biomes, CLASSIC_ORDER);
});

test('every biome has monsters for every tier, and every monster has power for every day', () => {
  for (const b of BIOMES) {
    for (const t of ['easy', 'normal', 'elite']) {
      assert.ok(b.tiers[t].length >= 2, `${b.name} has too few ${t} monsters`);
      for (const id of b.tiers[t]) assert.equal(MOBS[id].tier, t, `${id} is filed under the wrong tier`);
    }
    for (const id of Object.values(b.tiers).flat()) {
      assert.equal(MOB_POWER[id]?.length, DAYS_IN_RUN, `${id} has no power table`);
      for (const drop of MOBS[id].drops) assert.ok(ITEMS[drop], `${id} drops unknown ${drop}`);
    }
  }
});

test('the Crown comes from duel wins, and the merchant opens after the right duels', () => {
  let shops = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const run = new Run(seed);
    let guard = 0;
    while (!run.over && guard++ < 50) {
      run.fight(run.isDuel ? undefined : run.offers.find((m) => MOBS[m].tier === 'easy'));
      const out = run.resolve();
      if (out.shop) {
        shops++;
        assert.ok(SHOP_AFTER_DAYS.includes(run.day), `shop on day ${run.day}`);
        assert.equal(run.shop.length, 5);
        // buying spends gold and places the item
        const w = run.shop.findIndex((x) => x.price <= run.gold);
        if (w >= 0 && !run.bagFull()) {
          const g = run.gold;
          assert.ok(run.buy(w, 'bag'));
          assert.equal(run.gold, g - run.shop[w].price);
          assert.ok(run.bag.includes(run.shop[w].inst));
        }
        run.leaveShop();
      }
      while (run.loot) run.takeLoot(run.loot[0], run.bagFull() ? 'discard' : 'bag');
      if (!run.over) run.next();
    }
    assert.ok(run.duelWins <= WIN_TARGET);
    assert.equal(run.crown, run.duelWins >= WIN_TARGET);
    assert.ok(run.gold >= 0);
  }
  assert.ok(shops > 0, 'the merchant never showed up');
});

test('two identical items merge one rarity up with a perk', () => {
  const run = new Run(9);
  const a = rollInstance('jelly_sabre', 'common', 4, run.rng);
  const b = rollInstance('jelly_sabre', 'common', 6, run.rng);
  run.equip.weapon = a;
  run.bag.push(b);
  assert.equal(run.twinOf(a), b);
  const m = run.merge(a.uid);
  assert.equal(m.rarity, 'rare');
  assert.equal(m.round, 6);
  assert.ok(m.perks.length >= 1);
  assert.equal(run.equip.weapon, m, 'the merged item stays equipped');
  assert.equal(run.bag.length, 0);
  // epics and relics don't merge
  const e1 = rollInstance('jelly_sabre', 'epic', 4, run.rng);
  run.bag.push(e1, rollInstance('jelly_sabre', 'epic', 4, run.rng));
  assert.equal(run.twinOf(e1), null);
});

test('every family reaches four pieces, and full sets and keystones change fights', () => {
  for (const [fam, f] of Object.entries(FAMILIES)) {
    if (fam === 'stasis') continue;
    assert.ok(f.set4, `${fam} has no 4-piece bonus`);
    const items = Object.keys(ITEMS).filter((id) => ITEMS[id].family === fam);
    const kinds = new Set(items.map((id) => ITEMS[id].slot).filter((s) => s !== 'trinket'));
    const trinkets = items.filter((id) => ITEMS[id].slot === 'trinket').length;
    assert.ok(kinds.size + Math.min(2, trinkets) >= 4, `${fam} can't reach 4 pieces`);
  }
  assert.equal(KEYSTONES.length, BIOMES.length, 'one keystone per biome');
  for (const id of KEYSTONES) {
    assert.ok(Object.values(MOBS).some((m) => m.drops.includes(id)), `${id} drops nowhere`);
    const r = new Run(4).rng;
    const base = { name: 'x', round: 12, equip: { weapon: rollInstance('spore_shiv', 'rare', 12, r), top: rollInstance('linen_shirt', 'rare', 12, r) } };
    const slot = ITEMS[id].slot === 'trinket' ? 'trinket1' : ITEMS[id].slot;
    const withKey = { ...base, equip: { ...base.equip, [slot]: rollInstance(id, 'rare', 12, r) } };
    const foe = heroFighter({ name: 'y', round: 12, equip: { weapon: rollInstance('tusk_cleaver', 'rare', 12, r), top: rollInstance('reef_mail', 'rare', 12, r) } });
    const f = heroFighter(withKey);
    assert.ok(Object.keys(f.sets).length, `${id} sets no flag`);
    // the fight runs and ends
    const res = simulate(f, foe, 5);
    assert.ok([0, 1, -1].includes(res.winner));
  }
});

test('each run plans four different events on hunt rounds', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const plan = planEvents(seed);
    assert.equal(plan.length, EVENTS_PER_RUN);
    assert.equal(new Set(plan.map((e) => e.id)).size, EVENTS_PER_RUN);
    for (const e of plan) {
      assert.ok(e.round > 1 && e.round <= ROUNDS && !DUEL_ROUNDS.includes(e.round), `seed ${seed}: event on round ${e.round}`);
      assert.ok(EVENTS[e.id]);
    }
  }
  // it actually fires in play
  const run = new Run(3);
  const first = run.eventPlan[0];
  let fired = false;
  while (!run.over && run.round <= first.round) {
    run.fight(run.isDuel ? undefined : run.offers[0]);
    const out = run.resolve();
    if (out.event) { fired = true; assert.equal(run.event.id, first.id); break; }
    while (run.loot) run.takeLoot(run.loot[0], run.bagFull() ? 'discard' : 'bag');
    if (run.shop) run.leaveShop();
    run.next();
  }
  assert.ok(fired || run.over, 'the first planned event never fired');
});

test('every event option applies and leaves the run consistent', () => {
  for (const id of Object.keys(EVENTS)) {
    const probe = new Run(11);
    probe.event = { id, round: 6, result: null };
    for (const opt of eventOptions(probe)) {
      if (opt.key === 'leave') continue;
      const run = new Run(11);
      run.round = 6;
      run.gold = 30;
      run.bag.push(rollInstance('reef_mail', 'rare', 5, run.rng), rollInstance('spore_hood', 'common', 5, run.rng));
      run.equip.hat = rollInstance('shell_helm', 'rare', 5, run.rng); // a coral piece so the tailor has a family
      run.event = { id, round: 6, result: null };
      const o = eventOptions(run).find((x) => x.key === opt.key);
      if (o.disabled) continue;
      const pick = o.pick ? [...run.bag, ...Object.values(run.equip)].find((i) => i && o.pick(i)) : null;
      if (o.pick && !pick) continue;
      const res = chooseEvent(run, o.key, pick?.uid);
      assert.ok(res && res.text, `${id}:${o.key} gave no outcome`);
      assert.ok(run.gold >= 0, `${id}:${o.key} made gold negative`);
      assert.ok(run.lives >= 1);
      assert.ok(run.bag.length <= BAG_SIZE, `${id}:${o.key} overfilled the bag`);
      const uids = [...run.bag, ...Object.values(run.equip)].filter(Boolean).map((i) => i.uid);
      assert.equal(new Set(uids).size, uids.length, `${id}:${o.key} duplicated an item`);
      if (res.gained) assert.ok(run.find(res.gained), `${id}:${o.key} gained item is nowhere`);
      if (['demon:brand', 'shrine:echo'].includes(`${id}:${o.key}`)) assert.ok(run.boons.hpMult < 1, 'the curse did nothing');
      assert.equal(chooseEvent(run, o.key, pick?.uid), null, 'an event can only be taken once');
    }
  }
});
