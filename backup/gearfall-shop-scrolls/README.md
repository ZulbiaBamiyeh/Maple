# Gearfall with shop and scrolls (parked)

A snapshot of the game as it was at commit `9dd7967`, before the shop and
scrolls were taken out. Not loaded by the game.

What this version had that the live game doesn't:

- **Shop** before every duel (rounds 3, 6, 9): 4 rarity-rolled wares from a
  shop-only stock of 11 items (Iron Sword, Twin Fang, Oak Staff, Leather Cap,
  Chain Mail, Brawler Wraps, Swift Boots, Guard Charm, Berserker Band,
  Iron Heart, Mending Pendant), priced 4/7/11 gold by rarity.
- **Scrolls** (Sure 100% +1, Chancy 60% +3, Long-shot 10% +8), bought and
  used at the shop; 3 upgrade slots per item.
- **Gold** from wins, losses and scrapping, spent at the shop.

To bring it back, restore from git (`git checkout 9dd7967 -- src styles.css tests`)
or copy these files over the live ones. Where to look:
`src/data.js` (items, SCROLLS, SHOP_*), `src/game.js` (rollShop, buy, scroll),
`src/ui/screens.js` (shopScreen, scrollSheet), `src/art/icons.js` (shop trinket icons).
