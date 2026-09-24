// Monsters for the Desert, Orchard and Glacier biomes, plus one newcomer for
// each of the first five biomes. 32x32, facing left, same method as mobs2.js:
// shaded ellipses lit from the top-left, flat polygons and lines, hand-placed
// features, and compose() adds the outline.

import { Painter } from './mobs.js';

const R = {
  shroom: ['#ffc8cc', '#ee6b73', '#d9434f', '#8f2437'],
  stem: ['#fffaf0', '#f1d9b5', '#cdb592', '#8e7358'],
  steel: ['#ffffff', '#cdd3e2', '#8e96ae', '#50546a'],
  puffer: ['#fff6c8', '#ffd36b', '#e0a52e', '#8f6424'],
  rust: ['#f2b888', '#c8703e', '#8e4526', '#552a1a'],
  brass: ['#fff2b8', '#eac25c', '#b8862b', '#6e4e18'],
  pumpkin: ['#ffd29a', '#f5923a', '#d0602a', '#8a3a1e'],
  vine: ['#b7f08a', '#6cc24a', '#3d7f37', '#23502a'],
  lava: ['#fff4a8', '#ffc84a', '#f5803a', '#c8402e'],
  sala: ['#ff9c8a', '#e0564e', '#9a2f3a', '#5e1830'],
  sand: ['#fff4d0', '#f2d48a', '#d0a458', '#8f6a32'],
  skink: ['#f8e6a8', '#dcb45e', '#a8843f', '#6a5226'],
  scarab: ['#b8fff0', '#4ed0b8', '#2f8f9a', '#1a4a5e'],
  gold: ['#fff6c8', '#ffd36b', '#e0a52e', '#8f6424'],
  scorp: ['#ffcf9a', '#d9884a', '#a0562c', '#5e2e1a'],
  wrap: ['#ffffff', '#efe6cf', '#c8bb98', '#8a7c62'],
  wyrm: ['#f8e0a8', '#d8a860', '#a87838', '#6a4a22'],
  sphinx: ['#fff0c0', '#eac270', '#b88a3e', '#7a5626'],
  berry: ['#ffb0c0', '#e8506e', '#b02e4e', '#6e1a34'],
  leaf: ['#d0f5a0', '#86c860', '#4e9440', '#2e5e2a'],
  bee: ['#fff4a0', '#ffd23a', '#e0a020', '#8a5a10'],
  wing: ['#ffffff', '#e6f4ff', '#b8d8f0', '#7aa0c8'],
  hog: ['#e8c8a0', '#b08858', '#7a5a38', '#4a3422'],
  bear: ['#e8b078', '#c07a44', '#8a5028', '#5a3218'],
  bark: ['#c8a070', '#8e643e', '#604028', '#3a2618'],
  snow: ['#ffffff', '#f0f6ff', '#c8d8f0', '#8aa0c8'],
  ice: ['#ffffff', '#c8f4ff', '#7fd0ec', '#3a8ac0'],
  penguin: ['#6a7a9c', '#3a4a6e', '#252f48', '#141a2e'],
  wolf: ['#f4f8ff', '#c8d4ea', '#8a9cc0', '#4e5e84'],
  fur: ['#ffffff', '#e8eef8', '#b8c4dc', '#7a86a8'],
  toad: ['#c8e890', '#86b050', '#50782e', '#2e4a1e'],
  leech: ['#c89aa8', '#8a5068', '#5a2e44', '#341a2a'],
  mud: ['#b0946a', '#7e6440', '#56422a', '#34281a'],
  croc: ['#a8c078', '#6a8a48', '#44602e', '#283a1c'],
  hag: ['#b8d890', '#7ea860', '#50783e', '#2e4a24'],
  night: ['#8a7ae8', '#5a4ab8', '#3a2e80', '#221a50'],
  star: ['#ffffff', '#fff6c8', '#ffd36b', '#e0a52e'],
  rock: ['#a8a0b8', '#78708a', '#50485e', '#2e2a3a'],
  moth: ['#ffe0b0', '#f5a860', '#d0703a', '#8a3a1e'],
};

const eye = (p, x, y, iris = 'o', glint = 'w') => { p.px(x, y, glint); p.px(x + 1, y, iris); p.px(x, y + 1, iris); p.px(x + 1, y + 1, iris); };

// ================================================================ newcomers to the first five biomes

function shroomknight() {
  const p = new Painter();
  // legs and a little shield
  p.rect(12, 25, 3, 5, R.stem[3]); p.rect(18, 25, 3, 5, R.stem[3]);
  // stem body
  p.ellipse(16, 21, 6, 6, R.stem);
  // lance, pointing left
  p.line(1, 19, 12, 21, R.steel[2], 2); p.px(0, 19, R.steel[0]); p.px(1, 18, R.steel[1]);
  p.ellipse(11, 22, 3.5, 4, R.steel);
  // cap
  p.ellipse(16, 11, 12, 8, R.shroom, { clip: (x, y) => y <= 15 });
  p.rect(5, 15, 23, 1, R.shroom[3]);
  for (const [x, y] of [[10, 7], [18, 5], [22, 10], [13, 11]]) p.ellipse(x, y, 1.8, 1.4, ['#ffffff', '#ffffff', '#fff0f0', '#f1d9b5']);
  // visor slit and eyes
  p.rect(10, 17, 10, 3, R.steel[3]);
  p.px(12, 18, '#fff27a'); p.px(16, 18, '#fff27a');
  return p;
}

function puffer() {
  const p = new Painter();
  // tail fin
  p.poly([[26, 14], [31, 9], [31, 23], [26, 18]], R.puffer[2]);
  // body
  p.ellipse(15, 16, 11, 10, R.puffer);
  p.ellipse(13, 20, 7, 4, ['#fffaf0', '#fff6e0', '#f2dcae', '#d6b47a']);
  // spikes all round
  for (let a = 0; a < 14; a++) {
    const t = (a / 14) * Math.PI * 2;
    const x = 15 + Math.cos(t) * 11, y = 16 + Math.sin(t) * 10;
    p.line(x, y, 15 + Math.cos(t) * 13.5, 16 + Math.sin(t) * 12.5, R.puffer[3]);
  }
  // fin and face
  p.poly([[16, 17], [22, 14], [20, 20]], R.puffer[2]);
  eye(p, 8, 12, 'o', 'w'); p.px(7, 12, 'w');
  p.stamp(['oo', 'o.'], 4, 17);
  return p;
}

function hound() {
  const p = new Painter();
  // legs
  for (const x of [9, 13, 19, 23]) p.line(x, 22, x, 30, R.rust[3], 2);
  // tail: a bent pipe
  p.line(25, 17, 30, 11, R.brass[2], 2);
  // body: riveted barrel
  p.ellipse(17, 18, 9, 5.5, R.rust);
  for (const x of [13, 17, 21]) p.px(x, 16, R.brass[0]);
  p.rect(10, 20, 15, 1, R.rust[3]);
  // head and jaw
  p.ellipse(8, 13, 5.5, 4.5, R.rust);
  p.rect(1, 15, 8, 3, R.rust[2]);
  p.stamp(['w.w.w'], 2, 15);
  p.rect(1, 18, 7, 1, R.rust[3]);
  // ear
  p.poly([[9, 9], [12, 4], [12, 10]], R.brass[2]);
  // glowing eye
  p.px(6, 12, '#ff4a5a'); p.px(7, 12, '#ff4a5a'); p.px(6, 11, '#ffb0b0');
  return p;
}

function pumpkin() {
  const p = new Painter();
  // vine and leaf on top
  p.line(16, 3, 17, 8, R.vine[3], 2);
  p.poly([[17, 5], [24, 2], [21, 7]], R.vine[1]);
  // pumpkin body with ribs
  p.ellipse(16, 19, 12, 10, R.pumpkin);
  for (const x of [10, 16, 22]) for (let y = 11; y <= 27; y++) if (Math.abs(y - 19) < 8) p.px(x, y, R.pumpkin[3]);
  // carved face, glowing
  const glow = '#fff27a', core = '#ffc84a';
  p.poly([[7, 14], [11, 14], [9, 11]], glow); p.poly([[15, 14], [19, 14], [17, 11]], glow);
  p.poly([[6, 20], [22, 20], [20, 25], [8, 25]], core);
  p.rect(10, 20, 2, 2, R.pumpkin[2]); p.rect(15, 20, 2, 2, R.pumpkin[2]); p.rect(12, 23, 2, 2, R.pumpkin[2]);
  p.px(9, 13, core); p.px(17, 13, core);
  return p;
}

function salamander() {
  const p = new Painter();
  // tail curling up behind
  p.line(22, 22, 28, 18, R.sala[2], 3); p.line(28, 18, 30, 12, R.sala[2], 2);
  p.px(30, 11, R.lava[1]); p.px(29, 10, R.lava[0]);
  // legs
  for (const x of [9, 20]) { p.line(x, 24, x - 2, 29, R.sala[3], 2); p.line(x + 3, 24, x + 4, 29, R.sala[3], 2); }
  // long body
  p.ellipse(16, 21, 10, 4.5, R.sala);
  // glowing lava spots along the back
  for (const [x, y] of [[12, 18], [16, 17], [20, 18], [24, 19]]) { p.px(x, y, R.lava[1]); p.px(x + 1, y, R.lava[2]); }
  // head
  p.ellipse(6, 18, 5, 3.5, R.sala);
  eye(p, 4, 16, '#1a1423', '#fff27a');
  p.rect(1, 20, 5, 1, R.sala[3]);
  // flicking tongue
  p.stamp(['f.', '.f'], 0, 21, { f: '#f58a3a' });
  return p;
}

// ================================================================ Sunscorch Desert

function skink() {
  const p = new Painter();
  // tail
  p.line(20, 23, 31, 26, R.skink[2], 2);
  // legs splayed
  p.line(9, 24, 6, 28, R.skink[3], 2); p.line(12, 24, 14, 28, R.skink[3], 2);
  p.line(19, 24, 17, 28, R.skink[3], 2); p.line(22, 24, 25, 28, R.skink[3], 2);
  // body
  p.ellipse(15, 22, 8, 3.5, R.skink);
  for (let x = 10; x <= 21; x += 3) p.px(x, 20, R.skink[3]);
  // head raised, frilled
  p.poly([[7, 14], [11, 11], [12, 19], [8, 20]], '#e8704a');
  p.ellipse(6, 17, 4, 3, R.skink);
  eye(p, 4, 16, '#1a1423', '#ffffff');
  p.px(1, 18, 'o');
  return p;
}

function beetle() {
  const p = new Painter();
  // legs
  for (const x of [10, 15, 20]) { p.line(x, 23, x - 2, 29, R.scarab[3]); p.line(x - 2, 29, x - 3, 29, R.scarab[3]); }
  // shell
  p.ellipse(17, 18, 11, 8, R.scarab);
  p.line(17, 11, 17, 25, R.scarab[3]);
  p.ellipse(13, 15, 3, 2, ['#ffffff', '#e8fff8', '#b8fff0', '#4ed0b8']);
  // head
  p.ellipse(6, 20, 4.5, 3.5, R.gold);
  // horn
  p.poly([[4, 17], [1, 10], [6, 16]], R.gold[2]);
  eye(p, 4, 19, '#1a1423', '#ffffff');
  // gold trim
  for (let x = 8; x <= 26; x += 3) p.px(x, 24, R.gold[1]);
  return p;
}

function scorpion() {
  const p = new Painter();
  // tail arching over, stinger forward
  const seg = [[24, 22], [27, 17], [27, 11], [24, 6], [19, 4]];
  seg.forEach(([x, y], i) => p.ellipse(x, y, 2.6 - i * 0.2, 2.4 - i * 0.2, R.scorp));
  p.poly([[17, 3], [12, 6], [17, 6]], '#6cc24a'); p.px(12, 6, '#b7f08a');
  // legs
  for (const x of [11, 15, 19]) { p.line(x, 24, x - 3, 29, R.scorp[3]); p.line(x + 1, 24, x + 3, 29, R.scorp[3]); }
  // body
  p.ellipse(17, 22, 8, 4, R.scorp);
  // pincers reaching left
  p.line(10, 21, 5, 17, R.scorp[2], 2);
  p.ellipse(3, 16, 3, 2.5, R.scorp);
  p.px(0, 15, '.'); p.px(1, 16, '.');
  p.line(10, 23, 4, 24, R.scorp[2], 2);
  p.ellipse(2, 24, 2.5, 2, R.scorp);
  // eyes
  p.px(11, 19, 'o'); p.px(12, 19, 'o'); p.px(11, 18, 'w');
  return p;
}

function mummy() {
  const p = new Painter();
  // legs
  p.rect(12, 23, 4, 7, R.wrap[2]); p.rect(18, 23, 4, 7, R.wrap[2]);
  // body
  p.ellipse(17, 17, 7, 8, R.wrap);
  // bandage lines
  for (let y = 11; y <= 23; y += 3) p.line(10, y, 24, y + 1, R.wrap[3]);
  // arms outstretched left
  p.line(11, 15, 3, 16, R.wrap[1], 3);
  p.line(12, 19, 4, 20, R.wrap[2], 3);
  // trailing strip of cloth
  p.line(22, 20, 29, 27, R.wrap[2]); p.line(29, 27, 31, 26, R.wrap[2]);
  // head
  p.ellipse(15, 6, 5, 5, R.wrap);
  p.line(10, 5, 20, 7, R.wrap[3]);
  p.rect(11, 7, 6, 2, '#2a2238');
  p.px(12, 7, '#9ee06a'); p.px(15, 7, '#9ee06a');
  return p;
}

function sandwyrm() {
  const p = new Painter();
  // sand mound it bursts from
  p.ellipse(18, 29, 14, 4, R.sand, { clip: (x, y) => y <= 30 });
  // arching segmented body
  const seg = [[27, 25], [26, 19], [22, 14], [16, 11], [10, 11]];
  seg.forEach(([x, y]) => p.ellipse(x, y, 5, 4.5, R.wyrm));
  for (const [x, y] of seg) p.px(x, y - 3, R.wyrm[0]);
  // head, jaws open
  p.ellipse(6, 13, 6, 5, R.wyrm);
  p.poly([[0, 11], [5, 14], [0, 17]], '#6e1b33');
  for (const y of [11, 13, 15]) p.px(1, y, 'w');
  eye(p, 6, 9, '#1a1423', '#fff27a');
  // spikes
  for (const [x, y] of [[16, 6], [22, 9], [26, 14]]) p.poly([[x - 1, y + 1], [x + 1, y - 3], [x + 2, y + 1]], R.wyrm[3]);
  return p;
}

function sphinx() {
  const p = new Painter();
  // paws out front
  p.ellipse(6, 27, 4, 2.5, R.sphinx); p.ellipse(12, 28, 4, 2, R.sphinx);
  // lion body, lying
  p.ellipse(19, 23, 11, 6, R.sphinx);
  // tail
  p.line(29, 22, 31, 15, R.sphinx[2]); p.px(31, 14, R.sphinx[3]);
  // wing folded
  p.poly([[17, 17], [30, 10], [28, 20]], R.sphinx[1]);
  for (let i = 0; i < 3; i++) p.line(18, 18 + i, 28, 12 + i * 3, R.sphinx[2]);
  // headdress
  p.poly([[5, 5], [15, 4], [17, 18], [3, 18]], '#3a78c9');
  for (let y = 6; y <= 17; y += 3) p.line(4, y, 16, y, R.gold[1]);
  // face
  p.ellipse(10, 11, 4, 5, R.sphinx);
  eye(p, 8, 9, '#3a78c9', '#ffffff');
  p.px(8, 13, '#8f6424'); p.px(9, 14, '#8f6424');
  // cobra crown
  p.ellipse(10, 3, 1.8, 2, R.gold);
  return p;
}

// ================================================================ Barberry Orchard

function sprout() {
  const p = new Painter();
  // pot of soil
  p.poly([[9, 24], [23, 24], [21, 30], [11, 30]], '#b0623a');
  p.rect(8, 23, 16, 2, '#d08a5a');
  // stalk
  p.line(16, 23, 16, 13, R.leaf[2], 2);
  // leaves
  p.ellipse(10, 15, 5, 2.5, R.leaf); p.ellipse(22, 14, 5, 2.5, R.leaf);
  // berry head with a face
  p.ellipse(15, 8, 6, 6, R.berry);
  p.px(12, 5, '#ffffff'); p.px(13, 5, '#ffe0ea');
  eye(p, 11, 8); eye(p, 16, 8);
  p.stamp(['o.o', '.o.'], 13, 11);
  // a spare berry
  p.ellipse(25, 20, 2, 2, R.berry);
  return p;
}

function bee() {
  const p = new Painter();
  // wings
  p.ellipse(15, 8, 5, 4, R.wing); p.ellipse(21, 7, 4, 3.5, R.wing);
  // body
  p.ellipse(18, 17, 8, 6, R.bee);
  for (const x of [17, 21]) p.rect(x, 12, 2, 11, '#2a2238');
  // stinger
  p.poly([[26, 17], [31, 19], [26, 20]], '#2a2238');
  // head
  p.ellipse(9, 16, 4.5, 4.5, R.bee);
  eye(p, 6, 14, 'o', 'w');
  p.stamp(['o.o', '.o.'], 6, 18);
  // antennae
  p.line(9, 12, 7, 7, '#2a2238'); p.line(11, 12, 12, 7, '#2a2238');
  p.px(7, 6, '#2a2238'); p.px(12, 6, '#2a2238');
  // tiny legs
  p.line(15, 23, 14, 26, '#2a2238'); p.line(19, 23, 19, 26, '#2a2238');
  return p;
}

function hedgehog() {
  const p = new Painter();
  // bramble spines across the back
  for (let i = 0; i < 12; i++) {
    const t = Math.PI * (0.95 + (i / 11) * 1.05);
    p.line(18 + Math.cos(t) * 7, 20 + Math.sin(t) * 6, 18 + Math.cos(t) * 13, 20 + Math.sin(t) * 12, R.leaf[3]);
  }
  p.ellipse(18, 19, 11, 9, R.leaf, { clip: (x, y) => y <= 26 });
  // barberries caught in the spines
  for (const [x, y] of [[13, 11], [21, 9], [26, 14], [17, 15]]) p.ellipse(x, y, 1.6, 1.6, R.berry);
  // face and belly
  p.ellipse(9, 22, 6, 5, R.hog);
  eye(p, 6, 20, 'o', 'w');
  p.ellipse(3, 23, 1.6, 1.4, ['#2a2238', '#2a2238', '#1a1423', '#1a1423']);
  // feet
  p.rect(10, 27, 3, 3, R.hog[3]); p.rect(20, 26, 3, 4, R.hog[3]);
  return p;
}

function bear() {
  const p = new Painter();
  // legs
  p.ellipse(11, 27, 4, 3, R.bear); p.ellipse(22, 27, 4, 3, R.bear);
  // body
  p.ellipse(17, 19, 10, 9, R.bear);
  p.ellipse(15, 21, 6, 5, ['#fff0d8', '#f2d8a8', '#dcb880', '#b08858']);
  // honey pot hugged to the belly
  p.ellipse(15, 22, 4, 3.5, R.bee);
  p.rect(12, 18, 7, 1, '#8a5a10');
  p.px(13, 25, '#ffd23a'); p.px(13, 26, '#ffd23a');
  // head
  p.ellipse(10, 9, 6, 5.5, R.bear);
  p.ellipse(6, 4, 2.2, 2.2, R.bear); p.ellipse(14, 4, 2.2, 2.2, R.bear);
  p.ellipse(6, 12, 3, 2.3, ['#fff0d8', '#f2d8a8', '#dcb880', '#b08858']);
  p.px(4, 11, 'o'); p.px(5, 11, 'o');
  eye(p, 7, 7); eye(p, 11, 7);
  return p;
}

function treant() {
  const p = new Painter();
  // roots
  p.line(8, 26, 3, 31, R.bark[3], 2); p.line(14, 27, 13, 31, R.bark[3], 2); p.line(22, 26, 28, 31, R.bark[3], 2);
  // trunk
  p.ellipse(16, 21, 8, 9, R.bark);
  for (let y = 14; y <= 28; y += 3) p.line(12, y, 13, y + 2, R.bark[3]);
  // branch arms, left one reaching out
  p.line(9, 17, 2, 12, R.bark[2], 3); p.line(2, 12, 1, 8, R.bark[2], 2);
  p.line(23, 16, 29, 11, R.bark[2], 2);
  // canopy
  p.ellipse(16, 8, 12, 7, R.leaf);
  p.ellipse(5, 7, 4, 3, R.leaf); p.ellipse(28, 9, 3.5, 3, R.leaf);
  for (const [x, y] of [[9, 6], [15, 3], [21, 7], [26, 5], [12, 10]]) p.ellipse(x, y, 1.6, 1.6, R.berry);
  // face in the bark
  p.rect(11, 18, 3, 2, '#2a1a10'); p.rect(17, 18, 3, 2, '#2a1a10');
  p.px(12, 18, '#9ee06a'); p.px(18, 18, '#9ee06a');
  p.rect(12, 23, 7, 2, '#2a1a10');
  return p;
}

function waspqueen() {
  const p = new Painter();
  // four sharp wings
  p.poly([[15, 11], [4, 1], [9, 11]], R.wing[2]); p.poly([[17, 11], [24, 0], [22, 11]], R.wing[1]);
  p.poly([[15, 13], [3, 9], [10, 14]], R.wing[2]);
  // abdomen, striped, stinger back
  p.ellipse(22, 20, 7, 5, R.bee);
  for (const x of [20, 24]) p.rect(x, 15, 2, 10, '#2a2238');
  p.poly([[28, 21], [31, 25], [27, 23]], '#2a2238');
  // thorax
  p.ellipse(14, 16, 4, 4, ['#6a5a3a', '#4a3a28', '#2a2238', '#1a1423']);
  // head with crown
  p.ellipse(8, 13, 4, 4, R.bee);
  p.stamp(['y.y.y', 'yyyyy'], 6, 7, { y: '#ffd36b' });
  eye(p, 5, 12, '#d9434f', '#ffffff');
  p.line(4, 16, 2, 19, '#2a2238');
  // legs
  for (const x of [12, 15, 18]) p.line(x, 20, x - 1, 26, '#2a2238');
  return p;
}

// ================================================================ Frostfang Glacier

function snowpuff() {
  const p = new Painter();
  // fluffy body
  p.ellipse(16, 20, 10, 9, R.snow);
  for (const [x, y] of [[8, 14], [24, 14], [6, 22], [26, 22], [16, 11]]) p.ellipse(x, y, 3, 2.5, R.snow);
  // icy crown
  p.poly([[12, 11], [14, 5], [16, 11]], R.ice[1]); p.poly([[16, 11], [19, 4], [21, 12]], R.ice[2]);
  // face
  eye(p, 11, 18, '#3a78c9', 'w'); eye(p, 17, 18, '#3a78c9', 'w');
  p.px(14, 22, '#f28bb0'); p.px(15, 22, '#f28bb0');
  // snowflakes around it
  p.stamp(['.w.', 'www', '.w.'], 1, 6); p.stamp(['.w.', 'www', '.w.'], 27, 27);
  return p;
}

function penguin() {
  const p = new Painter();
  // feet
  p.rect(10, 28, 4, 2, '#f5923a'); p.rect(17, 28, 4, 2, '#f5923a');
  // body
  p.ellipse(16, 18, 8, 11, R.penguin);
  p.ellipse(14, 20, 5, 8, R.snow);
  // flippers
  p.poly([[8, 15], [3, 22], [9, 21]], R.penguin[2]); p.poly([[23, 15], [27, 22], [22, 21]], R.penguin[3]);
  // face
  eye(p, 11, 10, 'o', 'w'); eye(p, 16, 10, 'o', 'w');
  p.poly([[11, 13], [7, 14], [11, 15]], '#f5923a');
  // ice-block helmet
  p.rect(10, 3, 12, 4, R.ice[1]); p.rect(10, 3, 12, 1, R.ice[0]); p.rect(20, 3, 2, 4, R.ice[2]);
  return p;
}

function wolf() {
  const p = new Painter();
  // tail
  p.poly([[24, 17], [31, 11], [30, 20], [25, 21]], R.wolf[2]);
  // legs
  for (const x of [9, 13, 19, 23]) p.line(x, 22, x, 30, R.wolf[3], 2);
  // body
  p.ellipse(17, 19, 9, 5, R.wolf);
  // icy mane
  for (let i = 0; i < 5; i++) p.poly([[10 + i * 2, 15], [11 + i * 2, 9 + (i % 2) * 2], [13 + i * 2, 15]], R.ice[i % 2 ? 1 : 2]);
  // head and snout
  p.ellipse(8, 14, 5, 4, R.wolf);
  p.rect(1, 15, 6, 3, R.wolf[1]);
  p.px(1, 15, 'o');
  p.stamp(['w.w'], 2, 18);
  // ear
  p.poly([[7, 10], [9, 5], [11, 10]], R.wolf[2]);
  eye(p, 6, 12, '#3a78c9', 'w');
  return p;
}

function yeti() {
  const p = new Painter();
  // legs
  p.ellipse(11, 27, 4, 3.5, R.fur); p.ellipse(21, 27, 4, 3.5, R.fur);
  // body
  p.ellipse(16, 18, 10, 10, R.fur);
  // long arms, knuckles down
  p.ellipse(5, 22, 3.5, 6, R.fur); p.ellipse(27, 22, 3.5, 6, R.fur);
  p.rect(3, 27, 4, 2, '#8a9cc0');
  // face
  p.ellipse(13, 12, 6, 5, ['#e0f0ff', '#b8d0f0', '#8aa6d8', '#5a74b0']);
  eye(p, 10, 10, '#3a78c9', 'w'); eye(p, 15, 10, '#3a78c9', 'w');
  p.rect(10, 14, 6, 2, '#2a2238'); p.px(11, 14, 'w'); p.px(14, 14, 'w');
  // brow fur
  p.line(8, 8, 18, 8, R.fur[0], 2);
  return p;
}

function abominable() {
  const p = new Painter();
  // legs
  p.ellipse(10, 28, 5, 3, R.fur); p.ellipse(23, 28, 5, 3, R.fur);
  // huge body
  p.ellipse(17, 17, 13, 12, R.fur);
  // ice shards grown on the shoulders
  for (const [x, y, h] of [[20, 5, 7], [25, 7, 6], [29, 11, 5]]) p.poly([[x - 2, y + 2], [x, y - h + 2], [x + 2, y + 2]], R.ice[1]);
  // fists raised left
  p.ellipse(4, 12, 4, 4, R.fur); p.ellipse(4, 22, 4, 4, R.fur);
  p.line(7, 13, 10, 15, R.fur[2], 2);
  // face
  p.ellipse(12, 12, 6, 5, ['#e0f0ff', '#b8d0f0', '#8aa6d8', '#5a74b0']);
  p.rect(8, 10, 3, 2, '#d9434f'); p.rect(13, 10, 3, 2, '#d9434f');
  p.rect(8, 14, 8, 3, '#2a2238');
  p.px(9, 14, 'w'); p.px(14, 14, 'w'); p.px(9, 16, 'w'); p.px(14, 16, 'w');
  return p;
}

function frostwyrm() {
  const p = new Painter();
  // coiled body
  p.ellipse(21, 25, 9, 5, R.ice);
  p.ellipse(20, 17, 7, 5, R.ice);
  // crystal fins along the back
  for (const [x, y] of [[26, 20], [27, 13], [22, 11]]) p.poly([[x - 2, y + 2], [x + 1, y - 4], [x + 3, y + 2]], R.snow[1]);
  // neck and head
  p.line(15, 15, 9, 9, R.ice[1], 4);
  p.ellipse(7, 8, 5, 4, R.ice);
  p.ellipse(2, 10, 3, 2, R.ice);
  // horns
  p.poly([[7, 5], [11, 0], [10, 6]], R.snow[1]); p.poly([[4, 5], [5, 0], [7, 5]], R.snow[2]);
  eye(p, 5, 7, '#1a1423', '#ffffff');
  // frost breath
  p.stamp(['.w.', 'wbw', '.w.', 'b..'], 0, 13, { b: '#8fd8f0' });
  return p;
}

// ================================================================ Mirebog Swamp

function toad() {
  const p = new Painter();
  // back legs folded
  p.ellipse(22, 25, 6, 4, R.toad);
  p.rect(20, 28, 8, 2, R.toad[2]);
  // body
  p.ellipse(15, 21, 11, 8, R.toad);
  p.ellipse(12, 24, 6, 4, ['#fff8d8', '#f2e8b0', '#d8c888', '#a89860']);
  // warts
  for (const [x, y] of [[18, 16], [22, 19], [15, 14]]) p.ellipse(x, y, 1.3, 1.1, R.toad);
  // eyes on top
  p.ellipse(8, 13, 3, 3, R.toad); p.ellipse(15, 12, 3, 3, R.toad);
  eye(p, 7, 12, '#1a1423', '#fff27a'); eye(p, 14, 11, '#1a1423', '#fff27a');
  // wide mouth
  p.line(4, 19, 12, 20, R.toad[3]);
  // front feet
  p.rect(6, 28, 4, 2, R.toad[2]);
  // poison drip
  p.stamp(['g', 'g', '.', 'g'], 3, 20, { g: '#9ee06a' });
  return p;
}

function leech() {
  const p = new Painter();
  // segmented body curling up, mouth to the left
  const seg = [[26, 25], [22, 23], [18, 21], [14, 18], [10, 15], [7, 12]];
  seg.forEach(([x, y], i) => p.ellipse(x, y, 4.5 - i * 0.2, 4 - i * 0.2, R.leech));
  for (const [x, y] of seg) p.px(x, y - 2, R.leech[0]);
  // round sucker mouth with teeth
  p.ellipse(5, 10, 3.2, 3.2, ['#8a3a4a', '#6e1a2e', '#4a0e1e', '#2a0612']);
  for (const [x, y] of [[4, 8], [6, 8], [3, 10], [7, 11]]) p.px(x, y, 'w');
  // drip of blood
  p.stamp(['r', 'r', '.', 'r'], 5, 14, { r: '#d9434f' });
  return p;
}

function mudgolem() {
  const p = new Painter();
  // legs
  p.ellipse(11, 27, 4, 3, R.mud); p.ellipse(22, 27, 4, 3, R.mud);
  // lumpy body
  p.ellipse(16, 17, 11, 10, R.mud);
  p.ellipse(8, 11, 4, 3, R.mud); p.ellipse(24, 10, 4, 3, R.mud);
  // arms
  p.ellipse(4, 20, 3.5, 5, R.mud); p.ellipse(28, 20, 3.5, 5, R.mud);
  // moss and mushrooms on top
  p.rect(10, 7, 12, 2, '#5fa84a');
  p.stamp(['.r.', 'rrr', '.s.'], 19, 3, { r: '#d9434f', s: '#f1d9b5' });
  // face: two glowing holes and a mouth
  p.rect(10, 14, 3, 2, '#1a1410'); p.rect(17, 14, 3, 2, '#1a1410');
  p.px(11, 14, '#9ee06a'); p.px(18, 14, '#9ee06a');
  p.rect(11, 19, 8, 2, '#1a1410');
  // drips
  for (const x of [9, 15, 22]) p.line(x, 26, x, 28, R.mud[2]);
  return p;
}

function gnats() {
  const p = new Painter();
  // a cloud of little biters
  const pts = [[8, 10], [15, 6], [22, 9], [12, 15], [19, 14], [26, 16], [7, 20], [14, 22], [21, 21], [16, 27], [25, 25], [10, 26]];
  for (const [x, y] of pts) {
    p.ellipse(x, y, 2, 1.6, R.leech);
    p.px(x - 1, y - 2, '#e6f4ff'); p.px(x + 1, y - 2, '#e6f4ff');
    p.px(x - 2, y, '#ff4a5a');
  }
  // faint swarm haze
  for (let i = 0; i < 18; i++) p.px(4 + ((i * 7) % 24), 4 + ((i * 11) % 24), '#8a5068');
  return p;
}

function croc() {
  const p = new Painter();
  // tail
  p.poly([[24, 22], [31, 18], [31, 22], [26, 26]], R.croc[2]);
  // legs
  for (const x of [10, 20]) { p.line(x, 25, x - 2, 30, R.croc[3], 3); p.line(x + 4, 25, x + 5, 30, R.croc[3], 3); }
  // body with ridged back
  p.ellipse(17, 22, 10, 5, R.croc);
  for (let x = 10; x <= 26; x += 3) p.poly([[x - 1, 18], [x, 15], [x + 1, 18]], R.croc[3]);
  // long snout open
  p.ellipse(8, 18, 5, 3.5, R.croc);
  p.poly([[0, 15], [7, 16], [7, 18], [0, 17]], R.croc[1]);
  p.poly([[0, 20], [7, 19], [7, 21], [1, 22]], R.croc[2]);
  for (const x of [1, 3, 5]) { p.px(x, 17, 'w'); p.px(x + 1, 19, 'w'); }
  eye(p, 8, 15, '#1a1423', '#fff27a');
  return p;
}

function bogmother() {
  const p = new Painter();
  // mossy robe spreading into the mud
  p.poly([[8, 12], [24, 12], [30, 30], [2, 30]], R.hag[2]);
  p.poly([[8, 12], [14, 12], [8, 30], [2, 30]], R.hag[1]);
  for (let x = 3; x <= 29; x += 4) p.line(x, 30, x + 1, 27, '#5fa84a');
  // arm raising a staff topped with a bubbling skull
  p.line(4, 30, 3, 6, '#5a3a20', 2);
  p.ellipse(3, 5, 3, 2.6, ['#ffffff', '#efe6cf', '#c8bb98', '#8a7c62']);
  p.stamp(['g.g', '.g.'], 1, 0, { g: '#9ee06a' });
  // head with a hood of reeds
  p.ellipse(16, 9, 5, 5, R.hag);
  p.poly([[10, 8], [16, 1], [22, 8]], '#3e5428');
  eye(p, 13, 8, '#fff27a', 'w'); eye(p, 17, 8, '#fff27a', 'w');
  p.rect(14, 12, 4, 1, '#2e4a24');
  return p;
}

// ================================================================ Starfall Observatory

function starling() {
  const p = new Painter();
  // a little five-pointed star with a face and a sparkly trail
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 5 : 11;
    pts.push([15 + Math.cos(a) * r, 16 + Math.sin(a) * r]);
  }
  p.poly(pts, R.star[2]);
  p.ellipse(15, 16, 6, 6, R.star);
  eye(p, 12, 15, 'o', 'w'); eye(p, 16, 15, 'o', 'w');
  p.px(14, 19, '#f28bb0'); p.px(15, 19, '#f28bb0');
  for (const [x, y] of [[27, 22], [29, 26], [25, 28], [30, 19]]) p.px(x, y, '#c8c0ff');
  return p;
}

function meteorite() {
  const p = new Painter();
  // flame trail up and behind
  p.poly([[16, 10], [31, 0], [26, 12], [30, 18], [20, 18]], '#f5803a');
  p.poly([[18, 12], [28, 4], [24, 14]], '#ffc84a');
  // rock body
  p.ellipse(14, 20, 10, 9, R.rock);
  for (const [x, y] of [[10, 16], [18, 22], [12, 25]]) p.ellipse(x, y, 2, 1.6, ['#50485e', '#3a3448', '#2e2a3a', '#1e1a28']);
  // glowing cracks
  p.line(6, 20, 11, 22, '#ffc84a'); p.line(16, 14, 20, 18, '#f5803a');
  // angry eyes
  p.rect(7, 17, 3, 2, '#fff27a'); p.rect(13, 17, 3, 2, '#fff27a');
  p.line(6, 15, 10, 16, R.rock[3]); p.line(13, 16, 17, 15, R.rock[3]);
  return p;
}

function orrery() {
  const p = new Painter();
  // brass stand
  p.rect(14, 22, 4, 6, '#b8862b'); p.rect(9, 28, 14, 3, '#8f6424'); p.rect(9, 28, 14, 1, '#eac25c');
  // rings around a core
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    p.px(16 + Math.cos(a) * 13, 13 + Math.sin(a) * 4, '#eac25c');
    p.px(16 + Math.cos(a) * 5, 13 + Math.sin(a) * 11, '#b8862b');
  }
  p.ellipse(16, 13, 5, 5, R.night);
  eye(p, 14, 12, '#1a1423', '#fff27a');
  // planets on the rings
  p.ellipse(3, 13, 2.4, 2.4, R.star); p.ellipse(29, 12, 2, 2, ['#ffb0c0', '#e8506e', '#b02e4e', '#6e1a34']);
  p.ellipse(16, 2, 1.8, 1.8, ['#d0fff6', '#74e0d0', '#2fa8a8', '#1c6a78']);
  return p;
}

function moth() {
  const p = new Painter();
  // big glowing wings
  p.ellipse(9, 12, 8, 7, R.moth); p.ellipse(23, 12, 8, 7, R.moth);
  p.ellipse(10, 22, 5, 4, R.moth); p.ellipse(22, 22, 5, 4, R.moth);
  for (const [x, y] of [[8, 11], [24, 11]]) { p.ellipse(x, y, 2.5, 2.5, R.star); p.px(x, y, '#d0703a'); }
  // fuzzy body
  p.ellipse(16, 17, 3, 8, ['#fff8e8', '#e8d8b8', '#b8a080', '#7a6448']);
  // head and feathery antennae
  p.ellipse(16, 8, 3, 2.6, ['#fff8e8', '#e8d8b8', '#b8a080', '#7a6448']);
  p.line(15, 6, 11, 1, '#b8a080'); p.line(17, 6, 21, 1, '#b8a080');
  eye(p, 14, 7, '#1a1423', '#ffc84a');
  // embers
  p.stamp(['y.', '.f'], 2, 26, { y: '#fff27a', f: '#f58a3a' }); p.stamp(['f', '.', 'y'], 29, 24, { y: '#fff27a', f: '#f58a3a' });
  return p;
}

function astromancer() {
  const p = new Painter();
  // starry robe
  p.poly([[10, 12], [22, 12], [27, 30], [5, 30]], R.night[2]);
  p.poly([[10, 12], [15, 12], [10, 30], [5, 30]], R.night[1]);
  for (const [x, y] of [[9, 20], [18, 17], [22, 25], [13, 27], [20, 29]]) p.px(x, y, '#fff6c8');
  // staff with a star, held forward
  p.line(4, 30, 5, 8, '#b8862b', 2);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([5 + Math.cos(a) * (i % 2 ? 2 : 4.5), 6 + Math.sin(a) * (i % 2 ? 2 : 4.5)]);
  }
  p.poly(pts, '#ffd36b');
  // pointed hat with a moon
  p.poly([[10, 9], [16, -1], [23, 9]], R.night[1]);
  p.rect(9, 9, 15, 2, R.night[3]);
  p.stamp(['.y', 'y.', '.y'], 16, 3, { y: '#fff6c8' });
  // face in shadow, glowing eyes, long beard
  p.ellipse(16, 13, 4, 3, ['#f0e0d0', '#d8c0a8', '#a88870', '#6a5040']);
  p.px(14, 12, '#8fd8f0'); p.px(17, 12, '#8fd8f0');
  p.poly([[13, 15], [19, 15], [16, 23]], '#efe6cf');
  return p;
}

function meteorgolem() {
  const p = new Painter();
  // legs
  p.ellipse(10, 28, 5, 3, R.rock); p.ellipse(22, 28, 5, 3, R.rock);
  // huge craggy body
  p.ellipse(16, 16, 12, 12, R.rock);
  // magma cracks
  p.line(9, 8, 13, 16, '#f5803a'); p.line(13, 16, 11, 24, '#f5803a');
  p.line(20, 10, 23, 20, '#ffc84a'); p.line(18, 20, 22, 26, '#f5803a');
  // fists
  p.ellipse(3, 18, 4, 5, R.rock); p.ellipse(29, 19, 3.5, 4.5, R.rock);
  p.stamp(['f.f', '.f.'], 1, 16, { f: '#ffc84a' });
  // burning crown
  for (const [x, h] of [[11, 5], [16, 7], [21, 5]]) p.poly([[x - 2, 6], [x, 6 - h], [x + 2, 6]], '#f5803a');
  // eyes
  p.rect(10, 12, 4, 2, '#fff27a'); p.rect(17, 12, 4, 2, '#fff27a');
  return p;
}

// Some builders use '.' to punch holes; nothing else needs cleaning here.
export const NEW_MOBS = {
  shroomknight, puffer, hound, pumpkin, salamander,
  skink, beetle, scorpion, mummy, sandwyrm, sphinx,
  sprout, bee, hedgehog, bear, treant, waspqueen,
  snowpuff, penguin, wolf, yeti, abominable, frostwyrm,
  toad, leech, mudgolem, gnats, croc, bogmother,
  starling, meteorite, orrery, moth, astromancer, meteorgolem,
};
