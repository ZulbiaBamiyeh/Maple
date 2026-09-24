// The shared palette. The first 20 keys are the manuscript's palette; the rest
// extend it with skin, hair and material ramps so the hero and gear can be
// shaded properly (light from the top-left, three steps per material).

export const PALETTE = {
  // manuscript palette
  o: '#1a1423', k: '#3b2d4a', g: '#6b6a80', s: '#aeb4c8', w: '#f4f1ff',
  b: '#7a4a2c', B: '#b0763f', y: '#f2c14e', Y: '#b8862b', r: '#d9434f',
  R: '#8f2437', f: '#f58a3a', e: '#6cc24a', E: '#3d7f37', c: '#7fd8e8',
  C: '#3a78c9', p: '#9a5cc6', P: '#5b347d', m: '#f1d9b5', n: '#f28bb0',
  // extensions
  M: '#dcae8e', // skin shade
  N: '#ffc9d9', // soft pink highlight
  h: '#fff6d8', // warm highlight
  d: '#241a31', // deep shadow
  a: '#4e2e1d', // dark leather
  l: '#c6f28a', // lime highlight
  i: '#d4f6ff', // ice highlight
  j: '#24508f', // deep blue
  t: '#5e1830', // deep crimson
  u: '#7c5a1c', // deep gold
  v: '#cdb592', // cream shade
  x: '#8b92ac', // steel shade
  z: '#44475e', // steel dark
};

export const OUTLINE = PALETTE.o;

// Three-step ramps (light, mid, dark) used through semantic digits in layers.
export const RAMPS = {
  wood: ['#d49a5a', '#b0763f', '#7a4a2c'],
  jelly: ['#b7f08a', '#6cc24a', '#3d7f37'],
  shroom: ['#ee6b73', '#d9434f', '#8f2437'],
  spore: ['#b98adf', '#9a5cc6', '#5b347d'],
  bone: ['#fbf3dd', '#e0d2b0', '#a8977a'],
  hide: ['#d09360', '#a2683f', '#6a4128'],
  ice: ['#d4f6ff', '#7fd8e8', '#3a78c9'],
  frost: ['#f2f8ff', '#bcd4f0', '#7d9bcc'],
  stone: ['#c2b8a8', '#8f8577', '#5c554c'],
  steel: ['#f4f1ff', '#aeb4c8', '#6b6a80'],
  gold: ['#ffe08a', '#f2c14e', '#b8862b'],
  imp: ['#e8566a', '#b8324a', '#6e1b33'],
  ember: ['#ffc36b', '#f58a3a', '#d9434f'],
  linen: ['#fbf6ea', '#e6d9bd', '#b4a283'],
  leather: ['#b0763f', '#7a4a2c', '#4e2e1d'],
  cream: ['#fffaf0', '#f1d9b5', '#cdb592'],
  night: ['#6b5a93', '#4a3b6e', '#2d2447'],
  // default outfits under the armour
  under_girl: ['#fde7ef', '#f6b8cc', '#d4829d'],
  under_boy: ['#e6f0ff', '#a9c1e6', '#6f89b8'],
  pants_girl: ['#8f7ac9', '#6c58a8', '#463a78'],
  pants_boy: ['#6d7fa8', '#4c5c86', '#323d5e'],
};

export const HAIR = {
  chestnut: ['#c98552', '#94593a', '#5e3622'],
  blond: ['#fff0a8', '#f2c85e', '#bf8d36'],
  ash: ['#f0ece4', '#c7c0b4', '#8e8578'],
  pink: ['#ffc8dc', '#f28bb0', '#bf5a84'],
  mint: ['#c6f5df', '#79d1ad', '#3f9577'],
  midnight: ['#6f7fc7', '#43509a', '#272e63'],
  lavender: ['#e6d6ff', '#b69ae6', '#7a5fb3'],
  crimson: ['#f07070', '#c23a4c', '#7a1f36'],
  silver: ['#ffffff', '#d3dbee', '#949fbd'],
  raven: ['#5a5470', '#3a3450', '#221d33'],
};

export const SKIN = {
  light: ['#fff0e0', '#f6d5bb', '#e0a98e'],
  fair: ['#ffe9d6', '#f1d0b0', '#d6a27f'],
  tan: ['#f4c9a0', '#dca47a', '#b67a56'],
  deep: ['#c68c62', '#a06a45', '#744830'],
};

export const EYES = {
  blue: ['#9fd4ff', '#3a78c9'],
  green: ['#a6e87e', '#3d7f37'],
  brown: ['#d49a5a', '#7a4a2c'],
  amber: ['#ffd36b', '#c27a1e'],
  violet: ['#d3a8ff', '#7a47b8'],
  pink: ['#ffc2dc', '#c24f86'],
};

// Contact shadow: blend toward a cool purple-black. Memoized.
const DARK = [26, 18, 40];
const memo = new Map();
export function darken(hex, amt = 0.38) {
  const key = hex + amt;
  if (memo.has(key)) return memo.get(key);
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = '#' + rgb.map((v, i) => Math.round(v + (DARK[i] - v) * amt).toString(16).padStart(2, '0')).join('');
  memo.set(key, out);
  return out;
}

// Map semantic digits to a ramp: base '1','2','3' -> light, mid, dark.
export const rampMap = (ramp, keys = '123') => ({ [keys[0]]: ramp[0], [keys[1]]: ramp[1], [keys[2]]: ramp[2] });
