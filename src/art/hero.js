// The hero paper doll. One base body plus layers: back hair, legs, shoes, top,
// gloves, head, face, front hair, hat and the weapon in hand. Every piece of
// equipped armour is drawn on the body, coloured from the item's ramp.
//
// Semantic keys used in the grids below:
//   1 2 3  hair (light, mid, dark)      4 5 6  skin (light, base, shade)
//   7 8 9  armour main ramp             T U V  armour trim ramp
//   A D F  undershirt ramp              G H K  trousers ramp
//   I J    eye (iris light, iris dark)

import { compose, rotateRowsCW, flipRows } from './pixel.js';
import { RAMPS, HAIR, SKIN, EYES, darken } from './palette.js';
import { ITEMS } from '../data.js';
import { ICONS, SHAPE_ICONS } from './icons.js';

export const HERO_W = 48;
export const HERO_H = 44;
const OX = 8; // doll space -> canvas offset
const OY = 10;

// ---------------------------------------------------------------- body

const HEAD = [
  '....555555....',
  '..5555555555..',
  '.445555555555.',
  '.4455555555556',
  '44555555555556',
  '45555555555556',
  '45555555555556',
  '55555555555566',
  '55555555555566',
  '.555555555556.',
  '.655555555566.',
  '..6655555666..',
  '....666666....',
];
const HEAD_X = 9, HEAD_Y = 3;

const EAR = ['55', '56', '.6'];

// torso + arms, x from 9
const TORSO = [
  '...ADDDDDDF...',
  '..ADDDDDDDDF..',
  '.4ADDDDDDDDF5.',
  '.45DDDDDDDDF55',
  '.55ADDDDDDF.56',
  '.56FFFFFFFF.66',
];
const TORSO_X = 9, TORSO_Y = 16;

const LEGS_SHORTS = [
  '..GGGGGGGGH..',
  '..GGGGGGGHH..',
  '..GGH...GHH..',
  '...55...55...',
  '...56...56...',
];
const LEGS_SKIRT = [
  '..GGGGGGGGH..',
  '.GGGGGGGGGHH.',
  'GGGHGGGHGGHHK',
  '...55...55...',
  '...56...56...',
];
const LEGS_X = 10, LEGS_Y = 22;

const SHOES = [
  '..aab..aab...',
  '.aaab.aaab...',
];
const SHOES_EQUIPPED = [
  '..TTU..TTU...',
  '.778..7789...',
  '7789.77889...',
];
const FEET_X = 10, FEET_Y = 27;

// ---------------------------------------------------------------- face

function faceLayer(look) {
  const girl = look.gender === 'girl';
  // head-relative coordinates
  const rows = Array.from({ length: 13 }, () => '.'.repeat(14).split(''));
  const put = (x, y, c) => { if (rows[y]) rows[y][x] = c; };
  for (const ex of [4, 9]) {
    put(ex, 7, 'o'); put(ex + 1, 7, 'o');
    put(ex, 8, 'w'); put(ex + 1, 8, 'J');
    put(ex, 9, 'I'); put(ex + 1, 9, 'J');
  }
  if (girl) { put(3, 7, 'o'); put(11, 7, 'o'); }
  else { put(4, 6, 'Q'); put(5, 6, 'Q'); put(9, 6, 'Q'); put(10, 6, 'Q'); }
  put(3, 10, 'n'); put(11, 10, 'n'); put(12, 10, 'n');
  put(8, 11, 'R');
  return rows.map((r) => r.join(''));
}

// ---------------------------------------------------------------- hair
// Front pieces sit over the face; back pieces go behind everything. All are
// placed in doll space; the head spans x 9..22, y 3..15.

const CROWN = [
  '......222222......',
  '....2211111122....',
  '...211111111122...',
  '..21111122222222..',
  '..2111222222222223',
  '.221122222222222233',
];

const FRINGE = {
  soft: [
    '.22122232222322223',
    '.2222.2322..32.223',
    '.222...23....3..23',
    '.22..............3',
    '.22...............',
  ],
  blunt: [
    '.22122222222222223',
    '.22222222222222223',
    '.22322322322232223',
    '.22...3...3.....23',
    '.22..............3',
  ],
  swept: [
    '.22122222222222233',
    '.2222222322223..33',
    '.222223.....3....3',
    '.22.2............3',
    '.2................',
  ],
};

const SPIKY_FRONT = [
  '....2..22..2......',
  '...222222222.2....',
  '..221111111222....',
  '.2211111111112222.',
  '.2111122222222223.',
  '22112222222222223.',
  '2212222322232222.3',
  '.22222.232..3223..',
  '.222....3....323..',
  '.22...........3...',
  '.2................',
];
const MESSY_FRONT = [
  '.....2.222...2....',
  '...2222222222.2...',
  '..221111111222....',
  '.22111111111122222',
  '2211112222222222 3',
  '.2112222222222223.',
  '22122223222322223.',
  '.2222.2322.32223..',
  '.222...23...3.23..',
  '.22............3..',
  '.2................',
];

const BACK_LONG = [
  '.....222222.......',
  '...2222222222.....',
  '..222222222222....',
  '.2222222222222....',
  '.22222222222222...',
  '.222222222222222..',
  '.2222222222222222.',
  '.2222222222222222.',
  '.3222222222222223.',
  '.3222222222222223.',
  '.3322222222222233.',
  '.3322222222222233.',
  '.3332222222222333.',
  '.3332222222222333.',
  '.3332.......23333.',
  '.333.........3333.',
  '.333.........333..',
  '..33..........33..',
  '..3...........3...',
];
const BACK_SHORT = [
  '.....222222.......',
  '...2222222222.....',
  '..222222222222....',
  '.2222222222222....',
  '.22222222222222...',
  '.222222222222222..',
  '.2222222222222223.',
  '.2222222222222223.',
  '.3222222222222233.',
  '.3322222222222233.',
  '..33...........3..',
];
const BACK_BOB = [
  '.....222222.......',
  '...2222222222.....',
  '..222222222222....',
  '.2222222222222....',
  '.22222222222222...',
  '.222222222222222..',
  '.2222222222222222.',
  '.2222222222222222.',
  '.3222222222222223.',
  '.3222222222222223.',
  '.3322222222222233.',
  '.3322222222222233.',
  '.3332222222222333.',
  '..333333..333333..',
  '...333......333...',
];
const BACK_SPIKY = [
  '..2..222222.......',
  '.22.2222222222....',
  '.2222222222222....',
  '222222222222222...',
  '.22222222222222...',
  '2222222222222222..',
  '.2222222222222223.',
  '22222222222222223.',
  '.3222222222222233.',
  '.3322222222222233.',
  '..33...........3..',
];
const TAIL = [
  '....nn.',
  '...nrrn',
  '...2222',
  '..22222',
  '.222223',
  '.22223.',
  '22223..',
  '22223..',
  '2223...',
  '2223...',
  '22223..',
  '.2223..',
  '.22223.',
  '..2223.',
  '..2233.',
  '...233.',
  '...33..',
  '..3....',
];
const PONYTAIL = [
  '.....222..',
  '...22222nn',
  '..222222rn',
  '.2222223..',
  '.222223...',
  '22222 3...',
  '22223.....',
  '2223......',
  '2223......',
  '.223......',
  '.2233.....',
  '..233.....',
  '...3......',
];

// Each style lists [rows, x, y] pieces for the back and the front.
const HAIR_STYLES = {
  long: { back: [[BACK_LONG, 7, 1]], front: [[CROWN, 7, 0], [FRINGE.soft, 7, 6]] },
  twintails: { back: [[BACK_SHORT, 7, 1], [TAIL, 2, 4], [flipRows(TAIL), 23, 4]], front: [[CROWN, 7, 0], [FRINGE.blunt, 7, 6]] },
  bob: { back: [[BACK_BOB, 7, 1]], front: [[CROWN, 7, 0], [FRINGE.blunt, 7, 6]] },
  ponytail: { back: [[BACK_SHORT, 7, 1], [PONYTAIL, 0, 2]], front: [[CROWN, 7, 0], [FRINGE.swept, 7, 6]] },
  spiky: { back: [[BACK_SPIKY, 7, 1]], front: [[SPIKY_FRONT, 7, 0]] },
  crop: { back: [[BACK_SHORT, 7, 1]], front: [[CROWN, 7, 0], [FRINGE.swept, 7, 6]] },
  swept: { back: [[BACK_SPIKY, 7, 1]], front: [[CROWN, 7, 0], [FRINGE.swept, 7, 6]] },
  messy: { back: [[BACK_SPIKY, 7, 1]], front: [[MESSY_FRONT, 7, 0]] },
};

export const GIRL_HAIR = ['long', 'twintails', 'bob', 'ponytail'];
export const BOY_HAIR = ['spiky', 'crop', 'swept', 'messy'];

// ---------------------------------------------------------------- armour shapes
// Tops: drawn over the torso at TORSO_X/TORSO_Y. Hats: over the hair.

const TOPS = {
  tunic: [
    '...7788888U...',
    '..778888888U..',
    '.47888888889V.',
    '.4788888888955',
    '.55UUUUUUUU.56',
    '.56TTUUUUVV.66',
    '...88888889...',
  ],
  vest: [
    '..TT7998TTU...',
    '..7789TT988U..',
    '.47788TT8889V.',
    '.4778888888955',
    '.5578888889.56',
    '.56UUUUUUVV.66',
  ],
  plate: [
    '..TTUUUUUUUV..',
    '.T77788888889V',
    'TV7778888889VV',
    '.47778UU88895.',
    '.5577888888956',
    '.56UUVVVVVV.66',
  ],
  robe: [
    '...7788888U...',
    '..77T88888U9..',
    '.477T888888995',
    '.477T888888995',
    '.557T88888899.',
    '.557U88888899.',
    '..77U888888999',
    '..77U888888999',
    '.777V8888889999',
  ],
};

const HATS = {
  slime: [
    '......777777.......',
    '....7777788888.....',
    '...7w7788888888....',
    '..77w7888888888....',
    '..77788888888889...',
    '.7778888888888889..',
    '.8888888888888899..',
    '.889.98889.9889.9..',
    '.99...99....99..9..',
  ],
  shroom: [
    '.....7777777.......',
    '...77TT7778888.....',
    '..77TTT77788TT8....',
    '.7778T7788888TT88..',
    '.77888888TT888888..',
    '7888TT888TT8888889.',
    '8888TT888888888899.',
    '.99999999999999999.',
    '..VVVUUUUUUUUUVV...',
  ],
  hood: [
    '......777777.......',
    '....77777788888....',
    '...7777888888888...',
    '..77788888888888...',
    '..7788888888888889.',
    '.778888888888888899',
    '.7888..........8899',
    '.788............899',
    '.78.............899',
    '.78.............899',
    '.88.............89.',
    '.8...............9.',
  ],
  helm: [
    '.......7777........',
    '....777778888......',
    '...77778888888.....',
    '..777888888888889..',
    '..778888888888889..',
    '.77888888888888899.',
    '.TTTTUUUUUUUUUUUVV.',
    '.UUUVVVVVVVVVVVVV..',
    '.99.............99.',
    '.99.............99.',
    '..9..............9.',
  ],
};

const GLOVE = ['78', '89'];

// ---------------------------------------------------------------- compose

const rampFor = (name) => RAMPS[name] || RAMPS.steel;

function lookMaps(look) {
  const hair = HAIR[look.hairColor] || HAIR.chestnut;
  const skin = SKIN[look.skin] || SKIN.light;
  const eyes = EYES[look.eyes] || EYES.brown;
  const girl = look.gender === 'girl';
  const under = girl ? RAMPS.under_girl : RAMPS.under_boy;
  const pants = girl ? RAMPS.pants_girl : RAMPS.pants_boy;
  return {
    1: hair[0], 2: hair[1], 3: hair[2],
    4: skin[0], 5: skin[1], 6: skin[2],
    A: under[0], D: under[1], F: under[2],
    G: pants[0], H: pants[1], K: pants[2],
    I: eyes[0], J: eyes[1],
    Q: hair[2],
    n: '#f5a3b5',
  };
}

function itemMap(itemId, base) {
  const it = ITEMS[itemId];
  const main = rampFor(it.look?.ramp);
  const trim = rampFor(it.look?.trim || it.look?.ramp);
  return { ...base, 7: main[0], 8: main[1], 9: main[2], T: trim[0], U: trim[1], V: trim[2] };
}

// Skin takes a warm shade under hair and clothes instead of a grey one.
function shaderFor(look) {
  const skin = SKIN[look.skin] || SKIN.light;
  const warm = { [skin[0]]: skin[2], [skin[1]]: skin[2], [skin[2]]: darken(skin[2], 0.22) };
  return (c) => warm[c] || darken(c, 0.3);
}

// equip: { slot: itemId }   pose: 'idle' | 'swing'
export function heroLayers(look, equip = {}, pose = 'idle') {
  const base = lookMaps(look);
  const L = [];
  const style = HAIR_STYLES[look.hair] || HAIR_STYLES.long;
  const at = (rows, x, y, map = base, opts = {}) => L.push({ rows, x: x + OX, y: y + OY, map, ...opts });

  for (const [rows, x, y] of style.back) at(rows, x, y);

  // legs and feet
  at(look.gender === 'girl' ? LEGS_SKIRT : LEGS_SHORTS, LEGS_X, LEGS_Y);
  if (equip.shoes) at(SHOES_EQUIPPED, FEET_X, FEET_Y - 1, itemMap(equip.shoes, base));
  else at(SHOES, FEET_X, FEET_Y);

  // torso and top
  at(TORSO, TORSO_X, TORSO_Y);
  if (equip.top) at(TOPS[ITEMS[equip.top].look.shape], TORSO_X, TORSO_Y, itemMap(equip.top, base));
  if (equip.gloves) at(GLOVE, TORSO_X + 1, TORSO_Y + 4, itemMap(equip.gloves, base));

  // head
  at(EAR, HEAD_X - 1, HEAD_Y + 6);
  at(HEAD, HEAD_X, HEAD_Y);
  at(faceLayer(look), HEAD_X, HEAD_Y, base, { shadow: false });
  const hat = equip.hat ? ITEMS[equip.hat].look.shape : null;
  for (const [rows, x, y] of style.front) {
    // a helm or hood hides the crown; the fringe still peeks out
    if (hat && rows === CROWN) continue;
    at(rows, x, y);
  }
  if (hat) at(HATS[hat], 6, 0, itemMap(equip.hat, base));

  // weapon, then the front hand over its grip
  const hand = pose === 'swing' ? { x: 23, y: 19 } : { x: 21, y: 20 };
  if (equip.weapon) {
    const it = ITEMS[equip.weapon];
    const icon = ICONS[it.icon];
    let rows = icon.rows;
    let grip = icon.grip;
    if (pose === 'swing') {
      rows = rotateRowsCW(rows);
      grip = [rows[0].length - 1 - icon.grip[1], icon.grip[0]];
    }
    at(rows, hand.x - grip[0], hand.y - grip[1], icon.map(it.ramp));
  }
  at(equip.gloves ? GLOVE : ['45', '56'], hand.x, hand.y, equip.gloves ? itemMap(equip.gloves, base) : base);
  return L;
}

export function heroGrid(look, equip, pose) {
  return compose(HERO_W, HERO_H, heroLayers(look, equip, pose), { shade: shaderFor(look) });
}

SHAPE_ICONS.hat = HATS;
