// Tile PNGs into one contact sheet: node tools/contact.mjs <dir> <out.png> [cols] [scale]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [, , dir, out, cols = '4', scale = '0.5'] = process.argv;
const files = fs.readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort();
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}"><figcaption>${f}</figcaption></figure>`).join('');
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},auto);gap:4px;color:#aaa;font:10px monospace">
<style>img{width:${(+process.env.W || 390) * +scale}px;display:block} figure{margin:0}</style>${imgs}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
