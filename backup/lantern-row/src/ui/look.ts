import { withGear } from '../assets/index';
import { item, type Slot } from '../core/items';
import type { Appearance } from '../core/appearance';

/** What a person looks like once you account for what they are carrying. */
export function dressed(look: Appearance, gear: Partial<Record<Slot, number>>): Appearance {
  return withGear(look, gear as Record<string, number | undefined>, (id) => item(id).iconKey) as Appearance;
}
