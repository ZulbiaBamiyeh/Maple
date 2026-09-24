// Filmstrip of a status-heavy battle on a fake clock, for checking that
// status chips and pop-ups never collide:
// node tools/status-frames.mjs <outdir> [mobId] [round] [count] [everyMs] [width] [height]
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
const [, , out = '.', mob = 'moor_witch', round = '14', count = '10', every = '400', w = '390', h = '844'] = process.argv;
const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.clock.install();
await pg.goto(`http://localhost:${server.address().port}/index.html?seed=5`);
await pg.clock.runFor(300);
await pg.evaluate(async ({ mob, round }) => {
  const { Run } = await import('/src/game.js');
  const { rollInstance } = await import('/src/items.js');
  const { showBattle } = await import('/src/ui/battle.js');
  const run = new Run(5);
  run.round = +round;
  const r = run.rng;
  // Gear that stacks as many statuses on both sides as possible.
  run.equip.weapon = rollInstance('blightwood_staff', 'epic', run.round, r);
  run.equip.hat = rollInstance('witch_hat', 'epic', run.round, r);
  run.equip.trinket1 = rollInstance('static_charm', 'epic', run.round, r);
  run.equip.trinket2 = rollInstance('viper_fang', 'epic', run.round, r);
  const fight = run.fight(mob);
  showBattle(document.getElementById('app'), run, fight, () => {}, {});
}, { mob, round });
for (let i = 0; i < +count; i++) {
  await pg.clock.runFor(+every);
  await pg.screenshot({ path: path.join(out, `s${String(i).padStart(2, '0')}.png`), clip: { x: 0, y: 0, width: +w, height: Math.min(+h, 520) } });
}
await browser.close();
server.close();
