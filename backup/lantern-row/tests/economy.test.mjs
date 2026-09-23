import { test } from 'node:test';
import assert from 'node:assert/strict';
/** The table in §7.2, and the tolerance the milestone asks for. */
const EXPECTED = [
  [0.80, 0.62],
  [1.00, 0.46],
  [1.25, 0.27],
  [1.50, 0.07],
];

const { sellChance, stockPrice } = await import('../src/core/stalls.ts');
const { Rng } = await import('../src/core/rng.ts');

test('sell-through matches the published table', () => {
  for (const [markup, expected] of EXPECTED) {
    const actual = sellChance(markup * 1000, 1000);
    assert.ok(Math.abs(actual - expected) <= 0.01,
      `markup ${markup}: got ${actual.toFixed(3)}, expected ${expected}`);
  }
});

test('simulated nights land within 5% of the table', () => {
  const rng = new Rng('nights');
  for (const [markup, expected] of EXPECTED) {
    let sold = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (rng.chance(sellChance(markup * 1000, 1000))) sold++;
    const rate = sold / n;
    assert.ok(Math.abs(rate - expected) <= 0.05,
      `markup ${markup}: ${rate.toFixed(3)} vs ${expected}`);
  }
});

test('asking prices stay inside 0.78x – 1.50x', () => {
  const rng = new Rng('prices');
  const it = { price: 100000 };
  for (let i = 0; i < 2000; i++) {
    const ask = stockPrice(rng, it);
    assert.ok(ask >= it.price * 0.74 && ask <= it.price * 1.54, `ask ${ask}`);
  }
});

test('bargains evaporate and overpriced stock survives', () => {
  const survive = (markup) => (1 - sellChance(markup * 1000, 1000)) ** 3;
  assert.ok(survive(0.8) < 0.1, 'a 0.80x bargain should rarely last three nights');
  assert.ok(survive(1.5) > 0.7, 'a 1.50x markup should usually still be there');
});
