# Where this build departs from the spec, and why

Four deviations. Everything else follows the document.

## 1. Assets come from GitHub mirrors, not maplestory.io

maplestory.io is refused by the build environment's egress policy. The same
extracted client data is vendored from two community repositories instead. See
[ASSET-NOTICE.md](ASSET-NOTICE.md). The module boundary §4.3 asks for is intact,
so swapping the source back is a one-file change.

`getCharacterSprite` returns a composed `<canvas>` rather than a path. A
MapleStory character is not one image — it is a dozen layers hung off named
attachment points — so the asset module owns the composition and caches the
result per look, pose and frame. Nothing outside `src/assets` sees a sprite.

## 2. Armour reduces damage proportionally instead of subtracting

§9.1 gives `damage = roll(min..max) + STR − enemyArmour`. With the §6.2 table
that makes half the weapons literally unusable: a Maple Sword rolls 9–14, and a
build wearing a Sauna Robe and Facestompers carries 26 armour, so every swing
lands for the 1-point floor. Flat subtraction turns armour into an on/off switch
and deletes the low-damage, high-proc weapons the interesting builds are made of.

Armour now halves incoming damage at 26 points and tapers from there:

```
damage = round(raw × (1 − armour / (armour + 26)))
```

Same intent, no cliff.

## 3. Stacking statuses cap at ten

Nothing in §9 bounds Burn. With the Maple Cape stopping decay, stacks grow
linearly and burn damage therefore grows with the *square* of the clock; by
second fifteen no build in the table can answer it, which contradicts §9.7's
requirement that every build have a counter. Stacks cap at ten.

## 4. Two items gained a mechanic so that §9.7's counters exist

§9.3 lists eight statuses. §6.2's thirty items grant three of them — Burn, Slow,
Freeze. So the reference builds as written could not be assembled: "frost lock is
countered by thorns" and "burn is countered by fast early healing" both name
effects no item provides.

Rather than add items — §6.2 is emphatic about the shape of the table, and §6.1
says the mechanics are ours — three existing items gained one line each:

| Item | Was | Now also |
|---|---|---|
| Wooden Shield | +5 armour | Thorns 4 |
| Maple Shield | +9 armour, Slow→Freeze | Thorns 10 |
| Sauna Robe | +14 armour, +3 STR | Regen 3/s |
| Pink Adventurer Cape | +2 armour, +5% spd | Regen 1/s |

Names, slots and prices are untouched. With these, the three archetypes form the
cycle the spec asks for, and `tests/combat.test.mjs` asserts it holds:

```
burn  >  thorns  >  frost  >  burn
 68%      69%        97%
```

— burn ignores armour and eats the thorns build; thorns do not care how fast you
swing, so they beat the frost lock; and the frost build's Sauna Robe out-heals a
burn's early ramp. Average fight: 12.5 seconds.

## Tuning constants

`BASE_HP = 190`, `ARMOUR_K = 26`, `MAX_STACKS = 10`, `TIMEOUT = 20`. All live at
the top of `src/core/combat.ts`.
