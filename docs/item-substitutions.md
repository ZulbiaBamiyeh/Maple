# Item substitutions

§6.1 requires real MapleStory names and art, and a logged note wherever a name
does not resolve. Nineteen of the thirty items in §6.2 resolved exactly against
the v83 equip table; the rest borrow an era-appropriate piece in the same slot.

| Spec item | Slot | Art used | v83 id | Why |
|---|---|---|---|---|
| Wooden Club | weapon | Wooden Club | 1322005 | exact |
| Fruit Knife | weapon | Fruit Knife | 1332007 | exact |
| Sword | weapon | Sword | 1302000 | exact |
| Yellow Umbrella | weapon | Yellow Umbrella | 1302016 | exact |
| Steely Throwing Knives | weapon | Steely Throwing Knives | — | throwing stars are consumables, not equips, so there is no equip id |
| Maple Sword | weapon | Maple Sword | 1302020 | exact |
| Ilbi Throwing Stars | weapon | Ilbi Throwing Stars | — | as above |
| Bamboo Hat | helm | Bamboo Hat | 1002348 | exact |
| Blue Bandana | helm | Blue Bandana | 1002081 | exact |
| Zakum Helmet | helm | Zakum Helmet | 1002357 | exact |
| Wooden Shield | shield | Wooden Buckler | 1092005 | no "Wooden Shield" exists; the Buckler is the wooden shield of the era |
| Maple Shield | shield | Maple Shield | 1092030 | exact |
| Cotton Shirt | body | White Undershirt | 1040002 | no "Cotton Shirt"; the plain starter top |
| Sauna Robe | body | Blue Sauna Robe | 1050018 | colour variant |
| Black Napoleon | body | Napoleon Uniform | 1050170 | colour variant |
| Blue Jeans | legs | Blue Jeans | 1061144 | exact |
| Rubber Boots | boots | Red Rubber Boots | 1072001 | colour variant |
| Yellow Snowshoes | boots | Yellow Snowshoes | 1072239 | exact |
| Facestompers | boots | Facestompers | 1072344 | exact |
| Work Gloves | gloves | Work Gloves | 1082002 | exact |
| Brown Gauntlets | gloves | Brown Work Gloves | 1082149 | nearest brown hand armour |
| Pink Adventurer Cape | cape | Pink Adventurer Cape | 1102041 | exact |
| Blue Adventurer Cape | cape | Blue Adventurer Cape | 1102001 | exact |
| Maple Cape | cape | Maple Cape (1) | 1102166 | exact |
| Silver Earrings | earring | Silver Earrings | 1032029 | exact |
| Golden Clover Pendant | pendant | Gold Pendant | — | no clover pendant in the era; gold pendant reads the same |
| Dark Bezalwing | ring | Aura Ring | — | name does not resolve in any dump checked |
| Ruby Ring | ring | Sparkling Ring | 1112000 | nearest jewelled ring |
| Golden Crow | weapon | Golden Crow | 1462008 | exact |
| Dragon Khanjar | weapon | Dragon Khanjar | 1092049 | exact |

Mechanics in `data/items.json` are ours throughout; only names and art are
borrowed.
