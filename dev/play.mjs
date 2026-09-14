import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('ERR ' + m.text()); });
await p.goto('http://localhost:5199/?seed=demo', { waitUntil: 'load' });
await p.waitForTimeout(4500);
await p.evaluate(() => window.__lr.haggle(0));
await p.waitForTimeout(5000);

async function say(text) {
  const input = p.locator('.win.open >> nth=0').locator('input').first();
  await input.fill(text);
  await input.press('Enter');
  await p.waitForTimeout(6000);
}
await say('how much?');
await say('too much');
await p.evaluate(() => {
  const st = window.__lr.run;
  console.log('STATE', JSON.stringify({ mesos: st.mesos, rep: st.reputation }));
});
await p.screenshot({ path: '/tmp/chat.png' });
// name a figure
await say('30k?');
await p.screenshot({ path: '/tmp/chat2.png' });
console.log(errs.slice(0, 6).join('\n') || 'clean');
await b.close();
