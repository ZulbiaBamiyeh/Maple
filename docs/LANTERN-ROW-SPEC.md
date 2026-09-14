# LANTERN ROW — Implementation Specification
### v1.0 · for an implementing agent

> **Read this section first.** This document is a build order, not an essay. Sections 1–3 are context. Sections 4–13 are specifications with concrete numbers. Section 14 is the milestone list with acceptance criteria — work through it in order, and do not start a milestone before the previous one passes its criteria.
>
> Two hard rules that are easy to violate by accident:
> 1. **Item prices never scale with player wealth.** The price table in §6 is fixed for the whole run.
> 2. **Never print explanatory text in the negotiation chat.** No "they caved", no "you overpaid". The player reads tone and watches numbers. This is a design pillar, not a preference.

---

## 1. The game in one paragraph

You are a merchant in the Free Market of a 2000s-era 2D MMO. You have twelve days and fifty thousand mesos, and you need ten million. You get there by buying gear cheap from people who don't know what they have, selling it dear to people who need it, and — when trading alone isn't fast enough — by wagering your bankroll on an automated fight and letting your equipment do the arguing.

The game you play is a conversation. The combat is what the conversation was about.

## 2. Pillars

**Acquisition is the game.** Most auto-battlers treat the shop as a menu. Here, every item has a person attached to it. You didn't roll a Maple Sword out of a pool — you got it off a trader called `xXDarkLordXx` by telling him your Fruit Knife was worth 130k, and he believed you.

**Information is the scarce resource, not gold.** You don't know what things are worth. You don't know what the person opposite knows. Every system is a way of buying, selling, or faking information.

**Combat is leveraged trading.** Fights have no intrinsic score. They have stakes, agreed beforehand, in a window that works like the trade window.

**The player figures it out.** No tutorials, no tooltips explaining mechanics, no post-hoc narration. The only explicit feedback is the end-of-day ledger (§10), which shows facts, not lessons.

## 3. Platform and port target

Alpha is **web, single page, TypeScript**, no framework required. It exists to test feel.

Final target is **MapleStory Worlds** (Lua). Therefore:

- All simulation logic lives in pure functions with no DOM or canvas references. `negotiate/`, `combat/`, `economy/` must be importable and testable in isolation with zero rendering dependencies.
- All asset access goes through one module (§4.3). Porting should mean rewriting the shell and the asset module, never the brain.
- No LLM, no network calls at runtime. Everything is local and deterministic given a seed.

**Seeded RNG throughout.** One seed per run, derived sub-seeds per day. You must be able to replay a run exactly from its seed for debugging and for the rival-ghost feature.

---

## 4. Assets

### 4.1 Source

Sprites come from the **maplestory.io** API — the community-maintained asset endpoint that powers maples.im (the MapleStory Simulator) and spritefan2.com. It serves character renders, item icons, NPC sprites and mob sprites by ID.

Useful references for the agent to consult before writing the asset layer:
- `https://maplestory.io` — the API itself, and its docs
- `https://maples.im` — character simulator, good for checking how equip layering composes
- `https://spritefan2.com` — exports sprite sheets for NPCs, mobs and pets from the same API

**Verify endpoint shapes against the live API before building.** Do not assume URL formats from this document. Write a small spike that fetches one character render and one item icon, confirm the response, then build the module.

### 4.2 Caching is mandatory

The API is community-run. It will rate-limit, and it will be down at an inconvenient moment.

- Fetch every asset **once**, at build time, via a script in `tools/fetch-assets.ts`.
- Commit the results to `public/assets/`.
- The game makes **zero network requests at runtime**.
- The fetch script is idempotent and logs any ID it failed to resolve.

### 4.3 The asset module

Everything goes through `src/assets/index.ts`:

```ts
getItemIcon(itemId: number): string          // path to icon png
getCharacterSprite(look: Look, pose: Pose): string
getNpcSprite(npcId: number, pose: Pose): string
getUiChrome(name: string): string
```

Nothing outside this module may reference a sprite path or an asset URL. This is what makes the Worlds port a one-file rewrite.

### 4.4 NPC appearance

**This matters more than it sounds.** The Free Market's character was that it was full of *players*, all dressed differently, most of them badly. Four identical vendors kills the whole feeling.

Generate each NPC procedurally from a curated pool:

| Layer | Pool size | Notes |
|---|---|---|
| Skin | 4–5 | the classic skin tones |
| Face | 8–10 | vary expression |
| Hair | 12–16 | vary colour too — include the loud ones |
| Hat | 10 + none | bandanas, bamboo hats, the occasional Zakum Helmet |
| Top / Overall | 14 | mix of starter rags and expensive overalls |
| Bottom | 8 | skipped when an overall is used |
| Shoes | 8 | |
| Weapon | 10 + none | visible in hand, and it's a **tell** — see below |
| Cape | 6 + none | rare, reads as wealth |

Rules that make the crowd feel right:

- **Most NPCs look poor.** Roughly 70% draw only from the cheap end of each pool. A well-dressed NPC should be notable.
- **Appearance correlates loosely with wealth, and lies.** An NPC's `wealthTier` biases their outfit pool, but with ~20% noise. A scruffy trader occasionally has a million mesos. This is deliberate — it's the same read-the-person problem as everything else.
- **Weapon in hand is a signal.** A hawker visibly holding an Ilbi Throwing Star is probably not a pushover. Let the player learn this.
- **Sitting, standing, and the chair pose.** Some NPCs sit (the classic AFK-in-FM look), some stand. Purely cosmetic, entirely necessary.
- Two NPCs on screen at once must never share a full look. Check before spawning.

### 4.5 UI chrome

Replicate the classic window frames: the dark blue-grey gradient body, the 1px near-black border, the title bar with the small caps label and the ✕, the light grey inner panels, the 4×4 item grids with their thin borders.

The trade window in particular should be recognisable to anyone who used the old one. Two portrait boxes with name plates, two item grids, two meso rows with the coin icon, a white chat log with `[14:59]` timestamps, and the two large bottom buttons (green left, blue right). When a side accepts it goes green, its contents fade, and a white-ringed tick appears in the corner.

### 4.6 Fonts

A pixel face for numbers, labels and chat handles (Silkscreen or similar). A clean sans for body copy in panels. Damage numbers are drawn as individual glyphs — see §8.6.

---

## 5. The map

A wide indoor hall modelled on the **Free Market Entrance**: bunting overhead, warm lantern light, brick, and a row of numbered pitches along an upper walkway where the portals used to be.

```
┌──────────────────────────────────────────────────────────────┐
│  ~~~~~~ bunting ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  │
│                                                              │
│      [FM 1]        [FM 2]        [FM 3]          ╔══╗        │
│     ┌──────┐      ┌──────┐      ┌──────┐   (🎯)  ║HOME║      │
│  ▓  │ stall│      │ stall│      │ stall│         ╚══╝        │
│  ▓  └──────┘      └──────┘      └──────┘                     │
│  ▓ ═══════════ UPPER WALKWAY ══════════════════════════════  │
│  ▓                                                           │
│  ▓  ░░░ brick ░░░░░░  🔥  ░░░░░░░░░░  🔥  ░░░░░░░░░░░░░░░░    │
│  ▓                                                           │
│  ▓   ⌐S> Ilbi x1⌐   ⌐B> any glove⌐   ⌐S> ...⌐    ⌐B> ...⌐    │
│  ▓      ☻              ☻              ☻            ☻         │
│  ═══════════════ LOWER FLOOR ════════════════════════════════│
└──────────────────────────────────────────────────────────────┘
   ▓ ladder     🎯 training dummy     ☻ hawker
```

**Upper walkway — the stalls.** Three numbered pitches with striped awnings and hanging signs (FM 1, FM 2, FM 3), exactly where the numbered portals sat. Fixed prices, no haggling. This is the reference-price layer. Also here: the **training dummy**, and the **HOME door** at the far right, which ends the day.

**Lower floor — the people.** Four hawkers in a row with chat bubbles overhead: `S> Ilbi Throwing Stars @@@@`, `B> any glove @@@`. No fixed prices, a person opposite, and the entire negotiation layer.

The vertical split is thematic: officialdom above, deals below.

**Movement.** Arrow keys or click-to-walk. Click any interactive object and the character walks to it, routing via the ladder if it's on the other floor, then opens it. Arrow input cancels auto-walk. `↑` interacts, `↓` at the ladder descends, `I` opens gear.

---

## 6. Items and the economy

### 6.1 Use real MapleStory item names

Use authentic names and real icons. It makes the market instantly legible to anyone who played, and it means the item sprites are free.

**Process for the agent:** for each row in the table below, resolve the name against the maplestory.io item search to get its real item ID and icon. If a name doesn't resolve, substitute another era-appropriate item of the same equip slot and note the substitution in `docs/item-substitutions.md`. Do not invent IDs.

The **mechanics** below are ours; only the names and art are borrowed. Keep them in a data file (`data/items.json`) so they can be retuned without touching code.

### 6.2 The table

Prices are fixed for the entire run and do not scale with player wealth.

| Item | Slot | Price | Mechanics |
|---|---|---|---|
| Wooden Club | weapon | 2,500 | 3–8 dmg, 1.5 spd |
| Fruit Knife | weapon | 6,000 | 4–7 dmg, 1.6 spd |
| Sword | weapon | 14,000 | 10–16 dmg, 0.9 spd |
| Yellow Umbrella | weapon | 18,000 | 3–26 dmg, 0.85 spd — deliberately swingy |
| Steely Throwing Knives | weapon | 60,000 | 24–44 dmg, 0.45 spd, +10% crit, +25% crit dmg |
| Maple Sword | weapon | 280,000 | 9–14 dmg, 1.1 spd, 30% on hit: Slow |
| Ilbi Throwing Stars | weapon | 320,000 | 7–11 dmg, 1.5 spd, every hit applies 1 Burn |
| Bamboo Hat | helm | 4,000 | +3 armour |
| Blue Bandana | helm | 70,000 | +12% crit chance, +20% crit dmg |
| Zakum Helmet | helm | 95,000 | +4 STR, Burn ticks deal +1 per stack |
| Wooden Shield | shield | 5,000 | +5 armour |
| Maple Shield | shield | 340,000 | +9 armour, on Slow 35% to Freeze instead |
| Cotton Shirt | body | 7,000 | +6 armour |
| Sauna Robe | body | 110,000 | +14 armour, +3 STR |
| Black Napoleon | body | 900,000 | +22 armour, +6 STR |
| Blue Jeans | legs | 6,000 | +4 armour, +2 STR |
| Rubber Boots | boots | 2,500 | +8% attack speed |
| Yellow Snowshoes | boots | 85,000 | +20% spd, +20% more while enemy Slowed |
| Facestompers | boots | 620,000 | +12 armour, +15% attack speed |
| Work Gloves | gloves | 9,000 | +6 STR |
| Brown Gauntlets | gloves | 55,000 | +8 minimum damage |
| Pink Adventurer Cape | cape | 3,000 | +2 armour, +5% spd |
| Blue Adventurer Cape | cape | 80,000 | +15% attack speed |
| Maple Cape | cape | 400,000 | Burn stacks never expire |
| Silver Earrings | earring | 11,000 | +4 STR, +6% crit |
| Golden Clover Pendant | pendant | 120,000 | +15% crit chance, +15% crit dmg |
| Dark Bezalwing | ring | 90,000 | Burn applications add 1 extra stack |
| Ruby Ring | ring | 300,000 | Heal 1 per Burn stack per second |
| Golden Crow | weapon | 1,400,000 | 14–22 dmg, 1.4 spd, Burn deals double damage |
| Dragon Khanjar | weapon | 2,000,000 | 30–52 dmg, 1.0 spd, +18% crit |

**Top of the market is 2m.** Do not add items above this. Above it, a single trade wins the game.

### 6.3 Run parameters

| | |
|---|---|
| Start | 50,000 mesos, a Sword, a Cotton Shirt |
| Days | 12 |
| Target | 10,000,000 **liquid** mesos |
| Loss | cannot afford to trade or wager, **or** the market closes to you (§11) |
| Score | day of cash-out, or peak bankroll if busted |

**Liquid, not net worth.** You must sell out to win. Walking around on day twelve with 9m of gear on your back is a problem, not a victory — and finding someone who can absorb that much value is the final act of the run.

**The clock is the pressure, not a life bar.** Hitting 10m requires compounding, so idling loses by default. A bad day doesn't kill you; it means tomorrow's stake is smaller.

### 6.4 Why prices don't scale

On day one, with 50k, the player can see a Dragon Khanjar at 2,000,000. They can hover it, read exactly what it does, and not afford it.

**The greyed-out card is the progression system.** It gives the early game direction and the late game a destination, and it makes the market feel like a real place with rich people in it rather than a difficulty curve wearing a hat.

---

## 7. The market floor

### 7.1 Stalls persist

A stall is a **pitch**, not a shop. An owner occupies it for **1–3 days**, then packs up and someone else moves in with a new name, blurb, colour, stock and board.

Header when opened:

```
Odd Vell's Curios
Things she swears are cursed. She's lying. Mostly.
here for 2 more days · 4 for sale · 2 already sold
```

### 7.2 Stall pricing and sell-through

Each stock entry gets its own asking price: **`round(trueValue × uniform(0.78, 1.50))`**, rounded to a sensible increment.

That markup then determines the chance it sells to somebody else overnight:

```
ratio  = askingPrice / trueValue
chance = clamp(0.62 - (ratio - 0.80) * 0.78, 0.03, 0.62)
```

| Markup | Sells/night | Survives 3 nights |
|---|---|---|
| 0.80× | 62% | 5% |
| 1.00× | 46% | 15% |
| 1.25× | 27% | 39% |
| 1.50× | 7% | 79% |

Bargains evaporate. Overpriced stock sits until the stall leaves with it. Sold slots stay visible, greyed and marked SOLD.

**Second-order effect, and it's intended:** after a few days the shelves are disproportionately overpriced junk. The market visibly picks itself clean of value, exactly like a real one.

### 7.3 Notice boards

Every stall has a board beneath its stock. It seeds with 3–6 messages and gains **1–3 per night**. Messages older than two days render faded. The board leaves with the stall.

Four jobs, and they must stay mixed:

**Price gossip — the useful one.**
> `got a maple sword for 210k off some guy downstairs`
> `anyone know what a zakum helmet actually goes for`

Quoted figures land at **72–127% of true value**. Any one message is unreliable; three about the same item give a usable range. Since nothing else in the game reveals true value, **this is the only price history the player has.** Board gossip plus the stall's asking price is the whole appraisal loop.

**Wanted ads.** `wtb facestompers, paying well, ask for me`. Tells you what the floor is hungry for, which is what you should be buying to flip.

**Warnings that name live hawkers.** `watch out for xXDarkLordXx, said it was clean and it wasnt`. Pull the name from the actual hawker pool.

**The shopkeeper's own notices**, in a distinct colour. `no haggling. this is not downstairs.`

**And noise**, because a board with only useful things on it isn't a board:
> `any1 got a spare 10k` · `lvl 34 sin lf ptyyy` · `hacker on the bottom floor` · `smega spam is out of control` · `brb food` · `who keeps writing on this board` · `@@@@@@@@@@` · `i miss the old market` · `first`

Single-word pool: `lol` `o/` `xd` `???` `rofl` `omgg` `ty` `np` `kk` `zzz` `gl hf` `ok.`

**Names must be period-correct.** `xXDarkLordXx`, `BowMaster94`, `o0Angel0o`, `HoLyPaLaDiN`, `PinkBean4Life`, `Sn1per`, `aznpride`, `NotAHacker`, `Meso_Farmer`, `GM_Sarah`, `iCantAim`, `LvL200`, `T3hPwnerer`, `uwu`. Build a pool of 50+.

Dedupe: retry generation up to 6 times if the exact text is already on that board.

The player can post. Their message persists for the life of the stall and does nothing mechanically. That is correct — the guestbook feeling is the point.

---

## 8. Negotiation

This is the core system. Budget accordingly.

### 8.1 The window

Opening a hawker deal opens a **trade window** (§4.5). Two item grids, two meso fields, a timestamped chat log, a text input, four action buttons, and Leave / Trade at the bottom.

Layout: **hawker on the left, player on the right.** Player's separate ITEM inventory window sits to the right of the trade window.

### 8.2 Hawker data

```ts
interface Hawker {
  name: string            // period-correct handle
  look: Look              // §4.4
  buyer: boolean
  give: { type: 'item', id: number } | { type: 'mesos', amt: number }
  wantSlot?: Slot         // buyers only
  trueValue: number
  ask: number             // opening price
  floor: number           // true minimum
  threshold: number       // current demand, moves during negotiation
  patience: number        // 4 + floor(rep/30) + rand(0..2)
  maxPatience: number
  mood: number            // -8..6, starts 0
  savvy: number           // 0.25..0.95, scales up with price tier
  stubborn: number        // 0..1
  style: 'pricer' | 'offerer' | 'mixed'
  wpm: number             // 26..58
  placed: boolean         // has their item hit the window yet
}
```

Generation:
```
ask   = round(trueValue × (1.25 + rand(0, 0.45) − rep/400))
floor = round(trueValue × (0.70 + rand(0, 0.18)))
if (floor >= ask) floor = round(ask × 0.7)
threshold = ask
```

### 8.3 The conversation must feel human

**Message queue with typing delays.** Every hawker line goes through one queue. Nothing may bypass it — this is the single most common implementation mistake and it destroys the effect.

```
thinkDelay  = 650 + rand(0, 950) ms          // before the dots appear
typingTime  = clamp(len × (1200/wpm) × 4.2 + 520 + rand(0,520), 950, 4200) ms
```

Show `<name> is typing...` with animated dots during `typingTime`.

**Hesitation.** 16% of messages longer than 1400ms: dots run for 350–850ms, stop for 500–1400ms, then resume, and the total is extended by 700–1400ms. Reads exactly like someone deleting what they typed.

**The opening is scripted.** Open the window → 900–2200ms → they greet (`hey`, `yo`, `sup`). Optionally a second line (`one sec`, `u buying?`). Then 1300–2700ms → **their item drops into their grid with a pop animation**. Only then do they talk price, and only if their style says so.

**Queue priority.** Direct answers jump ahead of leftover filler, but **never ahead of a pending action** — they put the item in the window before they quote a price.

**Dedupe and interruption.** Keep the last 5 lines they said; drop any repeat of a droppable line. Small talk is silently discarded if they're already mid-sentence or already greeted. When they lose their temper, **flush the queue** — they don't finish whatever they were typing.

### 8.4 Three negotiating styles

| Style | Behaviour |
|---|---|
| **Pricer** | States their number unprompted when their item lands |
| **Offerer** | Never names a price. `offer`, `u offer first`, `just offer` |
| **Mixed** | Coin flip each time |

**The offer standoff.** Against an offerer the player can refuse to go first. Each exchange costs a patience pip.

```
caveChance = 0.20 + standoff × 0.22 + mood × 0.04 − stubborn × 0.30
```

Win it and they name a figure **6% below** their current threshold. Lose it and you've burnt pips for nothing. This is a nerve game and it's the most authentic thing in the design.

### 8.5 Typed input

Parser, not a menu. Free chit-chat, costed actions.

| Input pattern | Effect | Cost |
|---|---|---|
| `hi` `ty` `pls` | mood +1 | free |
| `noob` `scammer` | mood −2, price +6% | free |
| `how much?` `price?` | they quote, or say `offer` | **free** |
| `u offer` `no u` `you first` | standoff | 1 pip |
| `too much` `cmon` `expensive` | push | 1 pip, escalating mood cost |
| `60k?` `i'll give 60` | **verbal offer** — see below | 1 pip |
| `i've seen them for 45k` | **market claim** — see below | 1 pip |
| `what are you buying?` `wts?` | they state their business | free |
| `is it any good?` | they quote one stat | free |
| `im poor` `cant afford` | 35% chance of 7% discount | 1 pip |
| `u want my maple sword?` | matched against real bag contents | free |
| `this is my final offer` | binds — next offer clears or they walk | free |
| `hold on` `wait` | `k` | free |
| unparsed | `?` `wdym` `huh` | free |

Number parsing accepts `60`, `60k`, `1.2m`. A bare number under 10,000 is read as thousands — nobody says "sixty mesos" in this market.

**Asked the same thing twice:** they get short. `i said ring`, `read it lol`, `its in the window`.

### 8.6 Naming a figure is the strongest and most dangerous move

```
v < floor          → refusal, threshold drops 12% of gap, pip gone
floor ≤ v < thresh → they accept. threshold = v. Three rounds skipped.
v ≥ threshold      → instant enthusiastic yes. You have overpaid,
                     and you are not told by how much.
```

This is why probing matters. **Ask about it** costs a pip and reveals, in order: (1) how savvy they are, (2) roughly where they'd settle. Two pips buys the knowledge to name a number safely.

**Promises bind.** A number they accepted becomes `HG.promised`. Put less than 95% of it on the table and they call it — `u said 80k tho` — mood −2, threshold +8%, pip gone.

### 8.7 Lying about what you own

Items placed on the table carry a **price tag the player chooses**. Click the tag:

```
Maple Sword — really worth 280k. what do you tell them?
  undersell it — "it's honestly not worth much"    "196k"
  straight value, no games                         "280k"
  talk it up a little                              "378k"
  talk it up a lot                                 "504k"
  lie through your teeth                           "700k"
```

Multipliers: `0.7, 1.0, 1.35, 1.8, 2.5`.

```
detectChance = clamp((multiplier − 1) × 0.78 × savvy, 0, 0.92)
```

Caught: reputation −7, threshold ×1.12, mood −3, and a **35% chance they walk and tell people**.

**Underselling is a real strategy.** Claim under true value → mood +2, threshold ×0.94 immediately, reputation +2. Sometimes the right play is to give away value to buy a permanently cheaper market.

Tags render **gold when honest, salmon when inflated**. The whole bluff is visible on the table before committing.

Clicking the **item** takes it back. Clicking the **tag** opens the claim menu. Never bundle these into one menu.

### 8.8 Market claims

`i've seen them sold for 45k` is a bluff with the same shape:

```
v ≥ threshold        → `then pay 60k lol`
v ≥ floor × 0.85     → 45% + (rep−50)/300 + mood×0.04 chance they believe;
                       threshold = midpoint(threshold, max(v, floor))
otherwise            → `lol where` / `thats a lie`, mood −1
```

Near the truth is effective. Far from it is catchable.

### 8.9 Two separate clocks

**Patience is time.** Every costed action burns a pip. At zero they shrug and wander off. Nobody's angry, you were just slow.

**Temper is manners.**

| Event | Mood |
|---|---|
| Insult | −2 |
| Caught lying | −3 |
| Broken promise | −2 |
| Lowball (under half floor) | −2 |
| Lowball | −1 |
| Push (first) | −1 |
| Push (each subsequent) | −2 |
| Declined offer | −0.5 |
| 5+ chat messages with nothing on the table | −1 |

- **At −4:** warning. `last chance man`. Threshold +5%. Warning jumps the queue.
- **At −6:** **flush the queue.** `forget this`. They **pull their item back out of the window**. Reputation −2. They leave.

Neither number is ever shown.

### 8.10 Buyers and sellers are one system

A seller puts an item on the table; a buyer puts mesos. The player builds a pile against it either way.

```
buyer,  matching slot     → values your item at 1.35×
buyer,  non-matching      → 0.60×
seller (taking goods)     → 0.85×
```

That spread is the arbitrage. Buy cheap from `S>`, sell at a premium to the `B>` who wants that slot. **Stalls buy back at 50%**, so dumping to a shop is always the bad exit.

### 8.11 The accept handshake

Both sides press Trade. On the player's press:

1. Player's side locks — green tint, contents fade, tick in the corner, all controls disabled
2. Notice bar: `Waiting for xXDarkLordXx to accept…`
3. Resolution goes **through the message queue** — they take 3–4 seconds to reply
4. Accept → their side goes green too → transfer → close
5. Decline → player's side unlocks, they counter, pip gone

The pause before resolution is a commitment the player cannot take back. Do not shorten it.

---

## 9. Combat

### 9.1 The model

Both fighters auto-attack on a timer. That is the entire engine.

```
interval = 2.0s / attackSpeed
damage   = roll(min..max) + STR − enemyArmour
crit     = chance% for ×(1.75 + critDamage%)
```

No player decisions during the fight except the yield (§10.5). Everything was decided in the market.

### 9.2 Items have exactly three kinds of text

1. **Stat** — +12 STR, +8 armour, +15% attack speed. Most items are mostly this.
2. **Passive** — always on. *Your attacks apply 1 Burn.*
3. **Proc** — a trigger. *30% on hit: Slow.*

Three shapes. Any item reads in two seconds.

### 9.3 Status vocabulary — never exceed eight

| Effect | Does |
|---|---|
| Burn | 3/sec per stack, ignores armour |
| Poison | 2/sec per stack, doesn't decay |
| Slow | −25% attack speed |
| Freeze | no attacks for 1.5s |
| Weaken | −30% damage dealt |
| Regen | heal X/sec |
| Divine Shield | next hit taken deals 0 |
| Thorns | attacker takes X |

Every item either **applies** one, **amplifies** one, or **rewards you for having** one. That's a grid you can fill for 100 items in an afternoon.

### 9.4 Damage ranges and crit

Ranges differ in **shape**, not just size. The Yellow Umbrella (3–26) has nearly the same average as a Sword (10–16) and feels appalling — that's its job, and Brown Gauntlets (+8 minimum) redeem it. A synergy discovered through stats rather than proc text.

Crit is two stats. Chance and damage, stacking separately. High-variance weapons want chance; tight weapons want damage. Nobody has to be told.

### 9.5 Paper doll synergy

Fixed slots can't do grid adjacency, so:

- **Set bonuses** — 3 pieces of a set, +50% Freeze duration. Instantly understood.
- **Slot identity** — pendants amplify, rings are small and weird, capes carry one big passive. You can't run every amplifier, so builds have shape.
- **Amplifiers are slot-locked** — *Burn deals double damage* is a weapon effect on the Golden Crow, so it competes with your actual weapon choice.

### 9.6 Presentation

**Damage numbers the Maple way.** Each digit is a separate glyph with a black outline and a vertical gradient, and digits **bounce in sequence, 45ms apart**. That stagger is why a three-digit hit feels bigger than a two-digit one, for free. Group rises ~34px on an ease-out, hangs, drifts down, fades.

| Type | Look |
|---|---|
| Hit | cream→gold, brown outline, 23px |
| Crit | cream→deep red, 32px, spark burst, screen shake |
| Burn | orange→red, 20px, spawns lower on the body |
| Heal | green, 18px |

**Burn is fire.** Particles flicker white→orange→dark red, spawn rate scaling with stack count (2 stacks a lick, 15 a column), plus a warm glow pooling on the ground.

**Hitstop** on every swing: 40ms normal, 85ms crit. Cheapest impact trick there is.

**Proc flashes on the paper doll.** When an item triggers, *that slot lights up*. This teaches the player which item did the cool thing with no tutorial. Do not skip this.

**Fight length: 10–15 seconds.** Hard timeout at 20s, higher HP% takes it. The timeout kills stalls and makes pure survival a legitimate build rather than a broken one.

### 9.7 Three reference builds — each must have a clean counter

**Burn stacking** — Ilbi Throwing Stars apply burn, Maple Cape stops decay, Golden Crow doubles the tick, Ruby Ring heals per stack. Low direct damage, unanswerable by second fifteen. *Countered by* fast early healing.

**Frost lock** — Maple Sword slows, Maple Shield converts slows to freezes, Yellow Snowshoes speed up while they're slowed. You barely out-damage anyone; they barely attack. *Countered by* thorns, which don't care about attack speed.

**Divine tank** — shield below 40%, cape lets it re-trigger, thorns reflect. You sit at 30% forever. *Countered by* burn and poison, which bypass shields entirely.

If a build has no counter, it is a bug.

---

## 10. Wagers

Combat has no intrinsic score. It has stakes, negotiated in a window that works like the trade window.

### 10.1 The stake is the reveal

**Items you stake are visible. Mesos are not.**

One rule, and it does everything:

- Scouting costs something — to see their gear you must show gear, and you might lose it
- Bluffing has teeth — showing a weapon you won't wear means risking a weapon you won't wear
- A pure-mesos wager is a blind fight, which becomes a real choice: cheap and safe, or informative and expensive

No separate bluff mechanic is needed. The stake and the reveal are the same object.

### 10.2 You negotiate odds, not amounts

They look at what you've shown and at your public record, then say `u put up 200k i put up 120k`.

A well-geared player has to buy the fight with bad odds. Being strong means smaller payouts automatically, with no difficulty knob to mis-tune. They can always refuse: `nah ur too geared`.

Stakes cap at **25% of liquid mesos**, enforced in fiction (`thats too rich for me`), never by a UI limit.

### 10.3 Record public, gear private

Win/loss is visible — the one thing they *know* rather than are shown. Without it, sandbagging solves the game.

- Weak gear + 9–1 record fools nobody
- Weak gear + 2–6 record is credible
- **Deliberately losing cheap wagers before a big one** becomes a real strategy

That's the pool-shark arc, and it means a losing streak is leverage rather than pure punishment.

### 10.4 The re-gear window

Once stakes are agreed and visible, both sides get **15 seconds** with the paper doll open.

- **Show weak** → good odds, but they bring whatever they like
- **Show strong in the wrong direction** → worse odds, but they gear against a threat you're not bringing

Stake a burn weapon, watch them slot fire resistance, fight them with frost. You paid for that in odds and in risk.

Their real question is never *is this item good*. It's **are they actually going to wear it** — the same structure as claiming a Maple Sword is worth 700k. Savvy opponents cross-reference: `u never run a sword`.

**Counters must be partial.** Fire resistance blunts burn; it does not delete it. Otherwise the fight resolves at the paper doll and combat is decoration.

### 10.5 Resolution and yield

- You lose **exactly what you staked**. Staked items go to the winner and re-enter the economy — you will meet your old sword on someone else's stake later.
- **Yield** unlocks below 40% HP. Forfeit and lose half the pot; with item stakes, the winner takes one item instead of all.

Yield is the single intervention that keeps the player present. It's thematically right for a merchant — cutting losses is the skill — and it creates the read in the other direction: they're at 35% and haven't yielded, so are they holding a comeback proc or just stubborn?

### 10.6 Why they can't be farmed

Acceptance runs on their own build strength, a **discounted** read of your shown items, your public record, and a greed/caution dial. Their estimate is imperfect and **visible in their behaviour**: greedy ones take bad odds, cautious ones demand too much and you walk.

Reading which kind you're facing is the same skill as reading a hawker.

---

## 11. Days, the ledger, and reputation

### 11.1 The day

Walk the floor, deal with whoever's there, fight at most once, go through the HOME door. Overnight:

1. Each stall's `daysLeft--`; at zero, a new owner takes the pitch
2. Surviving stalls: roll sell-through per item (§7.2), add 1–3 board messages
3. All four hawkers are replaced
4. Ledger is shown
5. Day banner on re-entry

### 11.2 The ledger — build this, it is not optional

**The player currently has no way to know whether they got a good deal.** They pay 180k, sell for 240k, feel fine, and never learn it was available at 120k. Without this feedback the negotiation skill cannot develop, and a game built on negotiation skill dies.

At the HOME door, show the day's trades:

```
DAY 4                                    412k → 587k

  bought   Zakum Helmet        from Sn1per      paid 61k   (worth 95k)
  sold     Sword               to  o0Angel0o    got  22k   (worth 14k)
  bought   Blue Bandana        from Tarp        paid 91k   (worth 70k)   ✗
  wagered  120k                vs  T3hPwnerer   won  120k

  best deal today:  Zakum Helmet, 36% under
  worst:            Blue Bandana, 30% over
```

Facts, not lessons. Never write "you should have probed first."

### 11.3 Reputation

**Hidden. No number on screen.** Effects:

```
askMultiplier  = 1.35 − rep/500
patienceBonus  = floor(rep/30)
marketClaimBelief += (rep − 50)/300
```

The player feels it as doors opening or closing. A run of honest dealing warms the market. A run of caught lies makes everyone open high and run out of patience fast.

**Secondary loss condition:** burn enough bridges and the market closes. Stalls charge double, hawkers refuse to open, nobody will bet against you.

### 11.4 Scaling by tier

As the player climbs:

- **Savvy scales with price tier.** The guy flipping 14k gear is gullible. Nobody handling 1m items is. Margins compress and the late game shifts from exploitation to genuine negotiation.
- **Counterparties become scarce, not items.** At the top you're hunting somebody who can *afford* it. A whale appears once a day; a consignment board; an introduction.
- **They scam you back.** At 14k it doesn't matter; at 1m it's absurd that everything a hawker says is true. Give them the player's tools — inflated claims, an item worse than advertised, "clean" gear that isn't — plus an **inspect** action that costs patience.

---

## 12. Async

Nothing transfers between live players, so everything is async-safe.

- **Ghosts** are recorded builds. You fight snapshots.
- **Hawkers** are procedural, seeded per day.
- **Rival ghost** — another trader's recorded run racing you to 10m. Gives the clock a pulse.
- **Leaderboards** — fastest to 10m, highest bankroll before busting, longest streak.

Anything needing two live people (transferable tokens, direct player trade) is **out of scope permanently**.

---

## 13. Instrumentation

Build this in milestone 1, not later.

Log every negotiation to a structured console table: `ask`, `floor`, `settled`, `pipsUsed`, `moodEnd`, `lieAttempts`, `lieCaught`, `outcome`. You need this to tune the floor/ask spread, and retrofitting it is always more annoying than it sounds.

Also log: day length in wall-clock seconds, bankroll per day, and the markup distribution of unsold stall stock.

---

## 14. Build order

Each milestone must pass its criteria before the next begins.

| # | Milestone | Acceptance criteria |
|---|---|---|
| **1** | Asset pipeline + instrumentation | `tools/fetch-assets.ts` resolves every §6.2 item to a real ID and icon; substitutions logged; zero runtime network calls; negotiation logger prints a table |
| **2** | Scene + movement | Two-floor FM map, ladder, click-to-walk with cross-floor routing, day counter, HOME door |
| **3** | NPC appearance generator | 20 consecutive spawns, no two identical looks, ~70% read as poor, sitting and standing poses both present |
| **4** | Stalls, pricing, sell-through, boards | Markup distribution matches §7.2 within 5% over 200 simulated nights; boards read as authentic to someone who played |
| **5** | Paper doll, inventory, tooltips | Equip/unequip, sell at 50%, live stat rollup |
| **6** | **One negotiation, fully** | A single 90-second haggle is fun in isolation. **If it isn't, stop and fix it before building anything else.** |
| **7** | Full negotiation system | Lying, market claims, standoff, temper, the accept handshake, all lines through the queue |
| **8** | Ledger + day cycle | Ledger shows true values; day length measured under 3 minutes |
| **9** | Combat | Fights resolve in 10–15s; proc flashes fire; the three reference builds each beat one and lose to another |
| **10** | Wagers | Stake-as-reveal, odds negotiation, re-gear window, yield |
| **11** | Tier scaling + scam-backs | Savvy scales with price; hawkers can misrepresent; inspect action exists |

**Milestone 6 is the gate.** Everything downstream assumes a single negotiation is enjoyable on its own. If ninety seconds of haggling with one hawker isn't fun with no economy, no combat and no ledger attached, nothing built later rescues it.

---

## 15. Open questions for playtest

**Will anyone stake items?** If item wagers feel too frightening, you're left with mesos-only and the information layer never gets used. The fix isn't to force it — make blind fights feel genuinely uncomfortable so players reach for the reveal themselves.

**Is the re-gear window too strong?** If counter-picking decides fights, combat is decoration.

**Does hidden reputation read?** With all explanatory notes removed, getting caught lying registers only as tone and a price moving the wrong way. That might be too subtle, or exactly right.

**Is 12 days correct?** Long enough for three or four rungs of the ladder, short enough that a wasted day stings. Tune against measured flip margins, not intuition.

---

## 16. Reference prototype

`bazaar-prototype.html` — single file, no dependencies, runs in any browser.

**Implemented:** two-level market floor, three persistent stalls with days-left and sold-out stock, notice boards, the day cycle and HOME door, paper doll and inventory with tooltips, training dummy with Maple-style damage numbers and flame particles, four procedural hawkers, the full trade window, the typing-queue conversation system, the keyword parser, item and market-price lying, patience, temper, hidden reputation.

**Not implemented:** wagers, ghost opponents, the ledger, set bonuses, statuses beyond Burn, scam-backs, real Maple assets (placeholder pixel art throughout).

**Controls:** arrows to walk, `↑` interact, `↓` at ladder, `I` gear, click anything to walk to it. Backtick reveals hidden negotiation stats for tuning.

Use it to check feel and timing. Do not port its code — it's a single-file sketch with none of the module boundaries §3 requires.
