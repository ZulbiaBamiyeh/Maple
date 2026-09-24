// Arena backdrops, drawn at the arena's logical resolution: banded sky, two
// layers of hills, and a grassy (or snowy, or rocky) ground strip. Flat colour
// bands with a checker dither between them; no gradients.

import { mulberry32 } from '../rng.js';
import { FAMILY_BIOME } from '../data.js';

const BIOMES = {
  slime: { sky: ['#9fd8ff', '#bfe6ff', '#e0f4ff'], far: '#8fc7a6', near: '#5fa86a', ground: ['#6cc24a', '#3d7f37', '#7a4a2c', '#4e2e1d'], deco: 'clouds' },
  spore: { sky: ['#3b2d5a', '#5b4480', '#8b6aa8'], far: '#4a3b6e', near: '#35294f', ground: ['#6c8f4a', '#3d5f37', '#4e3a2c', '#2e221d'], deco: 'spores' },
  boar: { sky: ['#ffb877', '#ffd39a', '#ffe9c7'], far: '#d48a5a', near: '#a8623f', ground: ['#c9a24e', '#8f7433', '#7a4a2c', '#4e2e1d'], deco: 'clouds' },
  wisp: { sky: ['#1f2d5a', '#34488a', '#5a74b8'], far: '#7d9bcc', near: '#bcd4f0', ground: ['#f2f8ff', '#bcd4f0', '#7d9bcc', '#4a5f8f'], deco: 'snow' },
  golem: { sky: ['#2a2238', '#3a3150', '#4d4266'], far: '#5c554c', near: '#403a35', ground: ['#8f8577', '#5c554c', '#403a35', '#2a2622'], deco: 'crystals' },
  imp: { sky: ['#3a1020', '#6e1b33', '#b8324a'], far: '#5e1830', near: '#3a1020', ground: ['#5c3a35', '#3a2622', '#f58a3a', '#2a1a18'], deco: 'embers' },
  shore: { sky: ['#7fcbf0', '#a6def5', '#dff4ff'], far: '#3cb8b0', near: '#e6c9a0', ground: ['#f2dcae', '#d6b47a', '#b8925a', '#7a5a3c'], deco: 'shore' },
  ruins: { sky: ['#3e3040', '#6a4c4a', '#b07c5a'], far: '#54443e', near: '#3a302c', ground: ['#9a8468', '#62503e', '#40342a', '#2a221c'], deco: 'ruins' },
  moor: { sky: ['#161c2e', '#252f48', '#3e4c66'], far: '#28323e', near: '#1a2028', ground: ['#4e5e4a', '#2e3a30', '#2a2622', '#1a1614'], deco: 'moor' },
  peak: { sky: ['#e8705a', '#ffa46a', '#ffd89a'], far: '#7a4a5e', near: '#4e2e40', ground: ['#8a6a5a', '#5a4038', '#3a2a24', '#241a18'], deco: 'peak' },
  duel: { sky: ['#2d2447', '#4a3b6e', '#8a5a9e'], far: '#4a3b6e', near: '#2d2447', ground: ['#aeb4c8', '#6b6a80', '#44475e', '#2a2238'], deco: 'stars' },
  desert: { sky: ['#f2a65a', '#ffc98a', '#ffe8b8'], far: '#e0a868', near: '#d09050', ground: ['#f2d48a', '#d0a458', '#b08040', '#7a5a2e'], deco: 'desert' },
  orchard: { sky: ['#8fd0f0', '#b8e4f8', '#e8f8ff'], far: '#7ab870', near: '#4e9440', ground: ['#86c860', '#4e9440', '#7a4a2c', '#4e2e1d'], deco: 'orchard' },
  glacier: { sky: ['#bfe0f8', '#d8eefc', '#f2faff'], far: '#a8c8e8', near: '#d8ecfa', ground: ['#ffffff', '#d8ecfa', '#8fb8e0', '#5a7eb0'], deco: 'glacier' },
  swamp: { sky: ['#2e3a2a', '#44563a', '#6a7a4a'], far: '#3a4a30', near: '#2a3624', ground: ['#5a6a3a', '#3e4a28', '#3a3020', '#22200e'], deco: 'swamp' },
  observatory: { sky: ['#0e0c2a', '#1e1a4a', '#3a2e6e'], far: '#2a2450', near: '#1a1638', ground: ['#8a86b0', '#5a5680', '#3a3658', '#221e3a'], deco: 'observatory' },
};

export function drawScene(ctx, W, H, biome, groundY, seed = 7) {
  const b = BIOMES[biome] || BIOMES[FAMILY_BIOME[biome]] || BIOMES.duel;
  biome = BIOMES[biome] ? biome : FAMILY_BIOME[biome] || 'duel';
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
  if (b.deco === 'clouds' || b.deco === 'shore') {
    for (let i = 0; i < 4; i++) cloud(ctx, Math.floor(rnd() * W), 6 + Math.floor(rnd() * groundY * 0.35), '#ffffff', rnd);
  } else if (b.deco === 'stars' || b.deco === 'snow' || b.deco === 'spores' || b.deco === 'moor') {
    const col = b.deco === 'spores' ? '#c6f28a' : '#f4f1ff';
    for (let i = 0; i < W / 4; i++) px(Math.floor(rnd() * W), Math.floor(rnd() * groundY * 0.7), col);
  }
  if (b.deco === 'peak') {
    // a low sun behind the mountains
    circle(ctx, Math.floor(W * 0.7), Math.floor(groundY * 0.55), 9, '#fff0b0');
  }
  if (biome === 'duel' || biome === 'wisp' || biome === 'moor') {
    // a big moon
    circle(ctx, W - 22, 16, 7, '#f4f1ff');
    circle(ctx, W - 20, 14, 6, b.sky[0]);
  }

  if (b.deco === 'shore') {
    // the sea at the horizon, with glints, then low dunes
    ctx.fillStyle = b.far;
    ctx.fillRect(0, groundY - 12, W, 12);
    ctx.fillStyle = '#227079';
    ctx.fillRect(0, groundY - 6, W, 6);
    for (let i = 0; i < W / 6; i++) {
      ctx.fillStyle = '#d0fff6';
      ctx.fillRect(Math.floor(rnd() * W), groundY - 11 + Math.floor(rnd() * 8), 2 + Math.floor(rnd() * 2), 1);
    }
    hills(ctx, W, groundY, b.near, 0.25, 4, rnd);
  } else if (b.deco === 'peak') {
    peaks(ctx, W, groundY, b.far, 22, rnd, '#f4f1ff');
    peaks(ctx, W, groundY, b.near, 12, rnd, null);
  } else if (b.deco === 'desert') {
    // a hot sun, a far pyramid, then long low dunes
    circle(ctx, Math.floor(W * 0.22), Math.floor(groundY * 0.3), 8, '#fff6c8');
    pyramid(ctx, Math.floor(W * (0.55 + rnd() * 0.25)), groundY - 6, 20, '#c89050', '#a87038');
    hills(ctx, W, groundY, b.far, 0.35, 10, rnd);
    hills(ctx, W, groundY, b.near, 0.2, 5, rnd);
  } else if (b.deco === 'glacier') {
    peaks(ctx, W, groundY, b.far, 20, rnd, '#ffffff');
    peaks(ctx, W, groundY, b.near, 9, rnd, null);
  } else {
    // far hills
    hills(ctx, W, groundY, b.far, 0.55, 14, rnd);
    // near hills
    hills(ctx, W, groundY, b.near, 0.3, 8, rnd);
  }
  if (b.deco === 'ruins') {
    for (let i = 0; i < 4; i++) pillar(ctx, Math.floor(rnd() * W), groundY, 8 + Math.floor(rnd() * 14), rnd);
    for (let i = 0; i < 2; i++) cog(ctx, Math.floor(rnd() * W), groundY - 16 - Math.floor(rnd() * 10), 4 + Math.floor(rnd() * 3), '#4a3c36');
  }
  if (b.deco === 'moor') {
    for (let i = 0; i < 5; i++) grave(ctx, Math.floor(rnd() * W), groundY, rnd);
    // low fog
    ctx.fillStyle = 'rgba(190, 200, 230, 0.16)';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(rnd() * W) - 20, groundY - 4 - Math.floor(rnd() * 5), 30 + Math.floor(rnd() * 30), 2);
  }
  if (b.deco === 'shore') {
    for (let i = 0; i < 3; i++) shellDeco(ctx, Math.floor(rnd() * W), groundY + 2 + Math.floor(rnd() * 4), rnd);
  }
  if (b.deco === 'peak') {
    for (let i = 0; i < W / 8; i++) px(Math.floor(rnd() * W), Math.floor(rnd() * groundY), rnd() > 0.5 ? '#ffc36b' : '#f58a3a');
  }

  if (b.deco === 'desert') {
    for (let i = 0; i < 3; i++) cactus(ctx, Math.floor(rnd() * W), groundY, 5 + Math.floor(rnd() * 5));
  }
  if (b.deco === 'orchard') {
    for (let i = 0; i < 3; i++) cloud(ctx, Math.floor(rnd() * W), 6 + Math.floor(rnd() * groundY * 0.3), '#ffffff', rnd);
    for (let i = 0; i < 5; i++) berryTree(ctx, Math.floor(rnd() * W), groundY, rnd);
  }
  if (b.deco === 'swamp') {
    // fireflies, dead trees and a murky pool
    for (let i = 0; i < W / 10; i++) px(Math.floor(rnd() * W), Math.floor(groundY * 0.3 + rnd() * groundY * 0.6), '#d8f06a');
    for (let i = 0; i < 3; i++) deadTree(ctx, Math.floor(rnd() * W), groundY, 12 + Math.floor(rnd() * 8));
    ctx.fillStyle = 'rgba(160, 200, 120, 0.12)';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.floor(rnd() * W) - 20, groundY - 3 - Math.floor(rnd() * 5), 30 + Math.floor(rnd() * 30), 2);
  }
  if (b.deco === 'observatory') {
    for (let i = 0; i < W / 3; i++) px(Math.floor(rnd() * W), Math.floor(rnd() * groundY * 0.8), rnd() > 0.8 ? '#ffd36b' : '#f4f1ff');
    // a falling star and the observatory dome
    for (let i = 0; i < 8; i++) px(Math.floor(W * 0.2) + i * 2, 10 + i, i < 2 ? '#ffffff' : '#c8c0ff');
    dome(ctx, Math.floor(W * (0.6 + rnd() * 0.25)), groundY);
  }
  if (b.deco === 'glacier') {
    for (let i = 0; i < W / 5; i++) px(Math.floor(rnd() * W), Math.floor(rnd() * groundY), '#ffffff');
    for (let i = 0; i < 4; i++) crystal(ctx, Math.floor(rnd() * W), groundY - 1, '#8fd8f0');
  }

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
export const SCENES = Object.keys(BIOMES);

function peaks(ctx, W, groundY, color, base, rnd, snow) {
  let x = -Math.floor(rnd() * 20);
  while (x < W) {
    const w = 18 + Math.floor(rnd() * 22);
    const h = base + Math.floor(rnd() * base * 0.6);
    const cx = x + w / 2;
    for (let i = 0; i < w; i++) {
      const col = Math.round(h * (1 - Math.abs(x + i - cx) / (w / 2)));
      if (col <= 0) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + i, groundY - col, 1, col);
      if (snow && col > h - 5) {
        ctx.fillStyle = snow;
        ctx.fillRect(x + i, groundY - col, 1, Math.min(3, col - (h - 6)));
      }
    }
    x += Math.floor(w * 0.6);
  }
}

function pillar(ctx, x, groundY, h, rnd) {
  ctx.fillStyle = '#6a584a';
  ctx.fillRect(x, groundY - h, 5, h);
  ctx.fillStyle = '#86705c';
  ctx.fillRect(x, groundY - h, 1, h);
  ctx.fillRect(x - 1, groundY - h - 1, 7, 2);
  if (rnd() > 0.5) { ctx.fillStyle = '#3a302c'; ctx.fillRect(x + 3, groundY - h - 1, 3, 2); }
}

function cog(ctx, cx, cy, r, color) {
  circle(ctx, cx, cy, r, color);
  ctx.fillStyle = color;
  for (let a = 0; a < 8; a++) {
    const x = Math.round(cx + Math.cos((a * Math.PI) / 4) * (r + 1));
    const y = Math.round(cy + Math.sin((a * Math.PI) / 4) * (r + 1));
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  circle(ctx, cx, cy, 1, '#2a2226');
}

function grave(ctx, x, groundY, rnd) {
  const h = 5 + Math.floor(rnd() * 4);
  ctx.fillStyle = '#3e4658';
  ctx.fillRect(x, groundY - h, 5, h);
  ctx.fillRect(x + 1, groundY - h - 1, 3, 1);
  ctx.fillStyle = '#566078';
  ctx.fillRect(x, groundY - h, 1, h);
  ctx.fillStyle = '#28303e';
  ctx.fillRect(x + 2, groundY - h + 2, 1, 3);
  ctx.fillRect(x + 1, groundY - h + 3, 3, 1);
}

function shellDeco(ctx, x, y, rnd) {
  ctx.fillStyle = rnd() > 0.5 ? '#ff9c8a' : '#f0dcef';
  ctx.fillRect(x, y, 3, 1);
  ctx.fillRect(x + 1, y - 1, 1, 1);
}

function pyramid(ctx, cx, baseY, h, lit, shade) {
  for (let y = 0; y < h; y++) {
    const w = h - y;
    ctx.fillStyle = lit;
    ctx.fillRect(cx - w, baseY - y, w, 1);
    ctx.fillStyle = shade;
    ctx.fillRect(cx, baseY - y, w, 1);
  }
}

function cactus(ctx, x, groundY, h) {
  ctx.fillStyle = '#4e9440';
  ctx.fillRect(x, groundY - h, 3, h);
  ctx.fillRect(x - 2, groundY - h + 2, 2, 1);
  ctx.fillRect(x - 2, groundY - h, 1, 3);
  ctx.fillRect(x + 3, groundY - h + 3, 2, 1);
  ctx.fillRect(x + 4, groundY - h + 1, 1, 3);
  ctx.fillStyle = '#86c860';
  ctx.fillRect(x, groundY - h, 1, h);
}

function berryTree(ctx, x, groundY, rnd) {
  const h = 8 + Math.floor(rnd() * 6);
  ctx.fillStyle = '#7a4a2c';
  ctx.fillRect(x + 3, groundY - h + 4, 2, h - 4);
  circle(ctx, x + 4, groundY - h + 2, 5, '#3d7f37');
  circle(ctx, x + 3, groundY - h + 1, 3, '#5fa84a');
  ctx.fillStyle = '#d63a5a';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.floor(rnd() * 9), groundY - h - 1 + Math.floor(rnd() * 6), 1, 1);
}

function deadTree(ctx, x, groundY, h) {
  ctx.fillStyle = '#1e2618';
  ctx.fillRect(x, groundY - h, 2, h);
  ctx.fillRect(x - 3, groundY - h + 3, 3, 1);
  ctx.fillRect(x - 3, groundY - h + 1, 1, 2);
  ctx.fillRect(x + 2, groundY - h + 5, 3, 1);
  ctx.fillRect(x + 4, groundY - h + 2, 1, 3);
}

function dome(ctx, cx, groundY) {
  ctx.fillStyle = '#3a3658';
  ctx.fillRect(cx - 9, groundY - 10, 18, 10);
  circle(ctx, cx, groundY - 10, 8, '#5a5680');
  ctx.fillStyle = '#1a1638';
  ctx.fillRect(cx - 1, groundY - 18, 3, 8);
  ctx.fillStyle = '#8a86b0';
  ctx.fillRect(cx + 1, groundY - 21, 5, 2);
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(cx - 5, groundY - 6, 2, 2);
  ctx.fillRect(cx + 4, groundY - 6, 2, 2);
}
