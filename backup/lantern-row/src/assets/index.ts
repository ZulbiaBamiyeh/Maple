/**
 * The only module in the game that knows where a pixel comes from. §4.3
 *
 * Porting to MapleStory Worlds means rewriting this file and the shell; the
 * simulation under src/core never imports it.
 */
import type { Equip, Expression, Look, Manifest, Part, Pose } from './types';

export type { Look, Pose, Expression, Part, Equip, Manifest } from './types';
export type { PoolGroup } from './types';

/** Relative to the page, so the build works at a domain root or under a path. */
const BASE = new URL('assets/', document.baseURI).href;

let manifest: Manifest;
const images = new Map<string, HTMLImageElement>();

export function assets(): Manifest {
  if (!manifest) throw new Error('assets not loaded — await loadAssets() first');
  return manifest;
}

export async function loadAssets(): Promise<Manifest> {
  const res = await fetch(assetUrl('manifest.json'));
  manifest = (await res.json()) as Manifest;
  return manifest;
}

export function assetUrl(rel: string): string {
  return BASE + rel;
}

export function getItemIcon(iconKey: string): string {
  const entry = manifest.icons[iconKey];
  return assetUrl(entry ? entry.file : `items/${iconKey}.png`);
}

function spriteUrl(part: Part): string {
  return manifest.sprites[part.url] ?? '';
}

/** Decodes every sprite the wardrobe can reach, once, up front. */
export async function preloadSprites(onProgress?: (done: number, total: number) => void) {
  const urls = new Set<string>();
  const add = (parts: Part[]) => parts.forEach((p) => urls.add(spriteUrl(p)));
  for (const poses of Object.values(manifest.skins)) Object.values(poses).forEach(add);
  for (const eq of Object.values(manifest.equips)) {
    Object.values(eq.poses).forEach(add);
    if (eq.expressions) Object.values(eq.expressions).forEach(add);
  }
  const list = [...urls];
  let done = 0;
  await Promise.all(
    list.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => {
            images.set(url, img);
            onProgress?.(++done, list.length);
            resolve();
          };
          img.src = url;
        }),
    ),
  );
}

export function frameCount(pose: Pose): number {
  const spec = manifest.frames[pose];
  return spec ? spec.length : 1;
}

export function frameDelay(pose: Pose, frame: number): number {
  const spec = manifest.frames[pose];
  return spec && spec[frame] ? spec[frame].d : 180;
}

// ---------------------------------------------------------------- composition

interface Placed {
  part: Part;
  x: number;
  y: number;
  z: number;
}

const EAR_PARTS = new Set(['ear', 'lefEar', 'highlefEar', 'humanEar']);

function zIndex(z: string): number {
  const n = manifest.order[z];
  return typeof n === 'number' ? n : 60;
}

function equip(id: number | undefined): Equip | undefined {
  return id === undefined ? undefined : manifest.equips[String(id)];
}

/**
 * Lays out one frame the way the client does: the body is the root, every other
 * piece hangs off a named attachment point (neck, navel, hand, brow) until
 * nothing is left to place.
 */
function layout(look: Look, pose: Pose, frame: number): Placed[] {
  const key = `${pose}/${frame}`;
  const skin = manifest.skins[look.skin] ?? manifest.skins['0'];
  const body = skin[key] ?? skin[`stand1/0`];
  if (!body) return [];

  const pending: Part[] = body.filter((p) => !EAR_PARTS.has(p.name ?? ''));

  const wearing = [look.cape, look.shoes, look.pants, look.coat, look.glove, look.cap, look.weapon];
  const covered = new Set<string>();
  for (const id of wearing) {
    const eq = equip(id);
    if (!eq) continue;
    // A longcoat's vslot claims the pants slot, so the pants are simply not drawn.
    for (const m of eq.vslot.match(/[A-Z][a-z0-9]?/g) ?? []) {
      if (m !== eq.islot) covered.add(m);
    }
  }
  for (const id of wearing) {
    const eq = equip(id);
    if (!eq || covered.has(eq.islot)) continue;
    const parts = eq.poses[key] ?? eq.poses['stand1/0'];
    if (parts) pending.push(...parts);
  }

  const face = equip(look.hair);
  if (face) {
    const parts = face.poses[key] ?? face.poses['stand1/0'];
    if (parts) pending.push(...parts);
  }

  const anchors = new Map<string, { x: number; y: number }>();
  const placed: Placed[] = [];
  const root = pending.shift()!; // body
  place(root, 0, 0);

  function place(part: Part, x: number, y: number) {
    placed.push({ part, x, y, z: zIndex(part.z) });
    for (const [name, off] of Object.entries(part.maps ?? {})) {
      if (!anchors.has(name)) anchors.set(name, { x: x + off.x, y: y + off.y });
    }
  }

  let progress = true;
  while (pending.length && progress) {
    progress = false;
    for (let i = 0; i < pending.length; i++) {
      const part = pending[i];
      const maps = Object.entries(part.maps ?? {});
      const hit = maps.find(([name]) => anchors.has(name));
      if (!hit && maps.length) continue;
      const [name, off] = hit ?? ['', { x: 0, y: 0 }];
      const anchor = name ? anchors.get(name)! : { x: 0, y: 0 };
      place(part, anchor.x - off.x, anchor.y - off.y);
      pending.splice(i, 1);
      i--;
      progress = true;
    }
  }

  // The classic order table counts down from the front, so draw high indices first.
  return placed.sort((a, b) => b.z - a.z);
}

/** Faces live outside the pose table — they key off expression instead. */
function facePart(look: Look, expression: Expression): Part[] {
  const eq = equip(look.face);
  if (!eq?.expressions) return [];
  return eq.expressions[expression] ?? eq.expressions.default ?? [];
}

export interface Rendered {
  canvas: HTMLCanvasElement;
  /** Where the character's feet sit inside the canvas. */
  anchor: { x: number; y: number };
}

const cache = new Map<string, Rendered>();

function lookKey(look: Look): string {
  return [look.skin, look.face, look.hair, look.cap, look.coat, look.pants, look.shoes,
    look.glove, look.cape, look.weapon].join('.');
}

/**
 * Composes one frame into a canvas with the feet as the anchor point. Cached —
 * a look is drawn once and blitted forever after.
 */
export function getCharacterSprite(
  look: Look,
  pose: Pose = 'stand1',
  frame = 0,
  expression: Expression = 'default',
): Rendered {
  const key = `${lookKey(look)}|${pose}/${frame}|${expression}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const parts = layout(look, pose, frame);
  const faces = facePart(look, expression).map((part) => ({ part, z: zIndex(part.z) }));

  // Faces attach to the brow anchor, which layout() has already resolved.
  const head = parts.find((p) => p.part.maps?.brow);
  const brow = head ? { x: head.x + head.part.maps!.brow.x, y: head.y + head.part.maps!.brow.y }
    : { x: 0, y: 0 };
  const all: Placed[] = [
    ...parts,
    ...faces.map(({ part, z }) => ({
      part,
      x: brow.x - (part.maps?.brow?.x ?? 0),
      y: brow.y - (part.maps?.brow?.y ?? 0),
      z,
    })),
  ].sort((a, b) => b.z - a.z);

  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  for (const p of all) {
    const x = p.x - p.part.origin.x, y = p.y - p.part.origin.y;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + p.part.w); maxY = Math.max(maxY, y + p.part.h);
  }

  const pad = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(maxX - minX) + pad * 2);
  canvas.height = Math.max(1, Math.ceil(maxY - minY) + pad * 2);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (const p of all) {
    const img = images.get(spriteUrl(p.part));
    if (!img || !img.width) continue;
    ctx.drawImage(img, Math.round(p.x - p.part.origin.x - minX + pad), Math.round(p.y - p.part.origin.y - minY + pad));
  }

  const rendered: Rendered = { canvas, anchor: { x: -minX + pad, y: -minY + pad } };
  cache.set(key, rendered);
  return rendered;
}

/**
 * Overlays what someone is actually holding and wearing onto their outfit, so
 * the character on screen is the character in the equipment window. A slot with
 * no visible layer — rings, earrings, shields — leaves the outfit alone.
 */
export function withGear(look: Look, gear: Record<string, number | undefined>, iconOf: (id: number) => string): Look {
  const out: Look = { ...look };
  for (const [slot, id] of Object.entries(gear)) {
    if (typeof id !== 'number') continue;
    const layer = manifest.gearLooks[iconOf(id)];
    if (layer === undefined) continue;
    const target = GEAR_SLOT[slot];
    if (target) out[target] = layer;
  }
  return out;
}

/** §6.2 slots to the wardrobe slots the composer understands. */
const GEAR_SLOT: Record<string, 'weapon' | 'cap' | 'coat' | 'pants' | 'shoes' | 'glove' | 'cape' | undefined> = {
  weapon: 'weapon', helm: 'cap', body: 'coat', legs: 'pants',
  boots: 'shoes', gloves: 'glove', cape: 'cape',
};

/** A head-and-shoulders crop for the trade window's portrait boxes. §4.5 */
export function getPortrait(look: Look, expression: Expression = 'default'): Rendered {
  return getCharacterSprite(look, 'stand1', 0, expression);
}

/** Dev-only: what the composer decided to draw, and where. */
export function debugLayout(look: Look, pose: Pose = 'stand1', frame = 0) {
  return layout(look, pose, frame).map((p) => ({
    name: p.part.name ?? 'default', z: p.part.z, zi: p.z, x: p.x, y: p.y,
    loaded: !!images.get(spriteUrl(p.part))?.width, url: p.part.url,
  }));
}
