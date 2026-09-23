// Click through a run and screenshot each screen: node tools/flow.mjs <outdir> [seed]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const out = process.argv[2] || '.';
const seed = process.argv[3] || '42';
const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) console.log('[console]', m.text()); });
await pg.goto(`http://localhost:${server.address().port}/index.html?seed=${seed}`);
await pg.waitForTimeout(400);
const shot = async (n, full = true) => { await pg.screenshot({ path: path.join(out, n + '.png'), fullPage: full }); console.log('shot', n); };
await pg.click('#start');
await pg.waitForTimeout(300);
await shot('01-pick');
await pg.click('[data-mob]');
await pg.waitForTimeout(2600);
await shot('02-battle', false);
await pg.click('[data-speed="skip"]');
await pg.waitForTimeout(600);
await shot('03-battle-end');
await pg.click('#cont');
await pg.waitForTimeout(400);
await shot('04-after');
if (await pg.$('[data-loot]')) {
  await pg.click('[data-loot]');
  await pg.waitForTimeout(400);
  await shot('05-sheet', false);
  await pg.click('[data-act="equip"]');
  await pg.waitForTimeout(400);
  await shot('06-gear');
}
// play on greedily: always hunt the easy mob, equip loot, until a duel
for (let i = 0; i < 60; i++) {
  if (await pg.$('#primary')) {
    const label = await pg.textContent('#primary');
    if (label.includes('Fight')) { await shot('07-duel-preview'); await pg.click('#primary'); await pg.waitForTimeout(2200); await shot('07b-duel-battle', false); }
    else await pg.click('#primary');
  } else if (await pg.$('[data-mob]')) {
    await pg.click('[data-mob]');
  } else if (await pg.$('[data-speed="skip"]')) {
    await pg.click('[data-speed="skip"]');
    await pg.waitForTimeout(200);
    await pg.click('#cont');
  } else if (await pg.$('[data-loot]')) {
    await pg.click('[data-loot]');
    await pg.waitForTimeout(150);
    await pg.click('[data-act="equip"]');
  } else if (await pg.$('#again')) { await shot('09-end'); break; }
  await pg.waitForTimeout(300);
  if (i === 6) await shot('08-mid');
}
await browser.close();
server.close();
