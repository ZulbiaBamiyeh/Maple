// Screenshot a local page: node tools/shot.mjs <path?query> <out.png> [width] [height]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const port = server.address().port;
const [, , page = 'index.html', out = 'shot.png', w = '1200', h = '900'] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
pg.on('console', (m) => console.log('[console]', m.type(), m.text()));
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.goto(`http://localhost:${port}/${page}`);
await pg.waitForTimeout(800);
await pg.screenshot({ path: out, fullPage: !process.env.NOFULL });
await browser.close();
server.close();
