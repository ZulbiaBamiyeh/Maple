# Gearfall — Design Manuscript (Prototype v0.1)

A phone auto-battler about loot. You choose which monster to hunt, equip what it drops, then put your build up against other players' builds in quick, fair duels.

- Working title: Gearfall
- Platform: portrait, web first
- PvP: async (players fight saved snapshots of each other's builds)
- Target session: 8–12 minutes per run

---

## 1. Pitch & pillars

Gearfall borrows Super Auto Pets' structure: a short run, one choice per round, fights you watch rather than control, and opponents who are snapshots of other players. It swaps the animal team for a MapleStory-style equipment screen. Picking a monster is how you shop, because each monster shows its drop table. Choosing a fight means choosing what you're hunting.

**Pillars**
- **You chose every piece.** Everything you wear came from a fight you picked. There are no gacha pulls and no random shop rerolls.
- **Duels are fair.** Gear resets every run, so at round 6 everyone has had 6 drops. Spending money can never buy stats.
- **Readable in 10 seconds.** A fight lasts 10–20 seconds. Attack-timer bars and status icons show why you won or lost.

---

## 2. Prototype scope

The prototype has one job: find out whether *picking a mob, looting it and tuning your gear* is fun on a phone.

| In | Out (later) |
|---|---|
| One 9-round run, 3 lives | Accounts, saving between sessions |
| 6 mobs across 3 tiers | Real matchmaking server |
| 6 weapon types, 4 armor slots, 2 trinket slots | Legendary items, full 3-piece sets |
| ~30 items, 10 trinkets, 10 status effects | Sound and music |
| Scroll upgrades (3 success rates) | Cosmetics and store |
| 3 duels against 9 hand-written ghost builds | Leaderboards, seasons |

---

## 3. The run

The run is 9 rounds. Every third round is a duel against another player's build. Any loss costs 1 of your 3 lives. Win the round 9 duel to earn a **Crown**.

| Round | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| Type | Hunt | Hunt | **Duel** | Hunt | Hunt | **Duel** | Hunt | Hunt | **Duel** |

### Hunt round
Pick 1 of 3 mobs → auto-fight → pick 1 of 3 drops → equip, scroll or scrap.

- **Mob cards** show the sprite, tier, HP, attack, signature status effect and a row of possible drops. One card comes from each tier: Easy, Normal and Elite.
- **Tier is the risk dial.** Elite mobs drop Rare and Epic items much more often. Losing to one still costs a life.
- **Loot.** After a win, pick 1 of 3 items rolled from that mob's drop table. Items you don't equip go to a **6-slot bag**. You can **scrap** items for gold, and gold buys scrolls.
- **Losing** a hunt costs a life and gives 2 gold as consolation. You get no drop.

### Duel round
See the opponent's gear → swap items from your bag → duel → pick 1 of 3 drops, with rarity bumped up one tier.

You see the opponent's full loadout before the fight and can swap in items from your bag. This is the **counter-equip** moment, and it's the reason the bag exists. Carrying a poison dagger for tank opponents, or a shield trinket for burst builds, is a real decision.

---

## 4. Stats & combat math

| Stat | Base | What it does |
|---|---|---|
| HP | 120 | Health. At 0 you lose. |
| Atk | 0 | Flat damage added to every weapon hit. |
| Def | 0 | Flat reduction to every physical hit, down to a minimum of 1. Status damage ignores it. |
| Crit | 5% | Chance to hit for 150%. |
| Haste | 0% | Shortens the attack interval: `interval ÷ (1 + haste)`. |
| Lifesteal | 0% | Heals you for a share of the damage you deal. |
| Resist | 0% | Shortens harmful statuses on you. Capped at 50%. |

```
hit      = rand(weapon.min, weapon.max) + Atk
hit      = crit ? hit × 1.5 : hit
taken    = max(1, hit − targetDef)        // magic: ignores half of Def
shield absorbs first, then HP
```

### Headline numbers on the equip screen
```
DPS = (avgHit + Atk) × (1 + crit × 0.5) ÷ interval
EHP = HP × (1 + Def ÷ 15)           // rule of thumb; tune in playtests
```

> **Why flat Def matters:** it creates natural counters. Fast, weak hits (daggers) lose a lot of damage against high Def, but they're the best way to stack statuses. Slow, heavy hits (axes, maces) punch through armor. Status damage ignores Def completely. Every build has a counter, which is what makes counter-equipping worth doing.

---

## 5. Weapons

These are Common rolls at round 1. Stats scale up with the round (see §8).

| Weapon | Damage | Interval | ≈DPS | Signature |
|---|---|---|---|---|
| Dagger | 6–9 | 0.6s | 12.5 | Quick: chances to apply statuses on hit ×1.5 |
| Sword | 10–15 | 1.0s | 12.5 | +8% Crit |
| Spear | 11–17 | 1.1s | 12.7 | Reach: first swing at 0.2s |
| Mace | 18–26 | 1.5s | 14.7 | 15% chance to Stun for 0.8s |
| Axe | 24–36 | 1.9s | 15.8 | 25% chance to Bleed |
| Staff | 8–12 | 1.2s | 8.3 | Magic (ignores half of Def), 20% chance to Burn |

---

## 6. Status effects

Each status shows as a chip under the HP bar, with a stack count and a draining timer.

| Status | Effect | Stacking rule |
|---|---|---|
| Burn | 3 damage/s for 3s. Ignores Def. | Reapplying refreshes it and adds +1 damage/s (max 6/s). |
| Poison | 1 damage/s per stack for 5s. Ignores Def. | Up to 10 stacks. A new stack refreshes the timer. |
| Bleed | Target takes 5 damage each time it attacks, for its next 3 attacks. | Reapplying resets it to 3 attacks. |
| Stun | Pauses the attack timer. | The target can't be stunned again for 2s after a stun ends (no stun-lock). |
| Chill | −10% attack speed per stack for 4s. | The 3rd stack becomes **Freeze**: no attacks for 1.2s, then Chill clears. |
| Weaken | Target deals −25% damage for 3s. | Refreshes; doesn't stack. |
| Sunder | −3 Def for 4s (never below 0). | Up to 2 stacks. |
| Shield | Absorbs damage before HP. | Shield amounts add up. Expires after 6s. |
| Regen | Heals X per second. | Sources add up. |
| Frenzy | +30% attack speed. | Reapplying refreshes the duration. |

Resist shortens every harmful status (Burn, Poison, Stun, Chill, Weaken, Sunder), capped at 50%.

---

## 7. Armor & trinkets

### Armor (4 slots)
- **Hat:** HP and Def
- **Top:** the most HP and Def
- **Gloves:** Atk or Crit
- **Shoes:** Haste or Resist

Common round 1 examples: Hat +15 HP +1 Def · Top +25 HP +2 Def · Gloves +2 Atk · Shoes +8% Haste.

### Trinkets (2 slots)
A trinket is a **trigger** plus an **effect**. Adding one is a single data entry.

| Trinket | Trigger | Effect |
|---|---|---|
| Ember Charm | onHit 15% | Apply Burn |
| Viper Fang | onHit 30% | Apply 1 Poison |
| Metronome | every 3rd hit | Stun 0.5s |
| Last Stand Locket | HP < 40%, once | Gain 30 Shield |
| Vampire Tooth | passive | +6% Lifesteal |
| Frost Bell | battle start | Apply 2 Chill |
| Hourglass | battle start | Frenzy for 5s |
| Thorn Ring | onHitTaken | Deal 3 damage back |
| Whetstone | onCrit | Apply Sunder |
| Lucky Clover | passive + onCrit | +8% Crit; crits heal 4 |

Triggers to support: `battleStart`, `onHit`, `onCrit`, `onHitTaken`, `everyNthHit`, `hpBelow`, `everySeconds`, `passive`.

---

## 8. Mobs, drops & sets

Every mob belongs to a family. Wearing 2 pieces from the same family unlocks a set bonus.

| Mob | Tier | HP · Hit · Interval | Trait | Drops | 2-piece bonus |
|---|---|---|---|---|---|
| Green Slime | Easy | 60 · 4–6 · 1.0s | Regen 2/s | Sword, Gel Gloves, Slime Cap, Lucky Clover | Regen 2/s |
| Spore Cap | Easy | 55 · 3–5 · 0.9s | 25% Poison | Dagger, Spore Hood, Spore Boots, Viper Fang | Poison max stacks +5 |
| Tusk Boar | Normal | 110 · 10–14 · 1.4s | 25% Bleed | Axe, Hide Vest, Tusk Gloves, Thorn Ring | Bleed deals +3 |
| Frost Wisp | Normal | 80 · 6–9 · 1.0s (magic) | 30% Chill | Spear, Frost Staff, Wisp Hood, Frost Bell | Freeze at 2 Chill stacks |
| Stone Golem | Elite | 220 · 20–28 · 2.0s, Def 5 | 15% Stun | Mace, Golem Plate, Golem Helm, Last Stand Locket, Metronome | +3 Def; Stun +0.3s |
| Cinder Imp | Elite | 130 · 8–12 · 0.7s | 20% Burn | Staff, Imp Robe, Cinder Boots, Ember Charm, Hourglass, Whetstone | Burn ticks can crit |

**Scaling:** multiply mob stats and item rolls by `1 + 0.12 × (round − 1)`. Mobs and ghosts use the same curve.

---

## 9. Rarity & scrolls

| Rarity | Extra affixes | Easy | Normal | Elite | Scrap value |
|---|---|---|---|---|---|
| Common | 0 | 80% | 55% | 30% | 1g |
| Rare | 1 | 18% | 38% | 50% | 3g |
| Epic | 2 | 2% | 7% | 20% | 6g |

Affix pool: +Atk, +HP, +Crit, +Haste, +Resist, or +5% chance on hit to apply the item family's status. Rarity is shown by the frame colour.

### Scrolls
Each item has **3 upgrade slots**. A scroll uses up a slot whether it succeeds or fails.

| Scroll | Success | On success | Cost |
|---|---|---|---|
| Sure Scroll | 100% | +1 main stat | 2g |
| Chancy Scroll | 60% | +3 | 3g |
| Long-shot Scroll | 10% | +8, and the item glows | 4g |

Upgrades show as `+2` in the item's corner.

---

## 10. Duels (async PvP)

- **Ghosts.** When you enter a duel round, your loadout is saved as a ghost: 7 equipped items plus 6 bag items, with their rolls and upgrades, about 1 KB of JSON.
- **Matching.** You fight a random ghost from the same round with a similar record.
- **Ghosts don't counter-equip.** A ghost fights with whatever it had equipped. Only the live player gets to swap.
- **Prototype.** No server. Ship 9 hand-written ghosts, 3 per duel round, each a clear archetype: poison dagger, mace tank, burn staff, crit sword, bleed axe, chill spear, and so on.
- **Later.** A hosted database (e.g. Supabase) with a `ghosts(round, record, build_json)` table. The server re-runs submitted fights to catch cheating.

---

## 11. Combat simulation

The fight is one pure function: `simulate(buildA, buildB, seed) → events[]`. The battle screen only replays the event list.

1. **Fixed 50 ms tick.** Each fighter's attack timer starts at its weapon interval (0.2s for spears).
2. **When a timer hits 0:** roll damage and crit, apply to Shield then HP, apply lifesteal, fire onHit/onCrit triggers, roll status chances, reset the timer.
3. **Statuses tick every 1s** from when they're applied.
4. **Order within a tick:** the player resolves first, then the opponent. If both hit 0 HP in the same tick, it's a draw and no life is lost.
5. **Overtime:** from 20s, both fighters take +25% damage, stacking every 5s. At 60s, the fighter with the higher HP% wins.
6. **RNG:** seeded mulberry32 with `seed = hash(runSeed, round)`. The same builds and the same seed always give the same fight.
7. **Playback:** 1×, 2×, Skip.

---

## 12. Phone UI

All screens are portrait, one-thumb, and tap-only.

- **No drag-and-drop.** Tapping an item opens a bottom sheet with details, a comparison and an Equip button.
- **Show a comparison everywhere,** e.g. `DPS 12.5 → 15.8 ▲  EHP 180 → 164 ▼`. This is the most important piece of UI.
- **Primary actions go in the bottom third.** The top area is read-only: lives, round, gold.
- **Tap targets are at least 44 px.** Item icons are 16×16, shown at 2× or 3×.

### Screens
- **Mob pick:** header (lives · round · gold), "Choose your hunt", then 3 stacked mob cards (sprite, name, tier chip, HP · Hit · trait, drop icons). Bottom row: Gear / Bag / Scrolls.
- **Battle:** the arena fills the top ~45% with two fighters. Each fighter has status chips above, an HP bar, and an attack-timer bar underneath. Damage numbers float up (orange with "!" for crits). A short combat log sits below. Bottom row: 1× / 2× / Skip.
- **Equip:** 3 slots on each side of the hero (hat, top, weapon | gloves, trinket, trinket). Below the hero: a DPS/EHP readout, then a 6-slot bag. Tapping an item opens a bottom sheet with its name (in rarity colour), the stat comparison, and Scrap / Equip buttons.
- **Duel preview:** the opponent's name, record and all equipped slots. Your bag stays open so you can swap before pressing Fight.

---

## 13. Art direction

**Sprites are written as data.** Each sprite is a grid of letters, and each letter maps to one colour in a shared palette. The game draws the grids onto a canvas at load time, so the art lives in the code and always stays on-palette.

### Palette (20 colours, no exceptions)
| Key | Hex | Use |
|---|---|---|
| o | #1a1423 | outline |
| k | #3b2d4a | dark shade |
| g | #6b6a80 | grey |
| s | #aeb4c8 | steel |
| w | #f4f1ff | highlight |
| b | #7a4a2c | wood / leather |
| B | #b0763f | light wood |
| y | #f2c14e | gold |
| Y | #b8862b | dark gold |
| r | #d9434f | red |
| R | #8f2437 | dark red |
| f | #f58a3a | fire orange |
| e | #6cc24a | green |
| E | #3d7f37 | dark green |
| c | #7fd8e8 | ice |
| C | #3a78c9 | blue |
| p | #9a5cc6 | purple |
| P | #5b347d | dark purple |
| m | #f1d9b5 | skin / cream |
| n | #f28bb0 | pink |

### Rules
- **Sizes.** Items and trinkets are 16×16. Mobs and the hero are 16×16 in the prototype, with mobs moving to 32×32 later. Only scale by whole numbers, with `image-rendering: pixelated`.
- **Style.** A 1 px outline (`#1a1423`) on everything, light from the top-left, no anti-aliasing, no gradients.
- **Animation in code:** a 1 px idle bob, a white flash on hit, a lunge when attacking, a dissolve on death.
- **Rarity is shown by the frame, not the sprite.** Epic frames get a slow shimmer.
- **Statuses as overlays:** Burn is an orange flicker, Poison green bubbles, Chill a blue tint, Stun a spinning star.
- **Damage numbers:** chunky pixel digits that stack upward. White for normal hits, orange with "!" for crits, purple for magic, green for heals.
- **Hero:** one base body with the weapon drawn in hand. Armor only appears as slot icons.
- **Size trade-off:** 16×16 is 256 pixels and 64×64 is 4,096. Stick to 16–32 px and let crisp scaling give the high-res feel.

### Sample sprites (16×16, `.` = transparent)
```js
const SPRITES = {
 sword:["..............o.",".............oso","............oswo","...........oswo.","..........oswo..",".........oswo...","........oswo....","..oo...oswo.....","..oyo.oswo......","...oyoswo.......","....oyoo........","...obooyo.......","..obo..oyo......",".obo....oo......","ooo.............","................"],
 axe:["......oo........",".....obbo.ooo...",".....obbooswso..",".....obboswwsso.",".....obbosswsso.",".....obbossssso.",".....obboossso..",".....obbo.ooo...",".....obbo.......",".....obbo.......",".....oBbo.......",".....obbo.......",".....obbo.......",".....oyyo.......",".....obbo.......","......oo........"],
 staff:["......oooo......",".....occcCo.....","....ocwccCCo....","....occcCCCo....",".....oCCCCo.....","......oyyo......",".....oyYYyo.....","......obbo......","......oBbo......","......obbo......","......obbo......","......oBbo......","......obbo......","......obbo......","......oYYo......",".......oo......."],
 charm:["...oo......oo...","..oyo......oyo..","..oyo......oyo..","...oyo....oyo...","....oyo..oyo....",".....oyooyo.....","......oyyo......",".....oyYYyo.....","....oyrffryo....","...oyrfwffryo...","...oyrfffrryo...","...oyRrrrrRyo...","....oyRrrRyo....",".....oyRRyo.....","......oyyo......",".......oo......."],
 helm:["................","................",".....oooooo.....","....oswwsssoo...","...oswssssssko..","...osssssssskko.","..oyyyyyyyyyyyo.","..oYYYYYYYYYYYo.","..osso.....osso.","..osso.....osso.","..oko.......oko.","...o.........o..","................","................","................","................"],
 slime:["................","................","................","................","......oooo......","....ooeeeeoo....","...oeewweeeeo...","..oeewweeeeeeo..","..oeeeeeeeeeeo..",".oeeeokeeokeeeo.",".oeeeokeeokeeeo.",".oeeeeeeeeeeeeo.",".oEeeeenneeeeEo.",".oEEeeeeeeeeEEo.","..ooEEEEEEEEoo..","....oooooooo...."],
 shroom:["................",".....oooooo.....","...oorrrrrroo...","..orrwwrrrrrro..",".orrwwrrrwwrrro.",".orrrrrrrwwrrro.",".oRRrrrrrrrrRRo.","..ooRRRRRRRRoo..","....ommmmmmo....","....omkmmkmo....","....ommmmmmo....","....omnmmnmo....","....ommmmmmo....","...oommmmmmoo...","...obbo..obbo...","...oooo..oooo..."],
 imp:["..o..........o..",".oRo........oRo.",".oRRo.oooo.oRRo.","..oRRorrrroRRo..","...orrrrrrrro...","..orryorryorro..","..orrrrrrrrrro..","..orrroooorrro..","...orrrrrrrro...","....oRRRRRRo....","...orRrrrrRro..f","..orRo.rr.oRro.f","..oro..rr..oro.o","......orro......",".....oRooRo.....",".....oo..oo....."],
 knight:["................",".....oooooo.....","....osssssso....","....osoooooso...","....osokkkoso...","....osssssssso..","....ooooooooo...","...oCCCyCCCo....","..oCCCCyCCCCo...","..oCoCCCCCoCo...","..omo.CCC.omo...","..oo.oCCCo.oo...",".....okkko......","....okoooko.....","....oko.oko.....","....ooo.ooo....."],
 rogue:["................",".....oooooo.....","....oPPPPPPo....","...oPPPPPPPPo...","...oPmmmmmmPo...","...oPmkmmkmPo...","....oommmmoo....","....oPPPPPPo....","...oPPPEPPPPo...","..ooPPPEPPPPoso.","..omoPPPPPPomsw.","..oo.oPPPPo.oo..",".....okkko......","....okoooko.....","....oko.oko.....","....ooo.ooo....."]
};
// draw: for each row y, for each x in 0..15, if PALETTE[row[x]] fill a 1×1 rect.
```

---

## 14. Data formats

```jsonc
// item
{ "id": "tusk_axe", "slot": "weapon", "type": "axe", "family": "boar",
  "sprite": "axe", "min": 24, "max": 36, "interval": 1.9,
  "onHit": [{ "chance": 0.25, "apply": "bleed" }] }

// rolled instance (what's actually in your bag)
{ "item": "tusk_axe", "rarity": "epic", "round": 5, "scale": 1.48,
  "affixes": [{ "stat": "crit", "value": 0.06 }, { "stat": "hp", "value": 20 }],
  "upgrades": { "used": 2, "bonus": 4 } }

// trinket
{ "id": "metronome", "slot": "trinket", "sprite": "metronome",
  "trigger": { "type": "everyNthHit", "n": 3 },
  "effect": { "apply": "stun", "duration": 0.5, "target": "enemy" } }

// status
{ "id": "chill", "harmful": true, "duration": 4, "maxStacks": 3,
  "mods": { "hastePerStack": -0.10 },
  "atMaxStacks": { "apply": "freeze", "duration": 1.2, "clearSelf": true } }

// mob
{ "id": "tusk_boar", "tier": "normal", "family": "boar", "sprite": "boar",
  "hp": 110, "min": 10, "max": 14, "interval": 1.4, "def": 0,
  "onHit": [{ "chance": 0.25, "apply": "bleed" }],
  "drops": ["tusk_axe", "hide_vest", "tusk_gloves", "thorn_ring"] }

// sprite
{ "id": "slime", "w": 16, "h": 16, "rows": ["......oooo......", "..."] }
```

---

## 15. Build order

Each milestone is playable on its own. Don't start the next one until the current one's "done when" is true.

- **M1: Combat simulation, no visuals.** `simulate()` with two hard-coded builds, all weapons and all 10 statuses. Print the event log.
  *Done when:* the same seed always produces the same fight, and a poison dagger beats a build with no Def but loses to a tank with Def 8 and Resist.
- **M2: Battle screen.** Sprites, HP and timer bars, damage numbers, status chips, 1×/2×/Skip.
  *Done when:* someone watching can tell you why the fight was won.
- **M3: Items and equip screen.** Slots, bag, bottom sheet, DPS/EHP readouts with comparisons.
  *Done when:* swapping an item updates both headline numbers instantly and correctly.
- **M4: The run.** Mob pick → fight → loot → 9 rounds, lives, gold, scrap.
  *Done when:* a full run takes 8–12 minutes and you want to start another.
- **M5: Duels.** Ghost preview, counter-equip from the bag, 9 hand-written ghosts, a Crown for winning round 9.
  *Done when:* you've changed your gear after seeing an opponent at least once and felt clever about it.
- **M6: Depth and polish.** Set bonuses, scrolls, rarity affixes, screen shake, a balance pass.
  *Done when:* two runs in a row end with noticeably different builds.

---

## 16. Open questions

- **Flat Def or percentage Def?** Flat is easier to read and creates counters, but it may crush daggers. Test daggers against Def 4–8 first.
- **Bag size.** 6 slots forces choices, but may feel stingy. Try 4 and 8.
- **Show the opponent before a duel?** Seeing their gear drives counter-equipping, but duels could turn into pure rock-paper-scissors. The alternative is to reveal only their weapon.
- **Loot on a loss?** Currently 2 gold and no drop. A "take the worst of 3" option might feel kinder.
- **Run length.** 9 rounds with 3 duels is a prototype number. The real game probably wants 12 rounds with 4 duels.

---

*Gearfall is a working title. All mobs, items and names are original. Borrow MapleStory's systems and feel, not its assets or names.*
