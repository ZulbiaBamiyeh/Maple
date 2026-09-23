# Artwork and data

MapleStory artwork, sprites, item names and trademarks belong to their
respective rights holders, including Nexon and Wizet. This project is an
unofficial fan prototype and is not affiliated with or endorsed by them. The
code license does not grant a license to the artwork.

## Where the sprites came from

The spec (§4.1) names **maplestory.io** as the source. That host is unreachable
from this build environment — the egress policy refuses the connection — so the
build pulls the same extracted client data from two community mirrors instead:

| Source | Used for |
|---|---|
| [`Javipen/maplestory-cosmetic-playground`](https://github.com/Javipen/maplestory-cosmetic-playground) | character sprite layers, origins, attachment maps, z-order table, frame timings, face expressions |
| [`Heroaran/heroaran.github.io`](https://github.com/Heroaran/heroaran.github.io) | classic equip inventory icons for the §6.2 item table |

`tools/vendor-assets.mjs` takes only the curated subset the game uses — about
1,600 sprites, well under a megabyte of PNG — and folds them straight into
`public/assets/manifest.json` as data URIs. One request instead of sixteen
hundred, and the whole game ships as a couple of dozen files, which is what most
static hosts want. The game makes **zero network requests at runtime** (§4.2).

If maplestory.io becomes reachable, `tools/fetch-assets.mjs` resolves the same
manifest shape straight from the API; the runtime cannot tell the difference,
because everything goes through `src/assets/index.ts` (§4.3).
