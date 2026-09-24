# Gearfall

A phone auto-battler about loot. Choose which monster to hunt, equip what it drops, then pit your build against other players' builds in short, fair duels.

This is prototype v0.1, built to the design manuscript in [docs/gearfall-design.md](docs/gearfall-design.md).

> The previous project in this repo (Lantern Row) is parked, unused, in [`backup/lantern-row/`](backup/lantern-row/).
> The shop, scrolls and gold are parked in [`backup/gearfall-shop-scrolls/`](backup/gearfall-shop-scrolls/).

## Play it

No build step. The game is plain ES modules, so it has to be served over HTTP:

```sh
npm start            # http://localhost:5173
# or: python3 -m http.server 5173
```

Open it at phone width (portrait). Add `?seed=123` to replay a run exactly.

```sh
npm test                      # combat, full-run, save and ghost tests
node tools/balance.mjs 300    # bot runs: win rates per tier and duel, Crown rate
```

## What's in

| | |
|---|---|
| **The run** | 5 days and 3 lives. Each day is two hunts and then a duel (15 rounds). Only a lost duel costs a life. Win the day-5 duel for a Crown. |
| **Days** | Mossy Meadow, Tidal Shore, Clockwork Ruins, Haunted Moor and Dragon Peak. Each day has its own 6 monsters (2 Easy, 2 Normal, 2 Elite), its own backdrop, and a title card when it starts. The HUD groups the 15 round pips by day. Later days roll fewer commons. |
| **Hunts** | One Easy, one Normal and one Elite mob to choose from each round. Each card shows HP, hit, trait, drop table and rarity odds. After a win you pick 1 of 3 random drops from its table. A loss just means no drop: hunts are for loot, and lives are lost only in duels. Easy monsters are a safety net: they are tuned so even a weak build wins about 80% of the time, but their drops stay mostly Common every day. The Rare and Epic gear (perks, relics) comes from Normal and Elite. |
| **Duels** | Blind before the fight, as in The Bazaar: the rival is a silhouette with a name and record. Once the fight starts, tap **BUILD** on their HP panel to pause and inspect their gear. After the fight, **Their build** sits next to Continue. A win adds to your record and gives no items, since gear only comes from hunts. The 15 hand-written ghosts are 3 per duel round, and some of the later ones carry relics. Hand-written rivals' gear rolls a few rounds behind the duel (1 + the day number), because players only gear up from hunts. |
| **Combat** | `simulate(a, b, seed)` in [src/sim.js](src/sim.js) is a pure function on fixed 50 ms ticks with seeded mulberry32. It covers all 6 weapon types and 13 statuses (including Shock, Hex and the relics' Gilded), evasion, crit damage, armour pierce, thorns, conditional damage (vs a status, execute, rage), detonations, every trigger, overtime and draws. The battle screen only replays its frames and events at 1×, 2× or Skip. |
| **Battle feel** | Fighters slide in under a FIGHT! callout. Each attack winds up, dashes in and strikes on the exact tick its damage lands. Every weapon and monster attacks its own way: sword and axe arcs, spear thrusts, magic bolts, slime hops, boar charges and golem slams. Hits bring flashes, knockback, sparks, screen shake on crits, popping damage numbers and status icons. A KO bursts the loser into pixels while the winner hops. The HP bars sit inside the arena. |
| **Odds** | Hunt cards show your chances against each monster with your current gear, in five bands from Deadly to Easy win. They come from practice fights on seeds the real fight never uses. Duels show no odds and no gear, so you can't solve a rival before fighting them. |
| **Your ghosts** | Entering a duel saves your build on this device. Later runs can match you against your past builds (half the time, when one exists for that round), alongside the hand-written rivals. |
| **Saving** | The run auto-saves on this device, and the title screen offers Continue. A fight's result is locked in before it plays, so reloading mid-battle can't undo a loss. The game also remembers your battle speed, best record and the tips you've seen. |
| **Phone layout** | Every screen fits one phone screen with no scrolling, down to 375×667. Each layout's flexible part (card list, hero stage, arena) takes the leftover height, sprites pick the largest whole-number scale that fits, and action buttons sit at the bottom within thumb reach. |
| **Desktop** | With a mouse, the game sits in a centred phone-shaped frame, and hovering any item (worn, in the bag, in a rival's build or in a monster's drop table) shows a stat card. |
| **Text** | Pixel fonts are kept for titles, names and battle pop-ups. Everything you read (stats, item lines, the log) uses Nunito at 12–15 px. |
| **Help** | A short popup the first time each screen appears, and no permanent tutorial text. The ≡ menu has How to play (every stat and status explained), Show intro popups again, and Abandon run. |
| **Readability** | Status chips have stack counts and draining timers. Damage numbers are colour-coded, and an attack-timer bar sits under each HP bar. After every fight a breakdown shows who dealt what, split into hits, crits, burn, poison, bleed and thorns. |
| **Builds** | 12 new monster families each bring a set and a status or mechanic: Reefguard thorns, Stormscale shock, Pearlescent shields, Mainspring speed, Corrosion armour-break, Overcharge, Ossuary crits, Witchmark hex, Umbral evasion, Dragonblood, Tempest and Prism. |
| **Perks** | Rare items have a 40% chance of a ✦ perk, and epics always have one plus a 25% chance of a second. Perks are niche payoffs such as +dmg vs Poisoned, a poison burst every 4th hit, shock on crit, execute, rage, an opening shield or a riposte on dodge. They lean towards the item's own status. |
| **Relics** | Every elite guards one rule-bending trinket, gold-rimmed on its card and never common. **Gilded Hourglass**: below 40% HP you turn to gold for 3s, untouchable and frozen, while your Poison and Burn deal double. **Plague Censer**: DoTs tick every 0.6s. **Ebb Shell**: shields never fade. **Echo Conch**: statuses land twice. **Overclock Core**: haste that costs HP. **Bottled Storm**: Shock never fades. **Bloodpact Chalice**: heals hurt the foe. **Cursed Mirror**: reflects statuses. **Phoenix Feather**: revive once. **Glass Heart**: +50% dealt, +25% taken. |
| **Gear** | Items come in 3 rarities with affixes. Wearing 2 pieces from one mob family unlocks its set bonus. There's a 6-slot bag; you can discard pieces to make room. The shop, scrolls and gold are parked in `backup/gearfall-shop-scrolls/`. |
| **Comparisons** | Every item sheet shows `DPS a → b ▲` and `EHP a → b ▼` against what you're wearing now. |

## Art

All art is data, as the manuscript specifies. Sprites are grids of palette letters, and they are drawn onto canvases at load time. [`tools/art-sheet.html`](tools/art-sheet.html) shows every sprite on one page.

The art goes beyond the manuscript's samples in these ways:

- **Equipped gear shows on the character.** The hero is a layered paper doll ([src/art/hero.js](src/art/hero.js)). The hat, top, gloves, shoes and weapon are each drawn on the body in the item's own colours. The weapon uses the item's icon art held in the hand, and it rotates into a swing pose when attacking.
- **Each run's hero is random.** A run starts with a girl or a boy, one of 8 hair styles (twintails, ponytail, bob, long, spiky, and others), and a random hair colour, skin tone and eye colour. **New look** on the title screen rerolls.
- **Sprites are bigger.** The hero is 32 px tall on a 48×44 canvas, and mobs are 32×32. Both are scaled only by whole numbers.
- **Outlines and shadows are automatic.** Layers composite with a 1 px contact shadow where they overlap, and the finished silhouette gets the `#1a1423` outline. Mobs are built from ellipses lit from the top-left in flat bands, with no gradients.
- **The palette is extended.** The manuscript's 20 colours are kept. Skin, hair and material ramps are added so pieces can be shaded in three steps.
- **Battles take place in scenes.** Day-1 families each have a backdrop (meadow, spore wood, dusk plains, snowfield, cave, volcano). Later days have a shore, clockwork ruins, a haunted moor and a sunset mountain peak, and duels are fought under a moonlit sky.
- **30 monsters.** Days 2–5 add 24 monsters ([src/art/mobs2.js](src/art/mobs2.js)): crabs, jellyfish, eels, a siren, clockwork knights, a tesla sentinel, bats, skeletons, a moor witch, harpies, a thunder roc, an elder drake and a prism colossus. Trinket and relic icons are painted the same way ([src/art/icons2.js](src/art/icons2.js)). [`tools/mob-sheet.html`](tools/mob-sheet.html) shows every monster.

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

Every monster's strength is tuned in `MOB_POWER` ([src/data.js](src/data.js)). [`tools/tune.mjs`](tools/tune.mjs) finds values so that a careful bot wins about 62% of Normal and 42% of Elite hunts on the matching day. Easy monsters are tuned so that a struggling bot (Easy hunts only, random drops) wins about 80%, which leaves careful players at 98–100%. [`tools/probe.mjs`](tools/probe.mjs) prints per-monster win rates.

Bot results over 150 runs of the 5-day run:

| Strategy | Crown rate |
|---|---|
| Careful player (the hardest tier it usually beats) | ~39% |
| Always Easy (safe, but mostly Common gear) | ~25% |
| Always Normal | ~6% |
| Always Elite | ~0% |

Duel win rates for careful play land between 45% and 85%, with the final duel near 45%. The bots score gear only by DPS × EHP, so they undervalue perks and relics. A player who builds around them does better.
