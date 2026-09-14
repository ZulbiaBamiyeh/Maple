import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:5199/?seed=gear', { waitUntil: 'load' });
await p.waitForTimeout(8000);
const out = await p.evaluate(async () => {
  const assets = await import('/src/assets/index.ts');
  const look = await import('/src/ui/look.ts');
  const m = assets.assets();
  const gear = { weapon: 3, body: 13, legs: 16, boots: 19, gloves: 20, helm: 9, cape: 24 };
  const dressed = look.dressed(window.__lr.run.looks[0], gear);
  return {
    gearLooks: m.gearLooks,
    dressed,
    parts: assets.debugLayout(dressed).map((x) => x.name + ':' + x.z + (x.loaded ? '' : ' MISSING')),
  };
});
console.log('gearLooks keys:', Object.keys(out.gearLooks).length);
console.log('dressed:', JSON.stringify(out.dressed));
console.log('parts:', out.parts.join('\n       '));
await b.close();
