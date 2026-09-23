// Arena backdrops, drawn at the arena's logical resolution: banded sky, two
// layers of hills, and a grassy (or snowy, or rocky) ground strip. Flat colour
// bands with a checker dither between them; no gradients.

import { mulberry32 } from '../rng.js';

const BIOMES = {
  slime: { sky: ['#9fd8ff', '#bfe6ff', '#e0f4ff'], far: '#8fc7a6', near: '#5fa86a', ground: ['#6cc24a', '#3d7f37', '#7a4a2c', '#4e2e1d'], deco: 'clouds' },
  spore: { sky: ['#3b2d5a', '#5b4480', '#8b6aa8'], far: '#4a3b6e', near: '#35294f', ground: ['#6c8f4a', '#3d5f37', '#4e3a2c', '#2e221d'], deco: 'spores' },
  boar: { sky: ['#ffb877', '#ffd39a', '#ffe9c7'], far: '#d48a5a', near: '#a8623f', ground: ['#c9a24e', '#8f7433', '#7a4a2c', '#4e2e1d'], deco: 'clouds' },
  wisp: { sky: ['#1f2d5a', '#34488a', '#5a74b8'], far: '#7d9bcc', near: '#bcd4f0', ground: ['#f2f8ff', '#bcd4f0', '#7d9bcc', '#4a5f8f'], deco: 'snow' },
  golem: { sky: ['#2a2238', '#3a3150', '#4d4266'], far: '#5c554c', near: '#403a35', ground: ['#8f8577', '#5c554c', '#403a35', '#2a2622'], deco: 'crystals' },
  imp: { sky: ['#3a1020', '#6e1b33', '#b8324a'], far: '#5e1830', near: '#3a1020', ground: ['#5c3a35', '#3a2622', '#f58a3a', '#2a1a18'], deco: 'embers' },
  duel: { sky: ['#2d2447', '#4a3b6e', '#8a5a9e'], far: '#4a3b6e', near: '#2d2447', ground: ['#aeb4c8', '#6b6a80', '#44475e', '#2a2238'], deco: 'stars' },
};

export function drawScene(ctx, W, H, biome, groundY, seed = 7) {
  const b = BIOMES[biome] || BIOMES.duel;
  const rnd = mulberry32(seed);
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };

  // sky bands with a dithered seam
  const bands = b.sky.length;
  const bandH = Math.ceil(groundY / bands);
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = b.sky[i];
    ctx.fillRect(0, i * bandH, W, bandH);
    if (i > 0) for (let x = 0; x < W; x += 2) px(x + ((i * bandH) % 2), i * bandH - 1, b.sky[i]);
  }

  // decorations in the sky
  if (b.deco === 'clouds') {
    for (let i = 0; i < 4; i++) cloud(ctx, Math.floor(rnd() * W), 6 + Math.floor(rnd() * groundY * 0.35), '#ffffff', rnd);
  } else if (b.deco === 'stars' || b.deco === 'snow' || b.deco === 'spores') {
    const col = b.deco === 'spores' ? '#c6f28a' : '#f4f1ff';
    for (let i = 0; i < W / 4; i++) px(Math.floor(rnd() * W), Math.floor(rnd() * groundY * 0.7), col);
  }
  if (biome === 'duel' || biome === 'wisp') {
    // a big moon
    circle(ctx, W - 22, 16, 7, '#f4f1ff');
    circle(ctx, W - 20, 14, 6, b.sky[0]);
  }

  // far hills
  hills(ctx, W, groundY, b.far, 0.55, 14, rnd);
  // near hills
  hills(ctx, W, groundY, b.near, 0.3, 8, rnd);

  if (b.deco === 'crystals') {
    for (let i = 0; i < 5; i++) crystal(ctx, Math.floor(rnd() * W), groundY - 2 - Math.floor(rnd() * 8), rnd() > 0.5 ? '#7fd8e8' : '#9a5cc6');
  }
  if (b.deco === 'spores') {
    for (let i = 0; i < 4; i++) tinyShroom(ctx, Math.floor(rnd() * W), groundY, rnd);
  }

  // ground
  const [top, top2, soil, deep] = b.ground;
  ctx.fillStyle = soil;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = deep;
  ctx.fillRect(0, groundY + 6, W, H - groundY - 6);
  for (let x = 0; x < W; x += 2) px(x + (groundY % 2), groundY + 5, deep);
  ctx.fillStyle = top;
  ctx.fillRect(0, groundY, W, 3);
  ctx.fillStyle = top2;
  ctx.fillRect(0, groundY + 3, W, 1);
  for (let x = 0; x < W; x++) {
    if (rnd() < 0.45) px(x, groundY - 1, top);
    if (rnd() < 0.3) px(x, groundY + 3 + 1, top2);
  }
  // pebbles
  for (let i = 0; i < W / 10; i++) px(Math.floor(rnd() * W), groundY + 7 + Math.floor(rnd() * (H - groundY - 8)), soil);
}

function hills(ctx, W, groundY, color, amp, base, rnd) {
  ctx.fillStyle = color;
  const f1 = 0.03 + rnd() * 0.03;
  const f2 = 0.08 + rnd() * 0.05;
  const ph = rnd() * 10;
  for (let x = 0; x < W; x++) {
    const h = base + Math.round((Math.sin(x * f1 + ph) * 0.6 + Math.sin(x * f2 + ph * 2) * 0.4) * base * amp * 1.4);
    ctx.fillRect(x, groundY - h, 1, h);
  }
}

function cloud(ctx, x, y, color, rnd) {
  ctx.fillStyle = color;
  const w = 10 + Math.floor(rnd() * 12);
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x + 2, y - 2, Math.floor(w * 0.5), 2);
  ctx.fillRect(x + Math.floor(w * 0.4), y - 3, Math.floor(w * 0.35), 3);
}

function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

function crystal(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 4, 2, 6);
  ctx.fillRect(x - 1, y - 2, 1, 4);
  ctx.fillStyle = '#f4f1ff';
  ctx.fillRect(x, y - 4, 1, 2);
}

function tinyShroom(ctx, x, groundY, rnd) {
  const cap = rnd() > 0.5 ? '#d9434f' : '#9a5cc6';
  ctx.fillStyle = '#f1d9b5';
  ctx.fillRect(x + 1, groundY - 3, 1, 3);
  ctx.fillStyle = cap;
  ctx.fillRect(x, groundY - 5, 3, 2);
  ctx.fillRect(x + 1, groundY - 6, 1, 1);
}

export const BIOME_OF = { slime: 'slime', spore: 'spore', boar: 'boar', wisp: 'wisp', golem: 'golem', imp: 'imp' };
