import itemData from '../../data/items.json';

export type Slot =
  | 'weapon' | 'helm' | 'shield' | 'body' | 'legs' | 'boots'
  | 'gloves' | 'cape' | 'earring' | 'pendant' | 'ring';

export const SLOTS: Slot[] = [
  'weapon', 'helm', 'shield', 'body', 'legs', 'boots',
  'gloves', 'cape', 'earring', 'pendant', 'ring',
];

export interface Proc {
  chance: number;
  status: 'slow' | 'freeze' | 'weaken' | 'burn' | 'poison';
  dur: number;
}

export interface Item {
  id: number;
  name: string;
  slot: Slot;
  /** The one true price. Fixed for the whole run — never scales with wealth. §6.4 */
  price: number;
  iconKey: string;
  mapleId: number | null;
  dmg?: [number, number];
  spd?: number;
  crit?: number;
  critDmg?: number;
  armour?: number;
  str?: number;
  spdPct?: number;
  spdPctVsSlowed?: number;
  minDmg?: number;
  proc?: Proc;
  onHitBurn?: number;
  burnBonusPerStack?: number;
  burnExtraStack?: number;
  burnNoDecay?: boolean;
  burnDouble?: boolean;
  healPerBurnStack?: number;
  slowToFreeze?: number;
  /** Passive and proc lines, shown verbatim in the tooltip. §9.2 */
  text: string[];
}

export const ITEMS: Item[] = (itemData.items as Item[]).slice();
const byId = new Map(ITEMS.map((i) => [i.id, i]));

export function item(id: number): Item {
  const it = byId.get(id);
  if (!it) throw new Error(`no item ${id}`);
  return it;
}

export function itemsInSlot(slot: Slot): Item[] {
  return ITEMS.filter((i) => i.slot === slot);
}

/** Items a trader at this level of the market would plausibly be holding. */
export function itemsNearValue(value: number, spread = 3): Item[] {
  return ITEMS.filter((i) => i.price >= value / spread && i.price <= value * spread);
}

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapon', helm: 'Hat', shield: 'Shield', body: 'Top', legs: 'Bottom',
  boots: 'Shoes', gloves: 'Gloves', cape: 'Cape', earring: 'Earrings',
  pendant: 'Pendant', ring: 'Ring',
};

/** Every stat line an item shows, in tooltip order. §9.2 — stat, then passive, then proc. */
export function statLines(it: Item): string[] {
  const out: string[] = [];
  if (it.dmg) out.push(`ATTACK  ${it.dmg[0]} - ${it.dmg[1]}`);
  if (it.spd !== undefined) out.push(`SPEED  ${it.spd.toFixed(2)} /s`);
  if (it.minDmg) out.push(`MIN DAMAGE  +${it.minDmg}`);
  if (it.armour) out.push(`ARMOUR  +${it.armour}`);
  if (it.str) out.push(`STR  +${it.str}`);
  if (it.crit) out.push(`CRIT RATE  +${it.crit}%`);
  if (it.critDmg) out.push(`CRIT DAMAGE  +${it.critDmg}%`);
  if (it.spdPct) out.push(`ATTACK SPEED  +${it.spdPct}%`);
  return out;
}
