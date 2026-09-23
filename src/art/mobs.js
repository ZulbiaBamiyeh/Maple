// Mob sprites, 32x32, facing left (toward the hero).
// Built from shaded primitives: each ellipse is lit from the top-left in four
// flat bands (no gradients, no anti-aliasing), then features are stamped on
// top and the whole thing is outlined by compose().

import { compose } from './pixel.js';

const W = 32, H = 32;

class Painter {
  constructor() {
    this.g = Array.from({ length: H }, () => new Array(W).fill('.'));
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) this.g[y][x] = c;
  }
  // ramp: [highlight, light, mid, dark]
  ellipse(cx, cy, rx, ry, ramp, { clip = null, light = [-0.55, -0.7, 0.45] } = {}) {
    const [lx, ly, lz] = norm(light);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        if (clip && !clip(x, y)) continue;
        const nz = Math.sqrt(1 - r2);
        const d = nx * lx + ny * ly + nz * lz;
        const c = d > 0.86 ? ramp[0] : d > 0.45 ? ramp[1] : d > 0.02 ? ramp[2] : ramp[3];
        this.px(x, y, c);
      }
    }
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  stamp(rows, x, y) {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) if (r[i] !== '.') this.px(x + i, y + j, r[i]);
    });
  }
  rows() {
    return this.g.map((r) => r.join(''));
  }
}

const norm = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

// Extra colours used only by mobs.
const MOB_MAP = {
  1: '#2b5e2e', // deep slime green
  2: '#e9d5b0', // stem light
  3: '#c9ab82', // stem shade
  4: '#8e7358', // stem dark
  5: '#8c5a3a', // boar mid
  6: '#5e3a26', // boar dark
  7: '#b27b50', // boar light
  8: '#f2a7b5', // snout
  9: '#c9788a', // snout shade
  A: '#9aa3a8', // golem light
  D: '#6e7479', // golem mid
  F: '#484b55', // golem dark
  G: '#c7cdd0', // golem hi
  H: '#5cc8ff', // wisp core
  K: '#ff6a3d', // imp mid
  L: '#c23232', // imp dark
  O: '#ffb08a', // imp light
  S: '#7a1c2c', // imp deepest
  T: '#9fe0ff', // wisp mid
  U: '#ecfbff', // wisp hi
  V: '#5aa7e0', // wisp dark
};

function slime() {
  const p = new Painter();
  p.ellipse(16, 21.5, 13, 9.5, ['l', 'l', 'e', 'E'], { clip: (x, y) => y <= 29 });
  p.ellipse(18, 13, 4.5, 3.5, ['l', 'l', 'e', 'E']);
  p.rect(5, 29, 22, 1, 'E');
  p.rect(8, 29, 16, 1, '1');
  // shine
  p.stamp(['.www', 'ww..', 'w...'], 7, 15);
  p.px(19, 11, 'w');
  // face (looking left)
  p.stamp(['oo...oo', 'wo...wo', 'oo...oo'], 8, 20);
  p.stamp(['n.....n'], 7, 23);
  p.stamp(['o.o', '.o.'], 10, 24);
  return p.rows();
}

function shroom() {
  const p = new Painter();
  // stem
  p.ellipse(16, 22, 7, 7.5, ['h', '2', '3', '4'], { clip: (x, y) => y >= 15 && y <= 28 });
  p.rect(10, 28, 4, 2, '4');
  p.rect(18, 28, 4, 2, '4');
  // cap
  p.ellipse(16, 14, 14, 10, ['N', 'r', 'r', 'R'], { clip: (x, y) => y <= 16 });
  p.rect(3, 16, 26, 1, 't');
  // spots
  p.stamp(['.ww.', 'wwww', 'wwvw', '.vv.'], 7, 7);
  p.stamp(['ww', 'wv'], 14, 5);
  p.stamp(['.ww.', 'wwww', '.wv.'], 19, 9);
  p.stamp(['ww', 'vv'], 25, 12);
  p.stamp(['ww'], 4, 13);
  // grumpy face on the stem
  p.stamp(['oo..oo'], 11, 19);
  p.stamp(['wo..wo', 'oo..oo'], 11, 20);
  p.stamp(['.ooo.'], 12, 24);
  return p.rows();
}

function boar() {
  const p = new Painter();
  // back legs
  p.rect(22, 25, 3, 5, '6');
  p.rect(26, 24, 3, 5, '6');
  // body
  p.ellipse(19, 19, 11, 8, ['7', '7', '5', '6']);
  // mane ridge
  p.stamp(['..6.6.6.6.', '.66666666.', '6666666666'], 13, 10);
  // tail
  p.stamp(['.66', '6.6', '..6'], 29, 16);
  // front legs
  p.rect(10, 25, 3, 5, '6');
  p.rect(14, 26, 3, 4, '5');
  // hooves
  p.rect(10, 29, 3, 1, 'd');
  p.rect(14, 29, 3, 1, 'd');
  p.rect(22, 29, 3, 1, 'd');
  p.rect(26, 28, 3, 1, 'd');
  // head
  p.ellipse(9, 18, 6.5, 6, ['7', '7', '5', '6']);
  // ear
  p.stamp(['.6', '66', '65'], 10, 10);
  // snout
  p.ellipse(3.5, 21, 3, 2.6, ['N', '8', '8', '9']);
  p.px(2, 21, 'R');
  p.px(4, 21, 'R');
  // tusk
  p.stamp(['w.', 'ww', '.w'], 5, 22);
  p.stamp(['.w', 'wv'], 3, 24);
  // angry eye
  p.stamp(['o..', 'yo.'], 6, 16);
  p.stamp(['oo.'], 5, 15);
  return p.rows();
}

function wisp() {
  const p = new Painter();
  // tail wisps (drawn first, head over them)
  p.ellipse(19, 22, 6, 5, ['U', 'T', 'T', 'V']);
  p.ellipse(22, 26, 4, 3.5, ['U', 'T', 'T', 'V']);
  p.ellipse(25, 29, 2.5, 2, ['T', 'T', 'V', 'V']);
  // head
  p.ellipse(15, 14, 9.5, 9, ['U', 'U', 'T', 'V']);
  p.ellipse(14, 13, 5, 4.5, ['w', 'U', 'U', 'T']);
  // flame tips on top
  p.stamp(['..U...', '.UT..U', '.TT.UT', 'TTTTTT'], 11, 3);
  // face
  p.stamp(['jj...jj', 'jH...jH', 'jj...jj'], 8, 14);
  p.stamp(['.jj.'], 10, 19);
  // floating ice motes
  p.stamp(['.i.', 'ici', '.i.'], 2, 6);
  p.stamp(['.i.', 'ici', '.i.'], 27, 8);
  p.px(4, 24, 'i');
  return p.rows();
}

function golem() {
  const p = new Painter();
  const stone = ['G', 'A', 'D', 'F'];
  // legs
  p.ellipse(11, 27, 4, 3.5, stone);
  p.ellipse(22, 27, 4, 3.5, stone);
  // back arm
  p.ellipse(27, 18, 4, 6, stone);
  // body
  p.ellipse(17, 18, 11, 9.5, stone);
  // head
  p.ellipse(12, 8.5, 6.5, 5.5, stone);
  // front arm, big fist
  p.ellipse(6, 17, 4, 5, stone);
  p.ellipse(5, 23, 4.5, 4, stone);
  // moss
  p.stamp(['.ee.e..', 'eEeeEe.', 'E.EE.eE'], 13, 9);
  p.stamp(['eel', 'EeE'], 9, 3);
  p.stamp(['ee', 'E.'], 24, 12);
  // cracks
  p.stamp(['z..', '.z.', '.zz', '..z'], 18, 17);
  p.stamp(['.z', 'z.', 'z.'], 3, 22);
  // glowing eyes
  p.stamp(['yy..yy', 'fy..fy'], 7, 8);
  p.stamp(['F.FF.F'], 7, 11);
  return p.rows();
}

function imp() {
  const p = new Painter();
  // wings behind
  p.stamp([
    '.........P.',
    '........PPp',
    '......PPPpp',
    '....PPPPppp',
    '..PPPPPPpp.',
    '.PPPPPPPPp.',
    'PPP..PPPPp.',
    'P......PPp.',
    '.........P.',
  ], 19, 8);
  // tail with flame tip
  p.stamp(['.....ff', '....fyf', '....ff.', '...L...', '..L....', '.L.....', 'L......'], 22, 19);
  // legs
  p.rect(12, 26, 2, 4, 'L');
  p.rect(18, 26, 2, 4, 'L');
  p.rect(11, 29, 3, 1, 'S');
  p.rect(17, 29, 3, 1, 'S');
  // body
  p.ellipse(16, 22, 6, 5.5, ['O', 'K', 'L', 'S']);
  // arms
  p.stamp(['LL', 'KL', 'KL', '.L'], 8, 19);
  // head
  p.ellipse(14, 12, 8.5, 7.5, ['O', 'K', 'L', 'S']);
  // horns
  p.stamp(['w.', 'hw', '.v', '.v'], 7, 2);
  p.stamp(['.w', 'wh', 'v.', 'v.'], 18, 2);
  // face: yellow eyes and a toothy grin
  p.stamp(['yy..yy', 'fy..fy'], 8, 11);
  p.stamp(['Soo..'], 7, 10);
  p.stamp(['SSSSS', 'SwSwS', '.SSS.'], 9, 15);
  // ember in hand
  p.stamp(['.f.', 'fyf', '.f.'], 5, 22);
  return p.rows();
}

const BUILDERS = { slime, shroom, boar, wisp, golem, imp };

export function mobGrid(sprite) {
  const rows = BUILDERS[sprite]();
  return compose(W, H, [{ rows, map: MOB_MAP }]);
}

export const MOB_SIZE = W;
