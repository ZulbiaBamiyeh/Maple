# Gearfall

A phone auto-battler about loot. Choose which monster to hunt, equip what it drops, then pit your build against other players' builds in short, fair duels.

This is prototype v0.1, built to the design manuscript in [docs/gearfall-design.md](docs/gearfall-design.md).

> The previous project in this repo (Lantern Row) is parked, unused, in [`backup/lantern-row/`](backup/lantern-row/).

## Play it

No build step. The game is plain ES modules, so it has to be served over HTTP:

```sh
npm start            # http://localhost:5173
# or: python3 -m http.server 5173
```

Open it at phone width (portrait). Add `?seed=123` to replay a run exactly.

```sh
npm test                      # M1 combat acceptance tests
node tools/balance.mjs 300    # bot runs: win rates per tier and duel, Crown rate
```

## What's in

| | |
|---|---|
| **The run** | 9 rounds and 3 lives. Rounds 3, 6 and 9 are duels. Win the round 9 duel for a Crown. |
| **Hunts** | One Easy, one Normal and one Elite mob to choose from each round. Each card shows HP, hit, trait, drop table and rarity odds. After a win you pick 1 of 3 drops. A loss costs a life and pays 2 gold. |
| **Duels** | You see the opponent's full loadout and their DPS and EHP, then counter-equip from your 6-slot bag. The 9 hand-written ghosts are 3 per duel round. Duel loot comes from the ghost's gear, with rarity bumped up a tier. |
| **Combat** | `simulate(a, b, seed)` in [src/sim.js](src/sim.js) is a pure function on fixed 50 ms ticks with seeded mulberry32. It covers all 6 weapon types, all 10 statuses, every trinket trigger, overtime, and draws. The battle screen only replays its frames and events at 1×, 2× or Skip. |
| **Battle feel** | Fighters slide in under a FIGHT! callout. Each attack winds up, dashes in and strikes on the exact tick its damage lands. Every weapon and monster attacks its own way: sword and axe arcs, spear thrusts, magic bolts, slime hops, boar charges and golem slams. Hits bring flashes, knockback, sparks, screen shake on crits, popping damage numbers and status icons. A KO bursts the loser into pixels while the winner hops. The HP bars sit inside the arena. |
| **Readability** | Status chips have stack counts and draining timers. Damage numbers are colour-coded, and an attack-timer bar sits under each HP bar. After every fight a breakdown shows who dealt what, split into hits, crits, burn, poison, bleed and thorns. |
| **Gear** | 30 items: 7 weapons, 4 hats, 4 tops, 2 gloves, 2 shoes, and 10 trinkets. Items come in 3 rarities with affixes. Wearing 2 pieces from one mob family unlocks its set bonus. There are 3 scroll types, and every item has 3 upgrade slots. |
| **Comparisons** | Every item sheet shows `DPS a → b ▲` and `EHP a → b ▼` against what you're wearing now. |

## Art

All art is data, as the manuscript specifies. Sprites are grids of palette letters, and they are drawn onto canvases at load time. [`tools/art-sheet.html`](tools/art-sheet.html) shows every sprite on one page.

The art goes beyond the manuscript's samples in these ways:

- **Equipped gear shows on the character.** The hero is a layered paper doll ([src/art/hero.js](src/art/hero.js)). The hat, top, gloves, shoes and weapon are each drawn on the body in the item's own colours. The weapon uses the item's icon art held in the hand, and it rotates into a swing pose when attacking.
- **Each run's hero is random.** A run starts with a girl or a boy, one of 8 hair styles (twintails, ponytail, bob, long, spiky, and others), and a random hair colour, skin tone and eye colour. **New look** on the title screen rerolls.
- **Sprites are bigger.** The hero is 32 px tall on a 48×44 canvas, and mobs are 32×32. Both are scaled only by whole numbers.
- **Outlines and shadows are automatic.** Layers composite with a 1 px contact shadow where they overlap, and the finished silhouette gets the `#1a1423` outline. Mobs are built from ellipses lit from the top-left in flat bands, with no gradients.
- **The palette is extended.** The manuscript's 20 colours are kept. Skin, hair and material ramps are added so pieces can be shaded in three steps.
- **Battles take place in scenes.** Each mob family has its own pixel backdrop (meadow, spore wood, dusk plains, snowfield, cave, volcano), and duels are fought under a moonlit sky.

## Layout

```
index.html, styles.css
src/
  data.js      every item, trinket, status, mob, set and ghost
  sim.js       the combat simulation (pure)
  items.js     item rolls, build -> fighter, DPS/EHP, scrolls
  game.js      run state machine
  rng.js       seeded RNG + hash
  art/         palette, compositor, hero paper doll, icons, mobs, scenes, glyphs
  ui/          screens, battle playback, shared widgets
tests/         node --test acceptance tests
tools/         balance bot, art sheet, screenshot/flow scripts
```

## Balance

Bot results over 200 runs:

| Strategy | Crown rate |
|---|---|
| Always Easy | 13% |
| Easy early, then Normal, then Elite | ~34% |
| Careful player (the hardest tier it usually beats) | ~39% |

Duel win rates land between 45% and 75% depending on the round. Compared with the manuscript, Elite mobs are softer and ghost gear rolls 2 rounds behind the duel, because a real player's items dropped over earlier rounds.
