import { chromium } from 'playwright';
const [url, out, script] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(8000);
if (script) { try { await p.evaluate(script); } catch (e) { errs.push('EVAL ' + e.message); } }
await p.waitForTimeout(Number(process.env.WAIT || 900));
await p.screenshot({ path: out });
await b.close();
console.log(errs.slice(0, 8).join('\n') || 'clean');
