import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message, e.stack?.split('\n')[1] || ''));
p.on('console', (m) => console.log(m.type().toUpperCase(), m.text().slice(0, 200)));
await p.goto('http://localhost:5199/', { waitUntil: 'load' });
await p.waitForTimeout(9000);
console.log("lr", await p.evaluate(()=>typeof window.__lr));
await b.close();
