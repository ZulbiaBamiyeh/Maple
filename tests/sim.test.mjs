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

// ---- mechanics added for days 2-5

const dummy = (over = {}) => ({
  name: 'dummy', scale: 1, maxHp: 400, atk: 0, def: 0, crit: 0, haste: 0, lifesteal: 0, resist: 0, regen: 0,
  weapon: { min: 10, max: 10, interval: 1.0, magic: false, firstSwing: null, statusMult: 1 },
  onHit: [], triggers: [], sets: {}, ...over,
});
const hits = (r, src) => r.events.filter((e) => e.type === 'hit' && e.src === src);

test('shock adds damage per stack to every hit the target takes', () => {
  const a = dummy({ onHit: [{ chance: 1, apply: 'shock' }] });
  const r = simulate(a, dummy({ weapon: { ...a.weapon, interval: 9 } }), 1);
  const h = hits(r, 0);
  assert.equal(h[0].dmg, 10);
  assert.equal(h[1].dmg, 12);
  assert.equal(h[2].dmg, 14);
  const capped = h.slice(6).filter((x) => x.t < 20 * 20).map((x) => x.dmg); // before overtime
  assert.ok(capped.every((d) => d === 20), `shock should cap at 5 stacks, got ${capped}`);
});

test('hex halves healing received', () => {
  const healer = dummy({ regen: 10, weapon: { ...dummy().weapon, interval: 30 } });
  const r1 = simulate(dummy(), healer, 2);
  const r2 = simulate(dummy({ onHit: [{ chance: 1, apply: 'hex' }] }), healer, 2);
  const healed = (r) => r.events.filter((e) => e.type === 'heal' && e.dst === 1).reduce((s, e) => s + e.amt, 0);
  assert.ok(healed(r2) < healed(r1) * 0.7, `hexed ${healed(r2)} vs clean ${healed(r1)}`);
});

test('evasion dodges hits and onDodge triggers fire', () => {
  const dodger = dummy({ evasion: 0.9, triggers: [{ trigger: { type: 'onDodge' }, effect: { damage: 5 }, source: 'Riposte' }] });
  let dodges = 0, swings = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = simulate(dummy(), dodger, seed);
    const d = r.events.filter((e) => e.type === 'dodge' && e.dst === 1).length;
    dodges += d;
    swings += d + hits(r, 0).length;
    assert.equal(r.events.filter((e) => e.type === 'dot' && e.status === 'thorns' && e.dst === 0).length, d);
  }
  assert.ok(dodges / swings > 0.34 && dodges / swings < 0.46, `evasion caps at 40%: ${dodges}/${swings}`);
});

test('crit damage, armour pierce and flat thorns', () => {
  const r1 = simulate(dummy({ crit: 1, critDmg: 0.5 }), dummy(), 4);
  assert.equal(hits(r1, 0)[0].dmg, 20);
  const r2 = simulate(dummy({ pen: 4 }), dummy({ def: 6 }), 4);
  assert.equal(hits(r2, 0)[0].dmg, 8);
  const r3 = simulate(dummy(), dummy({ thorns: 3 }), 4);
  assert.ok(r3.events.some((e) => e.type === 'dot' && e.status === 'thorns' && e.dst === 0 && e.dmg === 3));
});

test('conditional damage: vs status, execute and rage', () => {
  const burner = dummy({ onHit: [{ chance: 1, apply: 'burn' }], mods: { vs: { burn: 0.5 } } });
  const h = hits(simulate(burner, dummy({ weapon: { ...dummy().weapon, interval: 30 } }), 5), 0);
  assert.equal(h[0].dmg, 10);
  assert.equal(h[1].dmg, 15);
  const exec = dummy({ mods: { execute: { below: 1.01, pct: 1 } } });
  assert.equal(hits(simulate(exec, dummy(), 5), 0)[0].dmg, 20);
});

test('detonate bursts the remaining poison and clears it', () => {
  const a = dummy({
    onHit: [{ chance: 1, apply: 'poison', stacks: 3 }],
    triggers: [{ trigger: { type: 'everyNthHit', n: 3 }, effect: { detonate: 'poison' }, source: 'Rupture' }],
  });
  const r = simulate(a, dummy({ weapon: { ...dummy().weapon, interval: 30 } }), 6);
  const burst = r.events.find((e) => e.type === 'dot' && e.burst && e.status === 'poison');
  assert.ok(burst && burst.dmg > 20, `burst ${burst?.dmg}`);
});

// ---- relics
const slow = (over = {}) => dummy({ weapon: { ...dummy().weapon, interval: 30 }, ...over });

test('stasis: untouchable and frozen, but your poison keeps ticking', () => {
  const a = dummy({
    maxHp: 100, onHit: [{ chance: 1, apply: 'poison', stacks: 5 }],
    triggers: [{ trigger: { type: 'hpBelow', pct: 0.5 }, effect: { stasis: 2.5 }, source: 'Gilded Hourglass' }],
  });
  const r = simulate(a, dummy({ maxHp: 400 }), 7);
  const start = r.events.find((e) => e.type === 'stasis');
  assert.ok(start, 'stasis fired');
  const end = start.t + 2.5 * 20;
  const inside = r.events.filter((e) => e.t > start.t && e.t < end);
  assert.ok(inside.filter((e) => e.type === 'hit' && e.dst === 0).every((e) => e.dmg === 0 && e.immune));
  assert.ok(!inside.some((e) => e.type === 'hit' && e.src === 0), 'no swings while gilded');
  assert.ok(inside.some((e) => e.type === 'dot' && e.status === 'poison' && e.dst === 1 && e.dmg > 0), 'poison still ticks');
});

test('revive: the first killing blow leaves you at 30% HP', () => {
  const a = dummy({ maxHp: 50, sets: { revive: 0.3 } });
  const r = simulate(a, dummy({ maxHp: 1000 }), 8);
  const rev = r.events.find((e) => e.type === 'revive');
  assert.ok(rev && rev.hp === 15);
  assert.equal(r.events.filter((e) => e.type === 'revive').length, 1);
  assert.equal(r.winner, 1);
});

test('reflect, echo, dot rate, bloodpact, glass, shield keep, overclock', () => {
  const poisoner = dummy({ onHit: [{ chance: 1, apply: 'poison' }] });
  const refl = simulate(poisoner, slow({ sets: { reflect: 1 } }), 9);
  assert.ok(refl.events.some((e) => e.type === 'status' && e.status === 'poison' && e.dst === 0));
  const echo = simulate(dummy({ onHit: [{ chance: 1, apply: 'poison' }], sets: { echo: 1 } }), slow(), 9);
  assert.equal(echo.events.find((e) => e.type === 'status' && e.dst === 1 && e.stacks === 2)?.t, echo.events.find((e) => e.type === 'status').t);
  const ticks = (r) => r.events.filter((e) => e.type === 'dot' && e.status === 'poison' && e.t < 200).length;
  const fast = simulate(dummy({ onHit: [{ chance: 1, apply: 'poison' }], sets: { dotRate: 0.5 } }), slow({ maxHp: 999 }), 9);
  const base = simulate(poisoner, slow({ maxHp: 999 }), 9);
  assert.ok(ticks(fast) >= ticks(base) * 1.8, `${ticks(fast)} vs ${ticks(base)}`);
  const bp = simulate(dummy({ regen: 5, sets: { healDamage: 1 } }), dummy(), 9);
  assert.ok(bp.events.some((e) => e.type === 'dot' && e.dst === 1 && e.status === 'bleed'));
  assert.equal(hits(simulate(dummy({ mods: { glass: { out: 0.5, in: 0 } } }), dummy(), 9), 0)[0].dmg, 15);
  assert.equal(hits(simulate(dummy(), dummy({ mods: { glass: { out: 0, in: 0.5 } } }), 9), 0)[0].dmg, 15);
  const sh = simulate(dummy({ sets: { shieldKeep: true, shieldBoost: 0.5 }, triggers: [{ trigger: { type: 'battleStart' }, effect: { shield: 10 }, source: 'Ebb' }] }), slow(), 9);
  assert.equal(sh.frames[200][0].shield, 15);
  const oc = simulate(dummy({ maxHp: 100, sets: { selfCost: 0.05 } }), slow(), 9);
  assert.ok(oc.events.some((e) => e.type === 'dot' && e.status === 'overclock' && e.dst === 0 && e.dmg === 5));
});
