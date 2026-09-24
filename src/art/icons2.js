// Trinket and relic icons for days 2-5, painted on a 16x16 Painter with the
// same shaded shapes as the monsters (lit from the top-left). compose() adds
// the outline. Each entry returns { rows, map }.

import { Painter } from './mobs.js';

const S = 16;
const R = {
  coral: ['#ffd8c8', '#ff8f7a', '#e0564e', '#9a2f3a'],
  shell: ['#f8ecd8', '#e6c9a0', '#b89468', '#7a5a3c'],
  pearl: ['#ffffff', '#f2eafa', '#cdbde4', '#8e7cb4'],
  sea: ['#d0fff6', '#74e0d0', '#2fa8a8', '#1c6a78'],
  brass: ['#fff2b8', '#eac25c', '#b8862b', '#6e4e18'],
  gold: ['#fff6c8', '#ffd36b', '#e0a52e', '#8f6424'],
  steel: ['#ffffff', '#cdd3e2', '#8e96ae', '#50546a'],
  rust: ['#f2b888', '#c8703e', '#8e4526', '#552a1a'],
  spark: ['#ffffe8', '#fff27a', '#f2c14e', '#b8862b'],
  glass: ['#ffffff', '#d4f6ff', '#9fd8ec', '#5a9ab8'],
  bone: ['#ffffff', '#efe6cf', '#c8bb98', '#8a7c62'],
  witch: ['#e0c2ff', '#a872dc', '#6e3ea0', '#3e2266'],
  shade: ['#b8aee0', '#7064a8', '#443a78', '#261f48'],
  drake: ['#ffb898', '#ea5a4a', '#b02e3c', '#6a1628'],
  ember: ['#fff4a8', '#ffc84a', '#f5803a', '#c8402e'],
  storm: ['#d8e6ff', '#8fb4ff', '#4b6cd1', '#283d8a'],
  crystal: ['#ffffff', '#ecdcff', '#b69ae6', '#7a5fb3'],
  wood: ['#e8b77a', '#b0763f', '#7a4a2c', '#4e2e1d'],
  cloth: ['#e8dcc4', '#c8b48e', '#9a8462', '#665236'],
  poison: ['#e6ffb0', '#9ee06a', '#5aa83e', '#2f6a2e'],
  blood: ['#ff9aa8', '#e04a5a', '#a8243c', '#5e1830'],
  heart: ['#ffe0ea', '#ff8fb0', '#e04a7a', '#8f2450'],
};
const H = (r) => r[0], L = (r) => r[1], M = (r) => r[2], D = (r) => r[3];

function ring(p, cx, cy, ro, ri, ramp) {
  p.ellipse(cx, cy, ro, ro * 0.85, ramp);
  p.ellipse(cx, cy + 0.3, ri, ri * 0.8, ['.', '.', '.', '.']);
}

// A little gold hourglass: frame top and bottom, glass between, sand in it.
function hourglass(p, frame, glass, sand) {
  p.rect(3, 1, 10, 2, M(frame)); p.rect(3, 1, 10, 1, L(frame));
  p.rect(3, 13, 10, 2, M(frame)); p.rect(3, 13, 10, 1, L(frame)); p.rect(3, 14, 10, 1, D(frame));
  p.poly([[4, 3], [12, 3], [8.5, 8], [7.5, 8]], L(glass));
  p.poly([[7.5, 8], [8.5, 8], [12, 13], [4, 13]], L(glass));
  p.poly([[5, 4], [11, 4], [8.4, 7], [7.6, 7]], L(sand));
  p.poly([[5.5, 10.5], [10.5, 10.5], [12, 13], [4, 13]], M(sand));
  p.line(8, 8, 8, 11, L(sand));
  p.px(4, 4, H(glass)); p.px(4, 11, H(glass)); p.px(5, 12, H(glass));
  p.rect(2, 3, 1, 10, D(frame)); p.rect(13, 3, 1, 10, D(frame));
}

const PAINT = {
  t_barnacle(p) {
    ring(p, 8, 9, 6, 3.4, R.coral);
    for (const [x, y] of [[4, 5], [11, 5], [8, 3.5], [13, 9]]) p.ellipse(x, y, 1.8, 1.6, R.shell);
    p.px(4, 5, D(R.shell)); p.px(11, 5, D(R.shell)); p.px(8, 3, D(R.shell));
  },
  t_static(p) {
    ring(p, 8, 8, 7, 5, R.brass);
    p.poly([[9, 3], [5, 9], [8, 9], [6.5, 13.5], [11.5, 7], [8.5, 7], [10.5, 3]], L(R.spark));
    p.line(9, 4, 6, 8, H(R.spark));
  },
  t_tear(p) {
    p.line(8, 0, 8, 3, M(R.brass));
    p.ellipse(8, 10, 4.6, 4.6, R.sea);
    p.poly([[8, 2.5], [4, 9], [12, 9]], L(R.sea));
    p.line(7, 4, 5, 8, H(R.sea));
    p.px(6, 9, H(R.sea)); p.px(10, 12, D(R.sea));
  },
  t_shell(p) {
    p.poly([[8, 2], [1, 11], [15, 11]], M(R.pearl));
    p.ellipse(8, 9, 7, 5, R.pearl, { clip: (x, y) => y <= 11 });
    for (const x of [4, 6.5, 9.5, 12]) p.line(8, 12, x, 5, M(R.pearl));
    p.rect(6, 12, 5, 2, M(R.shell)); p.rect(6, 12, 5, 1, L(R.shell));
    p.px(12, 2, 'n'); p.px(13, 1, 'n'); p.px(14, 3, 'N');
  },
  t_chrono(p) {
    p.rect(7, 0, 2, 2, M(R.brass));
    p.ellipse(8, 9, 6.5, 6.5, R.brass);
    p.ellipse(8, 9, 5, 5, ['#fffaf0', '#fffaf0', '#f1d9b5', '#cdb592']);
    p.line(8, 9, 8, 5, 'k'); p.line(8, 9, 11, 10, 'r');
    for (const [x, y] of [[8, 4.5], [12.5, 9], [8, 13.5], [3.5, 9]]) p.px(x, y, 'g');
  },
  t_lens(p) {
    p.line(10, 10, 14, 14, M(R.wood), 2);
    p.ellipse(7, 7, 6, 6, R.rust);
    p.ellipse(7, 7, 4.2, 4.2, ['#f0ffe8', '#c8f07a', '#8ec84e', '#5a8e32']);
    p.px(5, 5, 'w'); p.px(6, 4, 'w');
  },
  t_core(p) {
    p.rect(3, 2, 10, 12, M(R.rust)); p.rect(3, 2, 10, 1, L(R.rust)); p.rect(12, 3, 1, 11, D(R.rust));
    for (const y of [4, 11]) for (const x of [4, 11]) p.px(x, y, L(R.brass));
    p.ellipse(8, 8, 3.2, 3.2, R.ember);
    p.px(7, 7, 'h');
  },
  t_jar(p) {
    p.rect(5, 1, 6, 2, M(R.wood)); p.rect(5, 1, 6, 1, L(R.wood));
    p.line(8, 0, 8, 5, M(R.brass));
    p.ellipse(8, 10, 5.5, 5, R.glass);
    p.ellipse(8, 11, 3.5, 3, R.spark);
    p.line(7, 6, 9, 9, 'w'); p.line(9, 9, 7, 12, 'w');
    p.px(4, 8, 'w');
  },
  t_dice(p) {
    p.poly([[2, 5], [8, 2], [14, 5], [8, 8]], H(R.bone));
    p.poly([[2, 5], [8, 8], [8, 15], [2, 12]], L(R.bone));
    p.poly([[8, 8], [14, 5], [14, 12], [8, 15]], M(R.bone));
    p.px(8, 5, 'r'); p.px(4, 8, 'k'); p.px(6, 11, 'k'); p.px(10, 9, 'k'); p.px(12, 11, 'k'); p.px(11, 10, 'k');
  },
  t_doll(p) {
    p.ellipse(8, 5, 4, 4, R.cloth);
    p.poly([[5, 8], [11, 8], [13, 15], [3, 15]], M(R.cloth));
    p.line(2, 10, 6, 9, M(R.cloth), 2); p.line(10, 9, 14, 10, M(R.cloth), 2);
    p.px(6, 5, 'k'); p.px(10, 5, 'k'); p.px(6, 4, 'k'); p.px(10, 4, 'k');
    p.line(6, 7, 10, 7, 'k');
    p.line(5, 11, 11, 11, D(R.cloth));
    p.line(11, 0, 9, 9, 's'); p.px(11, 0, 'w');
    p.px(8, 12, 'p');
  },
  t_lantern(p) {
    p.line(5, 1, 8, 0, 'g'); p.line(8, 0, 11, 1, 'g');
    p.rect(4, 2, 8, 2, 'z'); p.rect(4, 2, 8, 1, 'x');
    p.rect(4, 4, 8, 9, '#3a2e5a');
    p.ellipse(8, 8.5, 2.6, 3.4, ['#f4ffe0', '#b8ff9a', '#6cd67a', '#3a8e5a']);
    p.rect(4, 4, 1, 9, 'z'); p.rect(11, 4, 1, 9, 'z'); p.rect(7.5, 4, 1, 9, 'z');
    p.rect(3, 13, 10, 2, 'z'); p.rect(3, 13, 10, 1, 'x');
  },
  t_mirror(p) {
    p.poly([[8, 0], [14, 6], [9, 15], [3, 9]], L(R.shade));
    p.poly([[8, 1.5], [12.5, 6], [8.5, 13], [4.5, 9]], L(R.glass));
    p.line(6, 5, 10, 10, 'w'); p.px(7, 4, 'w');
    p.poly([[8, 1.5], [12.5, 6], [10, 7]], M(R.glass));
  },
  t_wyrm(p) {
    p.ellipse(8, 9, 6, 5.5, R.drake);
    p.poly([[2, 8], [8, 15], [14, 8]], M(R.drake));
    p.ellipse(5.5, 7, 3.5, 3.2, R.drake);
    p.ellipse(10.5, 7, 3.5, 3.2, R.drake);
    p.ellipse(8, 9.5, 2, 2.2, R.ember);
    p.px(4, 5, H(R.drake)); p.px(5, 5, H(R.drake));
  },
  t_pact(p) {
    p.rect(2, 2, 12, 12, L(R.cloth)); p.rect(2, 2, 12, 1, H(R.cloth)); p.rect(13, 2, 1, 12, M(R.cloth));
    p.rect(1, 1, 14, 2, M(R.wood)); p.rect(1, 13, 14, 2, M(R.wood));
    for (const y of [5, 7, 9]) p.line(4, y, 11, y, D(R.cloth));
    p.ellipse(10, 11, 2.6, 2.6, R.drake);
    p.px(10, 11, H(R.ember));
  },
  t_totem(p) {
    p.rect(4, 3, 8, 12, M(R.wood)); p.rect(4, 3, 2, 12, L(R.wood)); p.rect(11, 3, 1, 12, D(R.wood));
    p.poly([[1, 3], [15, 3], [12, 0], [4, 0]], M(R.storm));
    p.rect(5, 6, 2, 2, L(R.spark)); p.rect(9, 6, 2, 2, L(R.spark));
    p.rect(6, 10, 4, 2, 'd');
    p.poly([[13, 5], [15, 5], [13.5, 9], [15, 9], [12, 15], [13, 10], [11.5, 10]], L(R.spark));
  },
  t_gem(p) {
    p.poly([[4, 2], [12, 2], [15, 6], [8, 15], [1, 6]], M(R.crystal));
    p.poly([[4, 2], [8, 2], [6, 6], [1, 6]], H(R.crystal));
    p.poly([[8, 2], [12, 2], [10, 6], [6, 6]], L(R.crystal));
    p.poly([[1, 6], [6, 6], [8, 15]], L(R.crystal));
    p.poly([[10, 6], [15, 6], [8, 15]], D(R.crystal));
    p.px(5, 3, 'w');
  },

  // ---- relics (gold-rimmed, a little grander)
  r_hourglass(p) {
    hourglass(p, R.gold, R.glass, R.poison);
    p.px(1, 1, 'h'); p.px(14, 0, 'h'); p.px(15, 1, 'y');
  },
  r_censer(p) {
    p.line(8, 0, 8, 3, 'g');
    p.ellipse(8, 10, 6, 4.5, R.brass);
    p.poly([[3, 7], [13, 7], [11, 4], [5, 4]], M(R.brass));
    p.rect(5, 4, 6, 1, L(R.brass));
    for (const x of [5, 8, 11]) p.px(x, 10, 'd');
    p.ellipse(13, 3, 2, 2, R.poison); p.ellipse(3, 2.5, 1.6, 1.6, R.poison); p.px(14, 6, L(R.poison));
    p.rect(6, 14, 4, 2, D(R.brass));
  },
  r_ebb(p) {
    p.ellipse(8, 8, 7.5, 7, R.sea);
    for (let i = 0; i < 3; i++) p.ellipse(8 - i * 0.6, 8 - i * 0.4, 5 - i * 1.6, 4.6 - i * 1.5, [H(R.pearl), L(R.pearl), M(R.pearl), M(R.sea)]);
    p.px(8, 7, 'w');
    p.px(1, 3, 'i'); p.px(14, 13, 'i');
  },
  r_conch(p) {
    p.poly([[1, 13], [6, 5], [15, 2], [11, 11]], M(R.shell));
    p.ellipse(8, 8, 5, 4, R.shell);
    p.poly([[1, 13], [5, 9], [8, 12]], L(R.coral));
    p.line(6, 6, 12, 4, D(R.shell)); p.line(7, 9, 13, 6, D(R.shell));
    p.px(14, 2, H(R.shell)); p.px(3, 12, H(R.coral));
  },
  r_core(p) {
    p.ellipse(8, 8, 7.5, 7.5, R.brass);
    for (let a = 0; a < 8; a++) {
      const x = 8 + Math.cos((a * Math.PI) / 4) * 7, y = 8 + Math.sin((a * Math.PI) / 4) * 7;
      p.rect(x - 1, y - 1, 2, 2, M(R.brass));
    }
    p.ellipse(8, 8, 4.5, 4.5, ['#ffe0e0', '#ff7a6a', '#d9434f', '#8f2437']);
    p.ellipse(8, 8, 2, 2, ['#ffffff', '#fff6d8', '#ffd36b', '#f58a3a']);
  },
  r_bottle(p) {
    p.rect(6, 0, 4, 2, M(R.wood)); p.rect(6, 0, 4, 1, L(R.wood));
    p.rect(6.5, 2, 3, 2, L(R.glass));
    p.ellipse(8, 10, 6, 5.5, R.glass);
    p.ellipse(8, 10.5, 4.5, 4, ['#6a7cc8', '#4b6cd1', '#283d8a', '#1a2660']);
    p.poly([[9, 6], [6, 10], [8, 10], [6.5, 14], [10.5, 9], [8.5, 9], [10, 6]], L(R.spark));
    p.px(4, 8, 'w'); p.px(4, 9, 'w');
  },
  r_chalice(p) {
    p.poly([[2, 1], [14, 1], [12, 7], [4, 7]], M(R.gold));
    p.rect(2, 1, 12, 1, L(R.gold));
    p.rect(3, 2, 10, 2, M(R.blood)); p.rect(3, 2, 10, 1, L(R.blood));
    p.ellipse(8, 7, 4, 2, R.gold);
    p.rect(7, 8, 2, 4, M(R.gold)); p.rect(7, 8, 1, 4, L(R.gold));
    p.ellipse(8, 13.5, 5, 1.8, R.gold);
    p.px(4, 5, H(R.gold)); p.px(12, 3, 'r'); p.px(12, 4, 'R');
  },
  r_mirror(p) {
    p.rect(7, 12, 2, 4, M(R.wood));
    p.ellipse(8, 6.5, 6.5, 6.5, R.witch);
    p.ellipse(8, 6.5, 4.8, 4.8, ['#4a3a6e', '#3a2e5a', '#2a2244', '#1a1430']);
    p.px(7, 5, 'c'); p.px(9, 5, 'c'); p.line(7, 8, 9, 8, 'p');
    p.line(5, 3, 7, 2, '#9a8ac4');
    p.px(2, 1, 'p'); p.px(14, 2, 'p');
  },
  r_feather(p) {
    p.poly([[13, 1], [15, 3], [6, 12], [3, 11]], M(R.ember));
    p.poly([[13, 1], [5, 5], [3, 11]], L(R.ember));
    p.poly([[15, 3], [11, 11], [6, 12]], M(R.drake));
    p.line(14, 2, 3, 13, H(R.ember));
    p.line(3, 13, 1, 15, D(R.drake));
    p.px(8, 4, 'h'); p.px(12, 8, 'y');
  },
  r_glass(p) {
    p.ellipse(5.5, 6, 4, 4, R.heart); p.ellipse(10.5, 6, 4, 4, R.heart);
    p.poly([[1.5, 7], [14.5, 7], [8, 15]], M(R.heart));
    p.poly([[1.5, 7], [8, 7], [8, 15]], L(R.heart));
    p.line(8, 4, 6, 8, 'w'); p.line(6, 8, 9, 10, 'w'); p.line(9, 10, 7, 13, 'w');
    p.px(4, 4, 'w'); p.px(4, 5, H(R.heart));
  },
};

const cache = {};
export function paintedIcon(name) {
  if (!PAINT[name]) return null;
  if (!cache[name]) {
    const p = new Painter(S, S);
    PAINT[name](p);
    cache[name] = p.rows({});
  }
  return cache[name];
}
export const PAINTED_ICONS = Object.keys(PAINT);
