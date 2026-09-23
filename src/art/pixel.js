// Sprites are written as data: rows of letters, each letter a palette key.
// This module turns layers of those grids into outlined pixel images.
//
// Layers are composited in order. Each layer casts a 1 px contact shadow onto
// whatever it overlaps (a darker shade of the colour beneath), and the finished
// silhouette gets a 1 px outline in the outline colour. That keeps every piece
// readable at small sizes without hand-drawing every seam.

import { PALETTE, OUTLINE, darken } from './palette.js';

export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }
}

// Resolve a character to a hex colour through an optional per-layer map
// (used for ramps: hair '1','2','3', armour '4','5','6', etc).
function resolve(ch, map) {
  if (ch === '.' || ch === ' ') return null;
  if (map && ch in map) return map[ch];
  return PALETTE[ch] ?? null;
}

// layer: { rows, x=0, y=0, map, flip, outline=true, shadow=true }
export function compose(w, h, layers, { outline = true, shade = darken } = {}) {
  const g = new Grid(w, h);
  for (const L of layers) {
    if (!L || !L.rows) continue;
    const lw = Math.max(...L.rows.map((r) => r.length));
    const own = new Grid(w, h);
    L.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const c = resolve(row[rx], L.map);
        if (!c) continue;
        const x = (L.x || 0) + (L.flip ? lw - 1 - rx : rx);
        own.set(x, (L.y || 0) + ry, c);
      }
    });
    if (L.shadow !== false) {
      // Contact shadow on what's already there, where this layer's edge sits over it.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (own.get(x, y)) continue;
          const under = g.get(x, y);
          if (!under || under === OUTLINE) continue;
          if (own.get(x - 1, y) || own.get(x + 1, y) || own.get(x, y - 1) || own.get(x, y + 1)) {
            g.set(x, y, shade(under));
          }
        }
      }
    }
    for (let i = 0; i < own.px.length; i++) if (own.px[i]) g.px[i] = own.px[i];
  }
  if (outline) addOutline(g);
  return g;
}

export function addOutline(g, color = OUTLINE) {
  const edge = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.get(x, y)) continue;
      if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) g.set(x, y, color);
  return g;
}

// Plain grid of palette letters -> Grid, no outline pass (for hand-outlined art).
export function fromRows(rows, map) {
  const w = Math.max(...rows.map((r) => r.length));
  const g = new Grid(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) g.set(x, y, resolve(row[x], map));
  });
  return g;
}

export function rotateRowsCW(rows) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const out = [];
  for (let x = 0; x < w; x++) {
    let s = '';
    for (let y = h - 1; y >= 0; y--) s += rows[y][x] ?? '.';
    out.push(s);
  }
  return out;
}

export function flipRows(rows) {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.').split('').reverse().join(''));
}

// Swap letters in a grid, e.g. to recolour a shape into a ramp.
export function recolor(rows, swaps) {
  return rows.map((r) => r.replace(/./g, (c) => (c in swaps ? swaps[c] : c)));
}

// ---------------------------------------------------------------- canvas

const cache = new Map();

export function gridToCanvas(g, scale = 1) {
  const c = document.createElement('canvas');
  c.width = g.w * scale;
  c.height = g.h * scale;
  const ctx = c.getContext('2d');
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const col = g.get(x, y);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

export function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// A white silhouette of a grid, for the on-hit flash.
export function silhouette(g, color = '#ffffff') {
  const s = new Grid(g.w, g.h);
  for (let i = 0; i < g.px.length; i++) if (g.px[i]) s.px[i] = color;
  return s;
}
