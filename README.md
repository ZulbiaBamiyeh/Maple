# Lantern Row

A merchant game set in the Free Market of a 2000s-era 2D MMO. Twelve days, fifty
thousand mesos, and you need ten million. You get there by buying gear cheap
from people who don't know what they have, selling it dear to people who need
it, and — when trading alone isn't fast enough — by wagering your bankroll on an
automated fight and letting your equipment do the arguing.

Built to [LANTERN-ROW-SPEC.md](docs/LANTERN-ROW-SPEC.md). Real MapleStory sprites
throughout: the character layer composes a paper doll the way the client does,
from extracted layers with their original origins, attachment points and z-order.

## Running it

```sh
npm install
npm run dev       # http://localhost:5173
npm test          # the two acceptance suites
npm run build
```

Arrow keys or click to walk, `↑` to interact, `↓` at the ladder, `I` for gear,
backtick to dump the instrumentation tables to the console. `?seed=anything`
replays a run exactly.

## What's in

| | |
|---|---|
| **The hall** | Two floors modelled on the Free Market Entrance — three numbered pitches and the training dummy above, four hawkers below. Click-to-walk routes via the ladder. |
| **The crowd** | Procedural looks from a curated wardrobe: ~70% read as poor, appearance correlates with wealth and lies about it one time in five, and no two people on screen share a look. |
| **Stalls** | A pitch, not a shop. An owner holds it for one to three days, prices at 0.78–1.50× true value, and that markup decides what sells overnight — so the shelves visibly pick themselves clean of value. |
| **Notice boards** | Price gossip at 72–127% of truth, wanted ads, warnings naming live hawkers, the shopkeeper's own notices, and noise. The only price history the game gives you. |
| **Negotiation** | A trade window and a person on the other side of it. Everything they say goes through one queue with think and typing delays, hesitation and dedupe. Free chit-chat, costed actions, two hidden clocks, price tags you choose and can be caught on. |
| **Combat** | Both fighters auto-attack on a timer; everything was decided in the market. Damage numbers bounce in per-digit, burn is fire, procs light up the slot that fired. |
| **Wagers** | Stakes agreed beforehand. Items you stake are visible; mesos are not. They name the odds from what you showed and your public record, then both sides get fifteen seconds with the paper doll open. |
| **The ledger** | At the HOME door: what you paid against what things were worth. Facts, not lessons. |

## Layout

```
src/core/      the simulation — no DOM, no canvas, importable and testable alone
src/assets/    the only module that knows where a pixel comes from
src/scene/     the hall, movement, damage numbers and particles
src/ui/        window chrome, tooltips, trade, stalls, gear, wagers, the ledger
data/items.json  the price table and every item's mechanics
tools/         the asset vendoring pipeline
docs/          the spec, the asset notice, substitutions, and design notes
```

The simulation never imports the renderer, and nothing outside `src/assets`
references a sprite path — so porting to MapleStory Worlds means rewriting the
shell and the asset module, not the brain.

## Not yet built

Ghost opponents and the rival ghost (§12), leaderboards, set bonuses, and the
whale/consignment counterparty scarcity of §11.4. Hawkers can already
misrepresent goods and the inspect action exists, but the full scam-back kit is
thin.

## Artwork

MapleStory artwork and names belong to Nexon and Wizet. This is an unofficial fan
prototype — see [docs/ASSET-NOTICE.md](docs/ASSET-NOTICE.md).
