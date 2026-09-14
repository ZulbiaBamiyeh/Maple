import { withGear } from '../assets/index';
import { item, type Slot } from '../core/items';
import type { Appearance } from '../core/appearance';

/** What a person looks like once you account for what they are carrying. */
export function dressed(look: Appearance, gear: Partial<Record<Slot, number>>): Appearance {
  return withGear(look, gear as Record<string, number | undefined>, (id) => item(id).iconKey) as Appearance;
}

/** A hawker visibly holds the thing they are selling. It is a tell. §4.4 */
export function holding(look: Appearance, itemId: number | undefined): Appearance {
  if (itemId === undefined) return look;
  const it = item(itemId);
  return dressed(look, { [it.slot]: it.id } as Partial<Record<Slot, number>>);
}
