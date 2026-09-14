import { test } from 'node:test';
import assert from 'node:assert/strict';

const { newRun, equip, unequip } = await import('../src/core/game.ts');
const { item } = await import('../src/core/items.ts');

const wardrobe = { hair: [30030, 30110], face: [20000, 20004] };

test('equipping mutates the run in place, so anything holding a reference sees it', () => {
  const run = newRun('equip-test', wardrobe);
  // The scene, the equipment window and the arena all read this same object.
  const held = run.gear;
  equip(run, item(9));   // Blue Bandana
  equip(run, item(24));  // Maple Cape — not in the bag, so it should not take
  assert.equal(held, run.gear, 'the gear object must never be replaced');
  assert.equal(held.helm, undefined, 'you cannot wear what you do not have');

  run.bag.push(9, 24);
  equip(run, item(9));
  equip(run, item(24));
  assert.equal(held.helm, 9);
  assert.equal(held.cape, 24);

  unequip(run, 'helm');
  assert.equal(held.helm, undefined);
  assert.equal(held, run.gear);
});

test("selling something also takes it off", async () => {
  const run = newRun('sell-test', wardrobe);
  const held = run.gear;
  assert.equal(held.weapon, 3);
  const { sellToStall } = await import('../src/core/game.ts');
  sellToStall(run, item(3));
  assert.equal(held.weapon, undefined, 'a sold item cannot still be worn');
  assert.ok(!run.bag.includes(3));
});
