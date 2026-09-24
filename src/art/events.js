// First-person event scenes, 96x72, eight looping frames each. Built like the
// monsters: shaded ellipses lit from the top-left, flat polygons, then
// compose() outlines the character. Each scene has three layers:
//   bg - the room behind, no outline
//   fg - the character, outlined
//   fx - things in front (a counter, candles, sparks), no outline
// `eventFrames(id)` returns the eight frames as canvases, built once.

import { Painter } from './mobs.js';
import { compose, gridToCanvas } from './pixel.js';

export const EW = 96, EH = 72, EFRAMES = 8;

const R = {
  gob: ['#d8f5a0', '#9ed36a', '#5fa84a', '#2f6a2e'],
  gobEar: ['#ffc8cc', '#f28bb0', '#bf5a84', '#7a2e50'],
  vest: ['#c69af0', '#8a52c0', '#5a3088', '#361c56'],
  wood: ['#e8b77a', '#b0763f', '#7a4a2c', '#4e2e1d'],
  gold: ['#fff6c8', '#ffd36b', '#e0a52e', '#8f6424'],
  gem: ['#ffffff', '#8ff0e0', '#3cb8b0', '#227079'],
  demon: ['#ff9c8a', '#d63e3e', '#8f2437', '#4a0e1e'],
  horn: ['#fffaf0', '#e0d2b0', '#a8977a', '#5e5040'],
  paper: ['#fffaf0', '#f1e2c0', '#d4bf94', '#a0885c'],
  ghost: ['#f4fbff', '#c8ecf8', '#8ac4e0', '#5a8ab8'],
  skin: ['#ffe0c8', '#f2b890', '#c8845c', '#8a5236'],
  beard: ['#ffd08a', '#e8904a', '#b05a2a', '#6a3218'],
  steel: ['#ffffff', '#cdd3e2', '#8e96ae', '#50546a'],
  iron: ['#8e96ae', '#5a6078', '#3a3e52', '#22242e'],
  stone: ['#b8b0c8', '#8a82a0', '#5e5874', '#3a3648'],
  orb: ['#ffffff', '#d0fff6', '#74e0d0', '#2fa8a8'],
  water: ['#fff6c8', '#ffd36b', '#b8862b', '#5a3a10'],
  flame: ['#ffffe0', '#fff27a', '#f5803a', '#c8402e'],
};
const BOB = [0, 0, 0, 1, 1, 1, 1, 0];

// ---------------------------------------------------------------- helpers

function bands(p, colors, y0 = 0, y1 = EH) {
  const h = Math.ceil((y1 - y0) / colors.length);
  colors.forEach((c, i) => {
    p.rect(0, y0 + i * h, EW, h, c);
    // checker seam into the next band
    if (i > 0) for (let x = (i % 2); x < EW; x += 2) p.px(x, y0 + i * h - 1, c);
  });
}
// A soft glow drawn as a dithered disc of one colour.
function glow(p, cx, cy, r, color) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = (x * x + y * y) / (r * r);
    if (d > 1) continue;
    if (d < 0.35 || (x + y) % 2 === 0) p.px(cx + x, cy + y, color);
  }
}
function flame(p, x, y, h, f) {
  const sway = [0, 1, 0, -1, 0, 1, 1, 0][f];
  p.poly([[x - 2, y], [x + sway, y - h], [x + 2, y]], R.flame[2]);
  p.poly([[x - 1, y], [x + sway, y - h + 2], [x + 1, y]], R.flame[1]);
  p.px(x, y - 1, R.flame[0]);
}
function candle(p, x, y, f) {
  p.rect(x - 2, y, 4, 9, '#f1e2c0');
  p.rect(x - 2, y, 1, 9, '#fffaf0');
  p.rect(x + 1, y, 1, 9, '#d4bf94');
  p.px(x, y - 1, '#3a2e2a');
  flame(p, x, y - 1, 4 + (f % 3 === 0 ? 1 : 0), f);
}
function eyeOpen(p, x, y, iris, rx = 3.5, ry = 4) {
  p.ellipse(x, y, rx, ry, ['#ffffff', '#ffffff', '#f0f4ff', '#c8d0e0']);
  p.rect(x - 0.5, y - ry + 1.5, 2, ry * 2 - 3, iris);
  p.px(x - 1, y - 2, '#ffffff');
}
function eyeShut(p, x, y, color, w = 7) {
  p.line(x - w / 2, y, x + w / 2, y, color);
}

// ---------------------------------------------------------------- scenes

const SCENES = {
  gremlin(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    const b = BOB[f];
    bands(bg, ['#15101f', '#1e1730', '#281f3e', '#30264a']);
    // stalactites
    for (const [x, h] of [[6, 10], [20, 6], [70, 12], [84, 7], [92, 9]]) bg.poly([[x - 4, 0], [x, h], [x + 4, 0]], '#3a2e52');
    // hanging lantern with a flickering glow
    glow(bg, 14, 22, 11 + (f % 4 === 1 ? 1 : 0), '#3e2a36');
    bg.line(14, 0, 14, 16, '#5a4a3a');
    bg.rect(11, 17, 7, 8, '#8f6424'); bg.rect(12, 18, 5, 6, '#ffd36b'); bg.rect(13, 19, 3, 3, '#fff6c8');
    // shelves of junk behind him
    bg.rect(66, 30, 30, 2, '#4e2e1d');
    for (const [x, c] of [[70, '#c8402e'], [76, '#3cb8b0'], [83, '#ffd36b'], [89, '#8a52c0']]) bg.rect(x, 25, 4, 5, c);
    // body and vest
    fg.ellipse(48, 62 + b, 15, 12, R.gob);
    fg.poly([[36, 56 + b], [60, 56 + b], [62, 72], [34, 72]], R.vest[2]);
    fg.poly([[36, 56 + b], [44, 56 + b], [42, 72], [34, 72]], R.vest[1]);
    for (const y of [60, 65, 70]) fg.px(48, y + b, '#ffd36b');
    // ears, twitching
    const tw = f === 2 || f === 3 ? -2 : 0;
    fg.poly([[36, 30 + b], [12, 20 + b + tw], [18, 28 + b + tw], [35, 40 + b]], R.gob[2]);
    fg.poly([[33, 31 + b], [17, 23 + b + tw], [32, 37 + b]], R.gobEar[1]);
    fg.poly([[60, 30 + b], [84, 20 + b], [78, 28 + b], [61, 40 + b]], R.gob[2]);
    fg.poly([[63, 31 + b], [79, 23 + b], [64, 37 + b]], R.gobEar[2]);
    // head
    fg.ellipse(48, 35 + b, 16, 13, R.gob);
    // eyes: big, yellow, slitted; a slow blink
    if (f === 6) { eyeShut(fg, 41, 32 + b, R.gob[3], 8); eyeShut(fg, 55, 32 + b, R.gob[3], 8); } else {
      for (const x of [41, 55]) {
        fg.ellipse(x, 32 + b, 4.5, 5, ['#fffbe0', '#fff27a', '#f2c14e', '#b8862b']);
        fg.rect(x, 29 + b, 1, 7, '#1a1423');
        fg.px(x - 2, 30 + b, '#ffffff');
      }
    }
    // hooked nose and toothy grin
    fg.poly([[46, 35 + b], [52, 35 + b], [50, 42 + b]], R.gob[2]);
    fg.poly([[38, 43 + b], [58, 43 + b], [54, 48 + b], [42, 48 + b]], '#3a1020');
    for (const x of [40, 44, 48, 52, 56]) fg.px(x, 43 + b, '#fffaf0');
    fg.px(50, 47 + b, '#fffaf0');
    // hands up front, the right one holding out a gem
    fg.ellipse(33, 54 + b, 4, 3.5, R.gob); fg.ellipse(64, 50 + b, 4, 3.5, R.gob);
    fg.poly([[62, 42 + b], [66, 38 + b], [70, 42 + b], [66, 47 + b]], R.gem[2]);
    fg.poly([[62, 42 + b], [66, 38 + b], [66, 47 + b]], R.gem[1]);
    // a sparkle on the gem
    if (f === 1 || f === 5) fx.stamp(['.w.', 'www', '.w.'], 66, 36 + b, { w: '#ffffff' });
    // the counter, with his wares
    fx.rect(0, 62, EW, 10, R.wood[2]); fx.rect(0, 62, EW, 2, R.wood[1]); fx.rect(0, 70, EW, 2, R.wood[3]);
    fx.ellipse(16, 60, 4, 2.2, R.gold); fx.ellipse(22, 61, 3, 1.6, R.gold);
    fx.rect(78, 54, 5, 8, '#3cb8b0'); fx.rect(79, 52, 3, 2, '#7a4a2c'); fx.px(79, 56, '#d0fff6');
    fx.ellipse(88, 59, 4, 3.5, ['#fffaf0', '#efe6cf', '#c8bb98', '#8a7c62']); fx.px(87, 58, '#1a1423'); fx.px(89, 58, '#1a1423');
    return { bg, fg, fx };
  },

  demon(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    const b = BOB[f];
    bands(bg, ['#1a0610', '#2e0a18', '#4a0e1e', '#6e1a2e']);
    // a wall of fire behind
    for (let x = 2; x < EW; x += 7) {
      const h = 14 + ((x * 7 + f * 5) % 9);
      bg.poly([[x - 5, EH], [x, EH - h], [x + 5, EH]], '#a8243c');
      bg.poly([[x - 3, EH], [x, EH - h + 6], [x + 3, EH]], '#e0564e');
    }
    // embers drifting up
    for (let i = 0; i < 9; i++) bg.px((i * 23 + f * 3) % EW, (60 - i * 7 - f * 4 + 80) % 60, i % 2 ? '#ffc84a' : '#f5803a');
    // shoulders
    fg.ellipse(48, 72, 34, 16, R.demon);
    // horns, curling up and out
    fg.poly([[34, 26 + b], [18, 16 + b], [12, 2 + b], [20, 12 + b], [32, 18 + b]], R.horn[2]);
    fg.poly([[34, 26 + b], [22, 16 + b], [12, 2 + b], [30, 22 + b]], R.horn[1]);
    fg.poly([[62, 26 + b], [78, 16 + b], [84, 2 + b], [76, 12 + b], [64, 18 + b]], R.horn[2]);
    fg.poly([[62, 26 + b], [74, 16 + b], [84, 2 + b], [66, 22 + b]], R.horn[1]);
    // head
    fg.ellipse(48, 38 + b, 16, 18, R.demon);
    // brows and glowing eyes
    fg.line(36, 30 + b, 45, 34 + b, R.demon[3], 2); fg.line(60, 30 + b, 51, 34 + b, R.demon[3], 2);
    if (f === 6) { eyeShut(fg, 41, 36 + b, '#ffd36b', 6); eyeShut(fg, 55, 36 + b, '#ffd36b', 6); } else {
      for (const x of [41, 55]) { fg.rect(x - 3, 35 + b, 7, 3, '#fff27a'); fg.rect(x - 1, 35 + b, 2, 3, '#c8402e'); }
    }
    // nose ridge and a wide grin with fangs
    fg.line(48, 38 + b, 48, 43 + b, R.demon[3]);
    fg.poly([[36, 46 + b], [60, 46 + b], [55, 52 + b], [41, 52 + b]], '#1a0610');
    for (let x = 38; x <= 58; x += 3) fg.px(x, 46 + b, '#fffaf0');
    fg.poly([[40, 46 + b], [42, 46 + b], [41, 50 + b]], '#fffaf0'); fg.poly([[54, 46 + b], [56, 46 + b], [55, 50 + b]], '#fffaf0');
    // goatee
    fg.poly([[45, 54 + b], [51, 54 + b], [48, 61 + b]], R.demon[3]);
    // a clawed hand offering the contract
    fx.poly([[26, 58], [70, 56], [72, 72], [24, 72]], R.paper[1]);
    fx.poly([[26, 58], [36, 58], [34, 72], [24, 72]], R.paper[0]);
    for (const y of [61, 64, 67]) fx.line(32, y, 62, y - 1, R.paper[3]);
    fx.ellipse(62, 68, 3.5, 3, ['#ff9aa8', '#e04a5a', '#a8243c', '#5e1830']);
    fx.ellipse(74, 60, 6, 5, R.demon);
    for (const [x, y] of [[69, 57], [71, 55], [74, 54]]) fx.line(x, y, x - 3, y - 2, R.horn[1]);
    // quill
    fx.line(78, 52, 86, 40, '#1a1423'); fx.poly([[84, 42], [90, 36], [86, 44]], '#3a2e2a');
    // candles either side
    candle(fx, 10, 58, f); candle(fx, 88, 60, (f + 3) % 8);
    return { bg, fg, fx };
  },

  tailor(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    const b = [0, -1, -2, -2, -1, 0, 1, 1][f]; // ghosts float
    bands(bg, ['#1e1a38', '#28224a', '#322a58', '#3a3066']);
    // shelves of thread
    for (const y of [16, 34]) {
      bg.rect(0, y, 22, 2, '#4e3a2c'); bg.rect(74, y, 22, 2, '#4e3a2c');
      [[3, '#e04a5a'], [9, '#3cb8b0'], [15, '#ffd36b'], [77, '#9a5cc6'], [83, '#6cc24a'], [89, '#f28bb0']].forEach(([x, c]) => bg.rect(x, y - 6, 4, 6, c));
    }
    // a dress dummy behind, left
    bg.ellipse(12, 52, 7, 9, ['#6a5a8a', '#56487a', '#46396a', '#342a56']); bg.rect(11, 61, 2, 11, '#4e3a2c');
    // body: a tapering sheet with a wavy tail
    const wob = [0, 1, 2, 1, 0, -1, -2, -1][f];
    fg.poly([[34, 44 + b], [62, 44 + b], [66, 66], [58 + wob, 72], [50, 66], [44 - wob, 72], [30, 66]], R.ghost[1]);
    fg.poly([[34, 44 + b], [44, 44 + b], [40, 70], [30, 66]], R.ghost[0]);
    // head
    fg.ellipse(48, 32 + b, 14, 14, R.ghost);
    // spectacles
    for (const x of [42, 54]) {
      fg.ellipse(x, 31 + b, 4, 4, ['#8f6424', '#8f6424', '#8f6424', '#5a3a10']);
      fg.ellipse(x, 31 + b, 3, 3, ['#ffffff', '#e8f8ff', '#c8ecf8', '#a8d8f0']);
      if (f !== 6) fg.rect(x - 1, 31 + b, 2, 2, '#2a2238'); else fg.line(x - 2, 32 + b, x + 1, 32 + b, '#2a2238');
    }
    fg.line(46, 31 + b, 50, 31 + b, '#8f6424');
    if (f === 2) fg.px(40, 29 + b, '#ffffff');
    // a small smile
    fg.line(45, 39 + b, 51, 39 + b, '#5a8ab8'); fg.px(44, 38 + b, '#5a8ab8'); fg.px(52, 38 + b, '#5a8ab8');
    // measuring tape round the neck
    fg.line(38, 44 + b, 58, 44 + b, '#ffd36b'); fg.line(40, 44 + b, 38, 56 + b, '#ffd36b'); fg.line(56, 44 + b, 59, 58 + b, '#ffd36b');
    for (let y = 46; y <= 56; y += 3) fg.px(39, y + b, '#8f6424');
    // arm with a needle, thread waving
    fg.ellipse(66, 46 + b, 4, 3.5, R.ghost);
    fx.line(68, 44 + b, 76, 34 + b, '#cdd3e2'); fx.px(76, 34 + b, '#ffffff');
    for (let i = 0; i < 14; i++) fx.px(76 + i, 34 + b + Math.round(Math.sin((i + f) * 0.8) * 2), '#e04a5a');
    // floating spools
    for (const [x, y, c, ph] of [[20, 24, '#6cc24a', 0], [80, 50, '#e04a5a', 3], [86, 22, '#3cb8b0', 5]]) {
      const yy = y + [0, -1, -1, 0, 1, 1, 0, 0][(f + ph) % 8];
      fx.rect(x - 3, yy - 3, 6, 1, '#b0763f'); fx.rect(x - 3, yy + 3, 6, 1, '#b0763f');
      fx.rect(x - 2, yy - 2, 4, 5, c);
    }
    return { bg, fg, fx };
  },

  smith(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    bands(bg, ['#1e1210', '#2a1a16', '#36221c', '#402822']);
    // brick wall
    for (let y = 2; y < 50; y += 6) for (let x = ((y / 6) % 2) * 6; x < EW; x += 12) bg.rect(x, y, 11, 5, '#4a2e26');
    // the forge mouth, glowing
    glow(bg, 82, 44, 13 + (f % 2), '#8a3a1e');
    bg.ellipse(82, 46, 10, 8, R.flame, { clip: (x, y) => y <= 50 });
    bg.rect(70, 50, 24, 4, '#2a1a16');
    // hammer arm position: raised, raised, raised, swinging, strike, strike, rising, raised
    const up = [0, 0, 0, 1, 2, 2, 1, 0][f];
    const b = up === 2 ? 1 : 0;
    // stout body
    fg.ellipse(46, 66, 20, 12, R.iron);
    fg.rect(30, 62, 32, 3, '#6a4128'); fg.rect(44, 61, 5, 5, R.gold[2]);
    // beard, big and braided
    fg.ellipse(46, 50 + b, 13, 12, R.beard);
    fg.poly([[40, 58 + b], [44, 58 + b], [42, 70 + b]], R.beard[2]); fg.poly([[48, 58 + b], [52, 58 + b], [50, 70 + b]], R.beard[2]);
    fg.rect(40, 64 + b, 4, 2, R.gold[1]); fg.rect(48, 64 + b, 4, 2, R.gold[1]);
    // face
    fg.ellipse(46, 36 + b, 11, 10, R.skin);
    fg.ellipse(46, 40 + b, 4, 3, ['#ffb8a0', '#f28b7a', '#c85a4a', '#8a3226']);
    fg.line(38, 32 + b, 44, 33 + b, R.beard[3], 2); fg.line(54, 32 + b, 48, 33 + b, R.beard[3], 2);
    if (f === 6) { eyeShut(fg, 41, 35 + b, '#1a1423', 4); eyeShut(fg, 51, 35 + b, '#1a1423', 4); } else { fg.rect(40, 35 + b, 2, 2, '#1a1423'); fg.rect(50, 35 + b, 2, 2, '#1a1423'); }
    // helmet with a crest
    fg.ellipse(46, 28 + b, 13, 8, R.steel, { clip: (x, y) => y <= 29 + b });
    fg.rect(32, 28 + b, 28, 2, R.steel[2]);
    fg.poly([[44, 20 + b], [46, 12 + b], [48, 20 + b]], R.gold[1]);
    // hammer arm
    const arm = [[70, 22], [72, 34], [66, 46]][up];
    fg.line(58, 50, arm[0], arm[1] + 6, R.skin[2], 4);
    fg.ellipse(arm[0], arm[1] + 6, 3.5, 3.5, R.skin);
    const head = [[70, 12], [80, 28], [62, 50]][up];
    fx.line(arm[0], arm[1] + 6, head[0], head[1] + 4, R.wood[2], 2);
    fx.rect(head[0] - 5, head[1], 10, 7, R.iron[1]); fx.rect(head[0] - 5, head[1], 10, 2, R.steel[1]);
    // the anvil, in front
    fx.poly([[40, 60], [76, 60], [72, 64], [44, 64]], R.iron[1]);
    fx.poly([[76, 60], [88, 61], [76, 63]], R.iron[2]);
    fx.rect(40, 59, 36, 2, R.steel[2]);
    fx.rect(52, 64, 12, 6, R.iron[2]); fx.rect(46, 70, 24, 2, R.iron[3]);
    // a glowing blade on the anvil, and sparks when it lands
    fx.rect(50, 57, 14, 2, '#ffc84a'); fx.px(63, 57, '#fff6c8');
    if (up === 2) for (const [dx, dy] of [[-6, -6], [-3, -9], [3, -8], [7, -5], [9, -2], [-9, -2]]) fx.px(60 + dx + (f % 2), 54 + dy, f % 2 ? '#fff27a' : '#ffffff');
    return { bg, fg, fx };
  },

  mimic(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    bands(bg, ['#16121f', '#1e1a2a', '#241e32']);
    // stone wall
    for (let y = 0; y < 54; y += 7) for (let x = ((y / 7) % 2) * 8 - 8; x < EW; x += 16) bg.rect(x + 1, y + 1, 14, 5, '#2e2a3e');
    bg.rect(0, 54, EW, 18, '#2a2438'); for (let x = 0; x < EW; x += 9) bg.line(x, 54, x - 6, 72, '#221e30');
    // torches
    for (const [x, ph] of [[10, 0], [86, 4]]) {
      glow(bg, x, 22, 9, '#3e2a2e');
      bg.rect(x - 1, 22, 3, 10, '#4e2e1d');
      flame(bg, x, 22, 6, (f + ph) % 8);
    }
    // the chest: lid lifts a crack, eyes and teeth in the dark, the tongue tastes the air
    const open = [0, 0, 0, 0, 1, 2, 1, 0][f];
    fg.rect(28, 44, 40, 20, R.wood[2]); fg.rect(28, 44, 40, 3, R.wood[1]); fg.rect(28, 61, 40, 3, R.wood[3]);
    for (const x of [28, 46, 64]) fg.rect(x, 44, 4, 20, R.gold[2]);
    fg.rect(46, 50, 4, 6, R.gold[1]); fg.px(47, 52, '#1a1423'); fg.px(48, 52, '#1a1423');
    if (open) {
      fg.rect(29, 42 - open * 2, 38, open * 2 + 2, '#0a0610');
      fg.rect(36, 42 - open * 2 + 1, 2, 1, '#ff4a5a'); fg.rect(58, 42 - open * 2 + 1, 2, 1, '#ff4a5a');
      for (let x = 31; x < 66; x += 3) fg.px(x, 43, '#fffaf0');
      if (open === 2) fg.poly([[44, 44], [52, 44], [50, 52], [46, 52]], '#e0567a');
    }
    const ly = 42 - open * 3;
    fg.ellipse(48, ly - 4, 21, 7, R.wood, { clip: (x, y) => y <= ly });
    fg.rect(27, ly - 1, 42, 2, R.gold[2]);
    for (const x of [28, 46, 64]) fg.rect(x, ly - 9, 4, 9, R.gold[2]);
    // coins spilling out front
    for (const [x, y] of [[26, 66], [31, 68], [66, 67], [70, 65]]) fx.ellipse(x, y, 2.5, 1.5, R.gold);
    if (f === 2) fx.stamp(['.w.', 'www', '.w.'], 68, 62, { w: '#ffffff' });
    return { bg, fg, fx };
  },

  shrine(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    bands(bg, ['#0a1620', '#0e1e2a', '#122634', '#16303e']);
    // pillars
    for (const x of [8, 80]) {
      bg.rect(x, 6, 8, 60, '#2a4a58'); bg.rect(x, 6, 2, 60, '#3e6a78'); bg.rect(x - 2, 4, 12, 3, '#3e6a78'); bg.rect(x - 2, 64, 12, 4, '#2a4a58');
    }
    // runes floating up
    for (let i = 0; i < 6; i++) {
      const x = 24 + i * 9, y = 60 - ((f * 3 + i * 11) % 50);
      bg.stamp(i % 2 ? ['x.x', '.x.', 'x.x'] : ['.x.', 'xxx', '.x.'], x, y, { x: '#3cb8b0' });
    }
    // echo rings from the orb
    const oy = 30 + [0, -1, -1, 0, 1, 1, 0, 0][f];
    for (const k of [0, 4]) {
      const rr = 6 + ((f + k) % 8) * 3;
      for (let a = 0; a < 48; a++) {
        const t = (a / 48) * Math.PI * 2;
        if (a % 2 === 0) bg.px(48 + Math.cos(t) * rr, oy + Math.sin(t) * rr * 0.8, rr > 22 ? '#1e4a58' : '#3cb8b0');
      }
    }
    // the orb, floating
    fg.ellipse(48, oy, 8, 8, R.orb);
    fg.px(45, oy - 4, '#ffffff'); fg.px(44, oy - 3, '#ffffff');
    // altar
    fx.poly([[30, 50], [66, 50], [62, 58], [34, 58]], R.stone[1]);
    fx.rect(36, 58, 24, 12, R.stone[2]); fx.rect(36, 58, 3, 12, R.stone[1]); fx.rect(30, 48, 36, 3, R.stone[0]);
    fx.stamp(['.x.x.', 'x.x.x', '.x.x.'], 46, 61, { x: '#3cb8b0' });
    return { bg, fg, fx };
  },

  well(f) {
    const bg = new Painter(EW, EH), fg = new Painter(EW, EH), fx = new Painter(EW, EH);
    bands(bg, ['#0a1020', '#0e1a2e', '#12223a', '#16283e']);
    // moon and trees
    bg.ellipse(78, 12, 6, 6, ['#ffffff', '#f4f1ff', '#d8d4ee', '#b8b4d8']);
    for (const [x, h] of [[6, 40], [18, 30], [70, 34], [90, 44]]) {
      bg.poly([[x - 8, 60], [x, 60 - h], [x + 8, 60]], '#0e2a22');
      bg.poly([[x - 6, 48], [x, 60 - h + 6], [x + 6, 48]], '#143628');
    }
    bg.rect(0, 58, EW, 14, '#16301e'); bg.rect(0, 58, EW, 2, '#1e4028');
    // posts and roof
    fg.rect(24, 16, 3, 34, R.wood[2]); fg.rect(69, 16, 3, 34, R.wood[2]);
    fg.poly([[18, 18], [48, 6], [78, 18]], R.wood[3]); fg.poly([[18, 18], [48, 8], [48, 18]], R.wood[2]);
    fg.line(26, 22, 70, 22, R.wood[1], 2);
    // rope and bucket, swaying
    const sw = [0, 1, 1, 0, 0, -1, -1, 0][f];
    fg.line(48, 22, 48 + sw, 34, '#c8b48e');
    fg.rect(45 + sw, 34, 7, 6, R.wood[1]); fg.rect(45 + sw, 34, 7, 1, R.iron[1]);
    // stone rim
    fg.ellipse(48, 52, 26, 8, R.stone);
    fg.rect(22, 52, 52, 12, R.stone[2]);
    for (let x = 24; x < 72; x += 8) fg.rect(x, 54 + ((x / 8) % 2) * 4, 7, 3, R.stone[1]);
    // glowing water with coins turning below
    fg.ellipse(48, 51, 20, 5, R.water);
    for (const [x, ph] of [[40, 0], [52, 3], [58, 6]]) if ((f + ph) % 8 < 4) fg.px(x, 51, '#ffffff');
    // fireflies
    for (let i = 0; i < 7; i++) {
      const x = (i * 17 + f * (i % 2 ? 2 : -2) + 96) % 96, y = 20 + ((i * 13 + f) % 30);
      fx.px(x, y, (f + i) % 3 ? '#d8f06a' : '#fffbe0');
    }
    return { bg, fg, fx };
  },
};

// ---------------------------------------------------------------- frames

const cache = {};
export function eventFrames(id) {
  if (cache[id]) return cache[id];
  const draw = SCENES[id] || SCENES.well;
  const frames = [];
  for (let f = 0; f < EFRAMES; f++) {
    const { bg, fg, fx } = draw(f);
    const c = document.createElement('canvas');
    c.width = EW; c.height = EH;
    const ctx = c.getContext('2d');
    for (const [p, outline] of [[bg, false], [fg, true], [fx, false]]) {
      const { rows, map } = p.rows({});
      ctx.drawImage(gridToCanvas(compose(EW, EH, [{ rows, map, shadow: false }], { outline })), 0, 0);
    }
    frames.push(c);
  }
  return (cache[id] = frames);
}
export const EVENT_SCENES = Object.keys(SCENES);
