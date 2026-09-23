import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:5199/?seed=cycle', { waitUntil: 'load' });
await p.waitForTimeout(4500);
for (let day = 1; day <= 4; day++) {
  await p.evaluate(() => window.__lr.scene.onInteract({ kind: 'door', index: 0, x: 0, floor: 'upper', label: 'home' }));
  await p.waitForTimeout(500);
  await p.evaluate(() => [...document.querySelectorAll('.win.open .btn')].find((b) => b.textContent === 'sleep')?.click());
  await p.waitForTimeout(600);
}
const state = await p.evaluate(() => ({
  day: window.__lr.run.day,
  stalls: window.__lr.run.stalls.map((s) => [s.name, s.daysLeft, s.stock.filter((e) => e.sold).length, s.board.length]),
  hawkers: window.__lr.run.hawkers.map((h) => h.name),
  over: window.__lr.run.over,
}));
console.log(JSON.stringify(state, null, 1));
console.log(errs.join('\n') || 'no page errors');
await p.screenshot({ path: '/tmp/day5.png' });
await b.close();
