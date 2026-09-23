// Filmstrip of a battle on a fake clock:
// node tools/battle-frames.mjs <outdir> [seed] [mobIndex] [count] [everyMs] [skipMs]
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
const [, , out = '.', seed = '42', mob = '0', count = '12', every = '90', skipMs = '0'] = process.argv;
const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.clock.install();
await pg.goto(`http://localhost:${server.address().port}/index.html?seed=${seed}`);
await pg.clock.runFor(300);
await pg.click('#start');
await pg.clock.runFor(200);
await (await pg.$$('[data-mob]'))[+mob].click();
await pg.clock.runFor(+skipMs);
for (let i = 0; i < +count; i++) {
  await pg.clock.runFor(+every);
  await pg.screenshot({ path: path.join(out, `f${String(i).padStart(2, '0')}.png`), clip: { x: 0, y: 40, width: 390, height: 440 } });
}
await pg.screenshot({ path: path.join(out, 'full.png') });
await browser.close();
server.close();
