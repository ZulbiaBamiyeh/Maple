// Monsters for days 2-5, 32x32, facing left. Same method as mobs.js: shaded
// ellipses lit from the top-left, flat polygons and lines for hard shapes,
// hand-placed features, and compose() adds the outline. Colours are given as
// four-step ramps [highlight, light, mid, dark] or single hex values.

import { Painter } from './mobs.js';

const R = {
  coral: ['#ffd8c8', '#ff8f7a', '#e0564e', '#9a2f3a'],
  crabDark: '#6e1f2e',
  sea: ['#d0fff6', '#74e0d0', '#2fa8a8', '#1c6a78'],
  jelly: ['#fff0ff', '#f7b0f0', '#d078dc', '#8a44a8'],
  pearl: ['#ffffff', '#f2eafa', '#cdbde4', '#8e7cb4'],
  shell: ['#f8ecd8', '#e6c9a0', '#b89468', '#7a5a3c'],
  eel: ['#d6f59a', '#86c870', '#3f9478', '#235a5a'],
  fin: ['#fff2a0', '#ffd44a', '#e09a2a', '#9a6418'],
  skin: ['#fff0e0', '#f6d5bb', '#e0a98e', '#b07a64'],
  brass: ['#fff2b8', '#eac25c', '#b8862b', '#6e4e18'],
  rust: ['#f2b888', '#c8703e', '#8e4526', '#552a1a'],
  steel: ['#ffffff', '#cdd3e2', '#8e96ae', '#50546a'],
  spark: ['#ffffe8', '#fff27a', '#f2c14e', '#b8862b'],
  copper: ['#ffcfa0', '#e0864a', '#a8522c', '#6a2e1a'],
  bat: ['#a898cc', '#6c5c9a', '#463a6e', '#2a2244'],
  bone: ['#ffffff', '#efe6cf', '#c8bb98', '#8a7c62'],
  crow: ['#7a7a9c', '#48486a', '#2e2e46', '#18182a'],
  shade: ['#9a8ac4', '#5c4c8e', '#3a2e62', '#211a3c'],
  witch: ['#c69af0', '#8a52c0', '#5a3088', '#361c56'],
  witchSkin: ['#d8f5a8', '#a6d884', '#74a85e', '#4a7440'],
  drake: ['#ffb898', '#ea5a4a', '#b02e3c', '#6a1628'],
  ember: ['#fff4a8', '#ffc84a', '#f5803a', '#c8402e'],
  harpy: ['#eef6ff', '#aecbee', '#6a8cc0', '#3a5488'],
  roc: ['#8aa4e8', '#4a64b8', '#2c3c80', '#18204a'],
  crystal: ['#ffffff', '#c8f4ff', '#8ad0f0', '#6a70c0'],
  turtle: ['#b8e0a0', '#7eb070', '#4e7a4e', '#2e4a34'],
  prism: ['#fff8ff', '#e8c8ff', '#b08ae8', '#6a50b0'],
};

const eye = (p, x, y, iris = 'o', glint = 'w') => { p.px(x, y, glint); p.px(x + 1, y, iris); p.px(x, y + 1, iris); p.px(x + 1, y + 1, iris); };

// ================================================================ day 2: Tidal Shore

function crab() {
  const p = new Painter();
  // legs
  for (const [x, d] of [[11, -1], [15, -1], [19, 1], [23, 1]]) { p.line(x, 24, x + d * 2, 28, R.crabDark); p.line(x + d * 2, 28, x + d * 2, 30, R.crabDark); }
  // back claw
  p.ellipse(26, 17, 3.5, 3, R.coral);
  // body
  p.ellipse(17, 21, 10, 6, R.coral, { clip: (x, y) => y <= 25 });
  p.rect(9, 25, 16, 1, R.coral[3]);
  // front claw: big pincer reaching left
  p.ellipse(6, 16, 5, 4, R.coral);
  p.poly([[1, 15], [5, 16], [1, 18]], 'transparent-cut');
  p.px(2, 16, '.'); p.px(1, 16, '.'); p.px(2, 17, '.'); p.px(1, 17, '.');
  p.line(9, 19, 12, 21, R.coral[2], 2);
  // eyestalks
  p.line(13, 16, 13, 12, R.crabDark); p.line(17, 16, 17, 12, R.crabDark);
  p.ellipse(13, 11.5, 1.6, 1.6, ['#ffffff', '#ffffff', '#ffffff', '#e8e0f0']);
  p.ellipse(17, 11.5, 1.6, 1.6, ['#ffffff', '#ffffff', '#ffffff', '#e8e0f0']);
  p.px(12, 11, 'o'); p.px(16, 11, 'o');
  // mouth
  p.stamp(['oo'], 12, 22);
  p.px(14, 18, R.coral[0]); p.px(15, 18, R.coral[0]);
  return clean(p);
}

function jelly() {
  const p = new Painter();
  // tentacles
  const cols = [R.jelly[2], R.jelly[1], R.jelly[3], R.jelly[1], R.jelly[2]];
  [8, 12, 16, 20, 24].forEach((x0, i) => {
    for (let y = 16; y <= 30; y++) p.px(Math.round(x0 + Math.sin((y + i * 2) * 0.55) * 1.5), y, cols[i]);
  });
  // bell
  p.ellipse(16, 12, 11, 9, R.jelly, { clip: (x, y) => y <= 15 });
  // frill
  for (let x = 6; x <= 26; x++) p.px(x, 16, (x % 3 === 0) ? R.jelly[3] : R.jelly[2]);
  for (let x = 6; x <= 26; x += 3) p.px(x, 17, R.jelly[3]);
  // spots and face
  p.stamp(['ww', 'w.'], 10, 6); p.px(20, 5, 'w');
  eye(p, 11, 10); eye(p, 17, 10);
  p.stamp(['.o.', 'o.o'], 13, 13);
  p.px(9, 13, 'n'); p.px(21, 13, 'n');
  // sparks
  p.px(4, 20, '#fff27a'); p.px(3, 21, '#fff27a'); p.px(28, 22, '#fff27a'); p.px(29, 23, '#fff27a');
  return p;
}

function eel() {
  const p = new Painter();
  // body: a sagging S from tail (right) to head (left)
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([28 - t * 20, 26 - Math.sin(t * Math.PI * 1.3) * 9 + t * -4]);
  }
  pts.forEach(([x, y], i) => p.ellipse(x, y, 2.2 + i * 0.07, 2.2 + i * 0.07, R.eel));
  // dorsal fin along the back
  pts.forEach(([x, y], i) => { if (i % 2 === 0 && i > 2 && i < 22) p.px(Math.round(x), Math.round(y - 3 - i * 0.05), R.fin[1]); });
  // tail fin
  p.poly([[28, 24], [31, 21], [31, 29]], R.fin[2]);
  // head
  p.ellipse(8, 13, 5.5, 4.5, R.eel);
  // jaw open, teeth
  p.poly([[2, 14], [6, 15], [2, 17]], R.eel[3]);
  p.px(3, 15, 'w'); p.px(4, 15, 'w'); p.px(3, 16, 'w');
  eye(p, 7, 10, '#ffd44a', 'o');
  p.px(7, 10, 'o');
  // belly stripe
  pts.forEach(([x, y], i) => { if (i % 3 === 0) p.px(Math.round(x), Math.round(y + 2), R.eel[0]); });
  // electric crackle
  p.stamp(['y.', '.y', 'y.'], 14, 2, { y: '#fff27a' }); p.stamp(['.y', 'y.'], 24, 9, { y: '#fff27a' });
  return p;
}

function oyster() {
  const p = new Painter();
  // bottom shell
  p.ellipse(16, 24, 14, 6, R.shell, { clip: (x, y) => y >= 22 });
  // inside
  p.ellipse(16, 21, 12, 4, ['#ffe8f0', '#f8c8d8', '#e8a0b8', '#c07a98'], { clip: (x, y) => y >= 19 });
  // pearl
  p.ellipse(16, 18, 4.5, 4.5, R.pearl);
  p.px(14, 16, 'w'); p.px(15, 16, 'w'); p.px(14, 17, 'w');
  // top shell, propped open
  p.ellipse(16, 11, 14, 7, R.shell, { clip: (x, y) => y <= 14 });
  for (let x = 5; x <= 27; x += 4) p.line(16, 5, x, 14, R.shell[2]);
  p.rect(3, 14, 26, 1, R.shell[3]);
  // eyes on the lid
  eye(p, 9, 9); eye(p, 14, 9);
  p.stamp(['.o.'], 10, 12);
  // ridge on bottom shell
  for (let x = 4; x <= 28; x += 3) p.px(x, 27, R.shell[3]);
  return p;
}

function crabking() {
  const p = crab();
  // shift crown on: gold spikes over the eyes
  const gold = ['#fff0a8', '#f2c14e', '#b8862b', '#7c5a1c'];
  p.poly([[10, 9], [20, 9], [20, 6], [18, 8], [15, 4], [12, 8], [10, 6]], gold[1]);
  p.rect(10, 8, 11, 2, gold[2]);
  p.px(15, 6, '#d9434f'); p.px(12, 8, '#7fd8e8'); p.px(18, 8, '#7fd8e8');
  // eyes lowered under the crown, angrier
  p.stamp(['oo', '..'], 12, 11); p.stamp(['oo'], 16, 11);
  // scars and bigger claw tip
  p.line(20, 19, 23, 22, R.coral[3]);
  p.ellipse(4, 14, 3, 2, R.coral);
  p.px(2, 15, '.'); p.px(1, 15, '.');
  return p;
}

function siren() {
  const p = new Painter();
  // tail curling bottom right
  p.ellipse(19, 25, 8, 4.5, R.sea);
  p.ellipse(26, 22, 3, 3, R.sea);
  p.poly([[27, 19], [31, 14], [30, 22]], R.fin[1]);
  p.poly([[28, 22], [31, 26], [27, 24]], R.fin[2]);
  for (let x = 13; x <= 25; x += 2) p.px(x, 24, R.sea[0]);
  // torso
  p.ellipse(15, 17, 4, 5, R.skin);
  // shell top
  p.ellipse(13, 16, 1.6, 1.4, R.pearl); p.ellipse(17, 16, 1.6, 1.4, R.pearl);
  // arm reaching forward
  p.line(11, 16, 6, 18, R.skin[2], 2);
  // long hair behind and around the head
  p.ellipse(17, 10, 7, 7, ['#c8a0ff', '#9a6ae0', '#6a3ab0', '#40207a']);
  p.poly([[20, 10], [25, 20], [21, 22], [19, 14]], '#6a3ab0');
  // face
  p.ellipse(14, 10, 4, 4.5, R.skin);
  p.poly([[10, 6], [18, 5], [15, 9], [11, 9]], '#9a6ae0');
  eye(p, 12, 10, '#2fa8a8'); p.px(15, 10, 'o'); p.px(15, 11, '#2fa8a8');
  p.px(13, 13, R.coral[2]);
  // floating notes
  p.stamp(['.p', '.p', 'pp'], 3, 8, { p: '#f28bb0' });
  return p;
}

// ================================================================ day 3: Clockwork Ruins

function cogling() {
  const p = new Painter();
  // legs
  p.line(12, 25, 10, 30, R.steel[3], 2); p.line(20, 25, 22, 30, R.steel[3], 2);
  // gear teeth
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) p.rect(Math.round(16 + Math.cos(a) * 10) - 1, Math.round(18 + Math.sin(a) * 10) - 1, 3, 3, R.brass[2]);
  // body
  p.ellipse(16, 18, 9, 9, R.brass);
  p.ellipse(16, 18, 4, 4, R.brass.slice().reverse());
  // lens eye, looking left
  p.ellipse(13, 17, 3.5, 3.5, ['#e8ffff', '#7fd8e8', '#3a78c9', '#24508f']);
  p.px(12, 16, 'w'); p.px(11, 17, 'w');
  // winding key on the back
  p.rect(25, 17, 3, 2, R.steel[2]); p.poly([[27, 13], [31, 15], [31, 21], [27, 23]], R.steel[1]);
  // rivets
  p.px(19, 12, 'w'); p.px(21, 22, R.brass[3]); p.px(16, 25, R.brass[3]);
  return p;
}

function mite() {
  const p = new Painter();
  // legs
  for (const x of [11, 16, 21]) { p.line(x, 23, x - 3, 29, R.rust[3]); p.line(x + 1, 23, x + 4, 29, R.rust[3]); }
  // body segments
  p.ellipse(22, 21, 7, 5, R.rust);
  p.ellipse(14, 21, 5, 4.5, R.rust);
  p.ellipse(8, 20, 4, 3.5, R.rust);
  // plate seams and rust flecks
  p.line(18, 17, 18, 25, R.rust[3]); p.line(11, 18, 11, 24, R.rust[3]);
  for (const [x, y] of [[21, 18], [24, 20], [15, 19], [26, 23]]) p.px(x, y, '#e0a060');
  // mandibles
  p.stamp(['s..', '.s.', 's..'], 3, 20, { s: '#aeb4c8' });
  p.line(4, 19, 2, 17, '#aeb4c8'); p.line(4, 23, 2, 25, '#aeb4c8');
  // antennae
  p.line(8, 17, 5, 11, R.rust[3]); p.line(9, 17, 10, 11, R.rust[3]);
  eye(p, 6, 19, '#d9434f', '#ffb0a0');
  return p;
}

function sprite() {
  const p = new Painter();
  const y = '#fff27a';
  // lightning spikes
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const x0 = 16 + Math.cos(a) * 7, y0 = 15 + Math.sin(a) * 7;
    const x1 = 16 + Math.cos(a + 0.3) * 12, y1 = 15 + Math.sin(a + 0.3) * 12;
    p.line(x0, y0, (x0 + x1) / 2 + 1, (y0 + y1) / 2, R.spark[2]);
    p.line((x0 + x1) / 2 + 1, (y0 + y1) / 2, x1, y1, y);
  }
  // core
  p.ellipse(16, 15, 7, 7, R.spark);
  p.ellipse(15, 14, 3.5, 3.5, ['#ffffff', '#ffffff', '#ffffe8', '#fff27a']);
  eye(p, 12, 14); eye(p, 17, 14);
  p.stamp(['o.o', '.o.'], 14, 18);
  // tail spark
  p.stamp(['.y', 'yy', 'y.', '.y'], 15, 24, { y });
  return p;
}

function automaton() {
  const p = new Painter();
  // legs
  p.rect(12, 24, 3, 6, R.steel[2]); p.rect(18, 24, 3, 6, R.steel[2]);
  p.rect(11, 29, 5, 1, R.steel[3]); p.rect(17, 29, 5, 1, R.steel[3]);
  // torso
  p.ellipse(16, 19, 7, 6.5, R.steel);
  p.ellipse(16, 20, 2.5, 2.5, R.brass);
  // back arm
  p.ellipse(23, 18, 2.5, 4, R.steel);
  // head with visor
  p.ellipse(16, 9, 5.5, 5, R.steel);
  p.rect(11, 9, 8, 2, '#1a1423');
  p.rect(12, 9, 4, 1, '#7fd8e8');
  p.poly([[14, 4], [18, 4], [16, 1]], '#d9434f');
  // round brass shield held forward
  p.ellipse(7, 19, 5, 6, R.brass);
  p.ellipse(7, 19, 2, 2.5, R.brass.slice().reverse());
  // gear on the chest
  for (const [x, y] of [[16, 16], [13, 20], [19, 20]]) p.px(x, y, R.brass[0]);
  return p;
}

function titan() {
  const p = new Painter();
  // legs
  p.ellipse(12, 27, 4, 3, R.rust); p.ellipse(24, 27, 4, 3, R.rust);
  // back arm and pipes
  p.ellipse(27, 16, 3.5, 6, R.rust);
  p.line(22, 6, 26, 3, R.steel[3], 2); p.line(26, 3, 26, 8, R.steel[3], 2);
  // hulking body
  p.ellipse(18, 17, 11, 10, R.rust);
  for (const [x, y] of [[12, 13], [16, 11], [22, 12], [25, 18], [20, 23], [13, 21]]) p.px(x, y, '#e0a060');
  p.line(10, 17, 26, 17, R.rust[3]);
  // small head, glowing eye
  p.ellipse(10, 9, 4.5, 4, R.steel);
  p.rect(6, 9, 5, 2, '#1a1423'); p.rect(7, 9, 2, 1, '#ff5a3a'); p.px(6, 10, '#ff5a3a');
  // hammer fist
  p.line(9, 17, 5, 22, R.rust[2], 3);
  p.rect(0, 20, 8, 7, R.steel[2]); p.rect(1, 21, 6, 1, R.steel[0]); p.rect(0, 26, 8, 1, R.steel[3]);
  return p;
}

function tesla() {
  const p = new Painter();
  // tripod base
  p.line(16, 22, 9, 30, R.steel[3], 2); p.line(16, 22, 23, 30, R.steel[3], 2); p.rect(13, 22, 7, 3, R.steel[2]);
  // coil column with copper rings
  p.rect(14, 10, 5, 13, R.steel[2]);
  for (let y = 11; y <= 21; y += 2) p.rect(12, y, 9, 1, R.copper[y % 4 === 1 ? 1 : 2]);
  // sphere
  p.ellipse(16, 7, 5.5, 5.5, R.steel);
  p.px(14, 5, 'w'); p.px(13, 6, 'w');
  // eye in the sphere
  p.rect(12, 7, 5, 2, '#1a1423'); p.rect(13, 7, 2, 1, '#fff27a');
  // arcs
  const y = '#fff27a';
  p.stamp(['y..', '.y.', 'y..', '.y.'], 4, 2, { y }); p.stamp(['..y', '.y.', 'y..'], 25, 4, { y });
  p.stamp(['y', '.', 'y'], 7, 14, { y });
  return p;
}

// ================================================================ day 4: Haunted Moor

function bat() {
  const p = new Painter();
  // wings
  p.poly([[14, 13], [2, 6], [4, 12], [1, 16], [6, 16], [5, 21], [13, 17]], R.bat[2]);
  p.poly([[18, 13], [30, 6], [28, 12], [31, 16], [26, 16], [27, 21], [19, 17]], R.bat[3]);
  p.line(13, 14, 3, 7, R.bat[1]); p.line(19, 14, 29, 7, R.bat[2]);
  // body
  p.ellipse(16, 16, 5, 6, R.bat);
  // ears
  p.poly([[12, 11], [13, 5], [15, 10]], R.bat[1]); p.poly([[17, 10], [19, 5], [20, 11]], R.bat[2]);
  // face
  p.px(13, 14, '#ff4a5a'); p.px(14, 14, '#ff4a5a'); p.px(17, 14, '#ff4a5a'); p.px(18, 14, '#ff4a5a');
  p.px(14, 18, 'w'); p.px(17, 18, 'w');
  p.stamp(['oooo'], 14, 17);
  // feet
  p.line(15, 22, 15, 25, R.bat[3]); p.line(17, 22, 17, 25, R.bat[3]);
  return p;
}

function skeleton() {
  const p = new Painter();
  const bone = R.bone;
  // legs
  p.line(14, 22, 12, 30, bone[2], 2); p.line(18, 22, 20, 30, bone[2], 2);
  // spine and ribs
  p.line(16, 13, 16, 22, bone[2], 2);
  for (let y = 14; y <= 20; y += 2) p.line(12, y, 20, y, bone[1]);
  p.rect(13, 21, 7, 2, bone[2]);
  // arm with rusty sword, pointing left
  p.line(12, 15, 8, 19, bone[1], 2);
  p.line(7, 19, 0, 16, '#b0623a', 2); p.px(0, 16, '#e0a070');
  p.rect(6, 18, 3, 3, '#7a4a2c');
  // skull
  p.ellipse(15, 8, 5.5, 5, bone);
  p.rect(11, 11, 7, 2, bone[1]);
  p.stamp(['oo.oo', 'or.ro'], 11, 7, { r: '#ff4a5a' });
  p.stamp(['w.w.w'], 12, 12);
  return p;
}

function crow() {
  const p = new Painter();
  // tail
  p.poly([[22, 18], [31, 22], [30, 26], [21, 22]], R.crow[3]);
  // legs
  p.line(15, 24, 14, 30, '#3a2f22'); p.line(18, 24, 19, 30, '#3a2f22');
  // body
  p.ellipse(17, 19, 8, 6.5, R.crow);
  // wing
  p.ellipse(20, 18, 6, 4, R.crow.slice(1).concat(R.crow[3]));
  p.line(15, 17, 26, 20, R.crow[3]);
  // head
  p.ellipse(10, 12, 5, 4.5, R.crow);
  // beak
  p.poly([[6, 11], [1, 13], [6, 14]], '#f2c14e'); p.line(2, 13, 6, 13, '#b8862b');
  // glowing hex eye
  p.px(9, 11, '#e0b0ff'); p.px(10, 11, '#c07cff'); p.px(9, 12, '#c07cff');
  // floating hex sigil
  const h = '#c07cff';
  p.stamp(['.hhh.', 'h...h', 'h.h.h', 'h...h', '.hhh.'], 12, 1, { h });
  return p;
}

function shade() {
  const p = new Painter();
  // wispy lower body
  for (let i = 0; i < 5; i++) p.ellipse(13 + i * 2, 26 - i * 0.5, 3, 3, R.shade.slice(1).concat(R.shade[3]));
  p.poly([[10, 26], [8, 31], [13, 28], [16, 31], [18, 28], [22, 31], [23, 25]], R.shade[3]);
  // hooded body
  p.ellipse(16, 17, 8, 9, R.shade);
  p.poly([[9, 11], [16, 1], [23, 11]], R.shade[1]);
  // dark hood opening
  p.ellipse(13, 12, 4.5, 4, ['#120c1e', '#120c1e', '#120c1e', '#120c1e']);
  p.px(11, 12, '#b0f0ff'); p.px(12, 12, '#b0f0ff'); p.px(14, 12, '#b0f0ff'); p.px(15, 12, '#b0f0ff');
  // clawed hand reaching
  p.line(10, 18, 4, 20, R.shade[2], 2);
  p.stamp(['s.', 'ss', 's.'], 1, 19, { s: R.shade[0] });
  return p;
}

function boneknight() {
  const p = new Painter();
  // cape
  p.poly([[18, 10], [29, 14], [27, 30], [19, 28]], '#5b1a2e');
  // legs, armoured
  p.rect(12, 23, 3, 7, R.steel[3]); p.rect(18, 23, 3, 7, R.steel[3]);
  // torso armour over ribs
  p.ellipse(16, 18, 7, 6.5, R.steel.map((c, i) => (i === 0 ? '#e8e0f0' : c)));
  for (let y = 16; y <= 20; y += 2) p.line(13, y, 19, y, R.bone[2]);
  // greatsword
  p.line(10, 20, 1, 5, R.steel[1], 2); p.line(10, 20, 1, 5, R.steel[0]);
  p.rect(8, 19, 5, 2, '#b8862b'); p.line(11, 21, 12, 24, '#7a4a2c', 2);
  // horned skull helm
  p.ellipse(16, 8, 5.5, 5, R.bone);
  p.poly([[11, 6], [7, 0], [13, 4]], R.bone[1]); p.poly([[21, 6], [25, 0], [19, 4]], R.bone[2]);
  p.stamp(['oo.oo', 'or.ro'], 12, 7, { r: '#ff4a5a' });
  p.stamp(['w.w.w'], 13, 11);
  return p;
}

function witch() {
  const p = new Painter();
  // robe
  p.poly([[10, 14], [22, 14], [26, 30], [7, 30]], R.witch[2]);
  p.poly([[16, 14], [22, 14], [26, 30], [18, 30]], R.witch[3]);
  p.rect(9, 27, 16, 1, R.witch[1]);
  // staff with green orb
  p.line(6, 10, 6, 30, '#7a4a2c', 2);
  p.ellipse(6, 7, 3, 3, ['#e8ffc0', '#a6e87e', '#6cc24a', '#3d7f37']);
  // face
  p.ellipse(15, 11, 4, 4, R.witchSkin);
  p.poly([[11, 12], [8, 14], [11, 13]], R.witchSkin[2]); // pointy nose
  p.px(13, 10, '#ffe066'); p.px(16, 10, '#ffe066');
  p.stamp(['.o.o.'], 12, 13);
  // hat
  p.poly([[8, 8], [24, 8], [22, 6], [18, -1], [12, 5]], R.witch[1]);
  p.poly([[15, 5], [18, -1], [22, 6]], R.witch[2]);
  p.rect(7, 7, 18, 2, R.witch[3]);
  p.rect(12, 6, 8, 1, '#f2c14e');
  // hand
  p.ellipse(8, 16, 1.5, 1.5, R.witchSkin);
  return p;
}

// ================================================================ day 5: Dragon Peak

function emberling() {
  const p = new Painter();
  // flame tail
  p.poly([[20, 22], [30, 14], [27, 22], [31, 26], [22, 26]], R.ember[2]);
  p.poly([[22, 22], [28, 17], [26, 23]], R.ember[1]);
  // legs
  p.rect(12, 25, 3, 5, R.drake[3]); p.rect(18, 25, 3, 5, R.drake[3]);
  // body
  p.ellipse(16, 21, 7, 6, R.drake);
  p.ellipse(15, 23, 3.5, 2.5, R.ember);
  // wing nub
  p.poly([[18, 14], [26, 8], [23, 17]], R.drake[2]);
  // head
  p.ellipse(10, 13, 6, 5, R.drake);
  p.ellipse(5, 15, 3, 2, R.drake);
  p.poly([[11, 8], [13, 3], [14, 9]], R.ember[1]); p.poly([[8, 9], [8, 4], [10, 9]], R.ember[2]);
  eye(p, 8, 11, '#1a1423', '#fff27a');
  p.px(3, 15, 'o');
  // flame puff
  p.stamp(['.y', 'yf', '.f'], 0, 16, { y: '#fff27a', f: '#f58a3a' });
  return p;
}

function harpy() {
  const p = new Painter();
  // wings raised
  p.poly([[16, 14], [2, 2], [6, 10], [1, 12], [8, 16]], R.harpy[2]);
  p.poly([[18, 14], [31, 3], [27, 11], [31, 14], [24, 18]], R.harpy[3]);
  for (let i = 0; i < 4; i++) p.line(15 - i * 3, 14 - i * 2, 4 + i, 4 + i * 2, R.harpy[1]);
  // body
  p.ellipse(16, 18, 5, 6, R.harpy);
  // talons
  p.line(14, 23, 13, 29, '#b8862b'); p.line(18, 23, 19, 29, '#b8862b');
  p.stamp(['y.y'], 12, 29, { y: '#b8862b' }); p.stamp(['y.y'], 18, 29, { y: '#b8862b' });
  // head with feathered crest
  p.ellipse(14, 10, 4, 4, R.skin);
  p.poly([[11, 8], [18, 5], [20, 10], [17, 8]], R.harpy[1]);
  eye(p, 12, 10, '#3a78c9');
  p.px(12, 13, '#d9434f');
  // sparks
  p.stamp(['y', '.', 'y'], 3, 20, { y: '#fff27a' });
  return p;
}

function tortoise() {
  const p = new Painter();
  // legs
  p.ellipse(10, 27, 3, 2.5, R.turtle); p.ellipse(23, 27, 3, 2.5, R.turtle);
  // shell dome
  p.ellipse(17, 20, 12, 8, R.turtle, { clip: (x, y) => y <= 25 });
  p.rect(5, 25, 24, 1, R.turtle[3]);
  // crystals on the shell
  const c = R.crystal;
  p.poly([[10, 16], [12, 4], [15, 15]], c[1]); p.poly([[12, 4], [15, 15], [13, 15]], c[2]);
  p.poly([[16, 14], [19, 1], [22, 14]], c[0]); p.poly([[19, 1], [22, 14], [20, 14]], c[2]);
  p.poly([[22, 16], [26, 7], [28, 17]], c[1]); p.poly([[26, 7], [28, 17], [27, 17]], c[3]);
  // head
  p.ellipse(5, 21, 4.5, 3.5, R.turtle);
  eye(p, 3, 20);
  p.px(1, 22, R.turtle[3]);
  return p;
}

function roc() {
  const p = new Painter();
  // big wing raised behind
  p.poly([[14, 16], [22, 1], [31, 4], [27, 10], [30, 13], [22, 19]], R.roc[2]);
  for (let i = 0; i < 4; i++) p.line(16 + i * 3, 15, 22 + i * 2, 3 + i * 2, R.roc[1]);
  // lightning stripe on wing
  p.stamp(['y..', '.yy', '..y', '.y.'], 23, 6, { y: '#fff27a' });
  // body
  p.ellipse(15, 20, 8, 6, R.roc);
  // tail
  p.poly([[22, 21], [31, 24], [29, 27], [21, 24]], R.roc[3]);
  // legs
  p.line(13, 25, 12, 30, '#b8862b', 2); p.line(17, 25, 18, 30, '#b8862b', 2);
  // head and beak
  p.ellipse(9, 12, 5, 4.5, R.roc);
  p.poly([[5, 11], [0, 14], [5, 15]], '#f2c14e');
  eye(p, 7, 10, '#1a1423', '#fff27a');
  // crest
  p.poly([[10, 8], [14, 3], [13, 9]], '#fff27a');
  return p;
}

function drake() {
  const p = new Painter();
  // wing behind
  p.poly([[16, 12], [26, 0], [31, 2], [29, 8], [31, 12], [22, 16]], R.drake[3]);
  p.line(18, 12, 27, 1, R.drake[2]); p.line(20, 14, 30, 6, R.drake[2]);
  // tail
  p.poly([[22, 22], [31, 26], [31, 29], [20, 26]], R.drake[2]);
  // legs
  p.ellipse(13, 27, 3, 2.5, R.drake); p.ellipse(21, 27, 3, 2.5, R.drake);
  // body
  p.ellipse(18, 21, 9, 6, R.drake);
  p.ellipse(15, 23, 5, 3, R.ember.map((c, i) => (i === 3 ? '#b06a2e' : c)));
  // neck and head
  p.line(12, 18, 8, 11, R.drake[1], 4);
  p.ellipse(7, 9, 5, 4, R.drake);
  p.ellipse(2, 11, 3, 2.2, R.drake);
  // horns
  p.poly([[8, 6], [13, 1], [11, 7]], R.bone[1]); p.poly([[5, 6], [6, 1], [8, 6]], R.bone[2]);
  eye(p, 5, 8, '#1a1423', '#fff27a');
  // fire breath
  p.stamp(['..yf', '.yff', 'y.f.'], 0, 13, { y: '#fff27a', f: '#f58a3a' });
  return p;
}

function colossus() {
  const p = new Painter();
  const c = R.prism;
  // legs: crystal pillars
  p.poly([[9, 22], [14, 22], [13, 30], [9, 30]], c[2]); p.poly([[18, 22], [23, 22], [23, 30], [19, 30]], c[3]);
  // body facets
  p.poly([[8, 8], [24, 7], [27, 22], [6, 23]], c[2]);
  p.poly([[8, 8], [16, 7], [15, 22], [6, 23]], c[1]);
  p.poly([[16, 7], [24, 7], [20, 15]], c[0]);
  p.poly([[20, 15], [27, 22], [15, 22]], c[3]);
  // glowing core
  p.ellipse(16, 15, 3, 3, ['#ffffff', '#fff27a', '#f2c14e', '#e0864a']);
  // arms: crystal shards, the front one raised
  p.poly([[7, 10], [1, 3], [3, 12]], c[1]); p.poly([[1, 3], [4, 1], [3, 12]], c[0]);
  p.poly([[25, 10], [31, 18], [26, 20]], c[3]);
  // head
  p.poly([[11, 2], [19, 1], [18, 8], [12, 8]], c[1]);
  p.rect(12, 4, 6, 2, '#1a1423'); p.rect(12, 4, 2, 1, '#7fd8e8'); p.rect(16, 4, 2, 1, '#7fd8e8');
  return p;
}

// Some builders use '.' to punch holes; also drop the placeholder cut colour.
function clean(p) {
  for (const row of p.g) for (let i = 0; i < row.length; i++) if (row[i] === 'transparent-cut') row[i] = '.';
  return p;
}

export const MORE_MOBS = {
  crab, jelly, eel, oyster, crabking, siren,
  cogling, mite, sprite, automaton, titan, tesla,
  bat, skeleton, crow, shade, boneknight, witch,
  emberling, harpy, tortoise, roc, drake, colossus,
};
