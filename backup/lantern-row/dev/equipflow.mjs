import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:5199/?seed=equip', { waitUntil: 'load' });
await p.waitForTimeout(8000);
// Put loud, visible gear in the bag, then equip it by clicking, as a player would.
const box = async () => p.evaluate(() => {
  const s = window.__lr.scene;
  const pt = s.worldToScreen(s.player.x, 588);
  return { x: Math.max(0, pt.x - 90), y: Math.max(0, pt.y - 190), width: 180, height: 210 };
});
await p.screenshot({ path: '/tmp/before.png', clip: await box() });
await p.evaluate(() => { window.__lr.run.bag.push(24, 9, 19, 16, 20, 7); window.__lr.inventory.open(); });
await p.waitForTimeout(400);
const before = await p.evaluate(() => JSON.stringify(window.__lr.run.gear));
for (let i = 0; i < 8; i++) {
  const all = await p.$$('.win.open .grid .cell.filled');
  const cell = all[all.length - 1 - i];
  if (!cell) break;
  await cell.click();
  await p.waitForTimeout(160);
}
await p.waitForTimeout(500);
const after = await p.evaluate(() => JSON.stringify(window.__lr.run.gear));
console.log('before:', before);
console.log('after: ', after);
await p.evaluate(() => { window.__lr.inventory.win.close(); window.__lr.inventory.itemWin.close(); });
await p.waitForTimeout(700);
await p.screenshot({ path: '/tmp/after.png', clip: await box() });
await p.screenshot({ path: '/tmp/equipped.png' });
await b.close();
