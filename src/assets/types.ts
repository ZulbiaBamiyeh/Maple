/** Everything the rest of the game is allowed to know about a sprite. */
export interface Part {
  origin: { x: number; y: number };
  maps?: Record<string, { x: number; y: number }>;
  z: string;
  url: string;
  w: number;
  h: number;
  name?: string;
}

export interface Equip {
  islot: string;
  vslot: string;
  name: string;
  poses: Record<string, Part[]>;
  expressions?: Record<string, Part[]>;
}

export interface Manifest {
  generated: string;
  order: Record<string, number>;
  slotOf: Record<string, string | null>;
  frames: Record<string, { f: number; d: number }[]>;
  skins: Record<string, Record<string, Part[]>>;
  equips: Record<string, Equip>;
  pool: Record<PoolGroup, number[]>;
  icons: Record<string, { file: string; source: string; mapleId: number | null }>;
  /** iconKey -> the sprite layer worn when that item is equipped. */
  gearLooks: Record<string, number>;
  /** Every sprite the wardrobe can reach, as a data URI. */
  sprites: Record<string, string>;
}

export type PoolGroup =
  | 'hair' | 'face' | 'cap' | 'coat' | 'pants' | 'shoes' | 'glove' | 'cape' | 'weapon' | 'gear';

/** A character's full appearance. §4.4 */
export interface Look {
  skin: string;
  face: number;
  hair: number;
  cap?: number;
  coat?: number;
  pants?: number;
  shoes?: number;
  glove?: number;
  cape?: number;
  weapon?: number;
}

export type Pose =
  | 'stand1' | 'walk1' | 'alert' | 'swingO1' | 'sit' | 'jump' | 'ladder' | 'dead';

export type Expression =
  | 'default' | 'blink' | 'smile' | 'troubled' | 'angry' | 'cry' | 'hit' | 'despair' | 'love';
