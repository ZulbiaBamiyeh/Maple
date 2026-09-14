/**
 * Builds public/assets/ from two locally cloned, community-extracted MapleStory
 * asset sets. Run once; the game itself never touches the network.
 *
 *   node tools/vendor-assets.mjs
 *
 * Sources (clone these first, or point the env vars at existing clones):
 *   PLAYGROUND=/tmp/maplestory-cosmetic-playground   sprite layers, origins, z-order
 *   LIBRARY=/tmp/heroaran.github.io                  classic equip inventory icons
 *
 * maplestory.io — the source named in the spec — is unreachable from the build
 * environment (the egress policy refuses it), so these mirrors of the same
 * extracted client data stand in. Artwork remains Nexon/Wizet's; see
 * docs/ASSET-NOTICE.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PLAYGROUND = process.env.PLAYGROUND || '/tmp/maplestory-cosmetic-playground';
const LIBRARY = process.env.LIBRARY || '/tmp/heroaran.github.io';
const OUT = path.resolve('public/assets');

/** Animations the game actually plays. Everything else is left behind. */
export const POSES = [
  'stand1/0', 'stand1/1', 'stand1/2',
  'walk1/0', 'walk1/1', 'walk1/2', 'walk1/3',
  'alert/0', 'alert/1', 'alert/2',
  'swingO1/0', 'swingO1/1', 'swingO1/2',
  'sit/0', 'jump/0', 'ladder/0', 'ladder/1', 'dead/0',
];

/** Curated NPC wardrobe. Cheap things first in each list — §4.4 leans on the order. */
const POOL = {
  hair: [
    30030, 30070, 30100, 30110, 30130, 30170, 30190, 30220,
    30230, 30240, 30250, 30260, 30310, 30330, 30430, 30450,
  ],
  face: [20000, 20001, 20002, 20003, 20004, 20005, 20006, 20007, 20008, 20009],
  cap: [
    1007046, 1007061, 1007099, 1007086, 1007036, 1007116,
    1007020, 1007008, 1007013, 1007029, 1007090, 1007077,
  ],
  coat: [
    1047001, 1047006, 1047014, 1047027, 1047028, 1047036, 1047042,
    1057011, 1057017, 1057003, 1057023, 1057031, 1057038, 1057040,
  ],
  pants: [1067004, 1067018, 1067030, 1067032, 1067040, 1067048, 1067063, 1067069],
  shoes: [1077000, 1077002, 1077003, 1077013, 1077014, 1077021, 1077024, 1077033],
  glove: [1087002, 1087004, 1087005, 1087006, 1087001, 1087011],
  cape: [1107000, 1107001, 1107002, 1107004, 1107006, 1107007],
  weapon: [1702000, 1702004, 1702015, 1702020, 1702024, 1702010, 1702016, 1702019, 1702001, 1702022],
};

/**
 * What each §6.2 item looks like when it is actually worn. The extracted layer
 * set is cash cosmetics, so these are stand-ins chosen for silhouette — but a
 * player holding a Maple Sword has something in their hand, and swapping gear
 * visibly changes the character, which is the point. Recorded in
 * docs/item-substitutions.md.
 */
const GEAR_LOOKS = {
  wooden_club: 1702010,      // Orange Toy Hammer
  fruit_knife: 1702012,      // Yellow Spatula
  sword: 1702024,            // Blazing Sword
  yellow_umbrella: 1702015,  // Bug Net
  steely: 1702003,           // Plastic Slingshot
  maple_sword: 1702007,      // Green Candy Cane
  ilbi: 1702009,             // Tiger Paw
  golden_crow: 1702023,      // Cupid's Crossbow
  dragon_khanjar: 1702000,   // Dual Plasma Blade
  bamboo_hat: 1007071,       // Blue Straw Hat
  blue_bandana: 1007121,     // Blue Feather Bandana
  zakum_helmet: 1007055,     // Camouflage Helmet
  cotton_shirt: 1047040,     // Bowling Shirt
  sauna_robe: 1057013,       // Graduation Gown
  black_napoleon: 1057031,   // Black Officer Uniform
  blue_jeans: 1067077,       // Blue Skinny Jeans
  rubber_boots: 1077009,     // Red Rain Boots
  yellow_snowshoes: 1077021, // Beige Galoshes
  facestompers: 1077015,     // Military Boots
  work_gloves: 1087005,      // Brown Bandage
  brown_gauntlets: 1087002,  // Brown Baseball Glove
  pink_cape: 1107005,        // Pink Nymph Wing
  blue_cape: 1107002,        // Blue Nymph Wing
  maple_cape: 1107003,       // Green Nymph Wing
};

const SKINS = ['0', '1', '2', '3', '4'];

/** Expressions the portrait boxes use to show a hawker's mood. */
export const EXPRESSIONS = ['default', 'blink', 'smile', 'troubled', 'angry', 'cry', 'hit', 'despair', 'love'];

/**
 * §6.2 item -> the real inventory icon that stands in for it. Names that resolve
 * exactly keep their own art; the rest borrow an era-appropriate piece in the
 * same slot and are recorded in docs/item-substitutions.md.
 */
const ICONS = {
  wooden_club: ['Wooden_Club', 1322005],
  fruit_knife: ['Fruit_Knife', 1332007],
  sword: ['Sword', 1302000],
  yellow_umbrella: ['Yellow_Umbrella', 1302016],
  steely: ['Steely_Throwing_Knives', null],
  maple_sword: ['Maple_Sword', 1302020],
  ilbi: ['Ilbi_Throwing_Stars', null],
  bamboo_hat: ['Bamboo_Hat', 1002348],
  blue_bandana: ['Blue_Bandana', 1002081],
  zakum_helmet: ['Zakum_Helmet', 1002357],
  wooden_shield: ['Wooden_Buckler', 1092005],
  maple_shield: ['Maple_Shield', 1092030],
  cotton_shirt: ['White_Undershirt', 1040002],
  sauna_robe: ['Blue_Sauna_Robe', 1050018],
  black_napoleon: ['Napoleon_Uniform', 1050170],
  blue_jeans: ['Blue_Jeans', 1061144],
  rubber_boots: ['Red_Rubber_Boots', 1072001],
  yellow_snowshoes: ['Yellow_Snowshoes', 1072239],
  facestompers: ['Facestompers', 1072344],
  work_gloves: ['Work_Gloves', 1082002],
  brown_gauntlets: ['Brown_Work_Gloves', 1082149],
  pink_cape: ['Pink_Adventurer_Cape', 1102041],
  blue_cape: ['Blue_Adventurer_Cape', 1102001],
  maple_cape: ['Maple_Cape', 1102166],
  silver_earrings: ['Silver_Earrings', 1032029],
  clover_pendant: ['Gold_Pendant', null],
  bezalwing: ['Aura_Ring', null],
  ruby_ring: ['Sparkling_Ring', 1112000],
  golden_crow: ['Golden_Crow', 1462008],
  dragon_khanjar: ['Dragon_Khanjar', 1092049],
};

const unresolved = [];

function readGz(file) {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
}

function trimPart(p) {
  const out = { origin: p.origin, z: p.z, url: p.url, w: p.w, h: p.h };
  if (p.maps && Object.keys(p.maps).length) out.maps = p.maps;
  if (p.name && p.name !== 'default') out.name = p.name;
  return out;
}

const copied = new Set();
function copyAsset(url) {
  if (copied.has(url)) return;
  const src = path.join(PLAYGROUND, url);
  if (!fs.existsSync(src)) { unresolved.push(`asset ${url}`); return; }
  const dst = path.join(OUT, 'ms', url.replace(/^assets\//, ''));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied.add(url);
}

/** Weapon layers key their poses by weapon type ("30/stand1/0"); everything else doesn't. */
function flattenWeaponPoses(poses) {
  const keys = Object.keys(poses);
  if (!keys.length || !/^\d+\//.test(keys[0])) return poses;
  const type = keys[0].split('/')[0];
  const out = {};
  for (const k of keys) {
    if (!k.startsWith(type + '/')) continue;
    out[k.slice(type.length + 1)] = poses[k];
  }
  return out;
}

function takePoses(poses) {
  const out = {};
  for (const key of POSES) {
    const raw = poses[key];
    if (!raw) continue;
    // Base poses are grouped by part name; equip layers are a flat list.
    const parts = Array.isArray(raw) ? raw
      : Array.isArray(raw.layers) ? raw.layers
      : Object.values(raw).flat();
    const keep = parts.filter((p) => p && p.visible !== false && p.url);
    if (!keep.length) continue;
    out[key] = keep.map(trimPart);
    for (const p of keep) copyAsset(p.url);
  }
  return out;
}

function main() {
  for (const [label, dir] of [['PLAYGROUND', PLAYGROUND], ['LIBRARY', LIBRARY]]) {
    if (!fs.existsSync(dir)) {
      console.error(`missing ${label} clone at ${dir} — see the header of this file`);
      process.exit(1);
    }
  }
  fs.mkdirSync(path.join(OUT, 'items'), { recursive: true });

  const base = readGz(path.join(PLAYGROUND, 'data/base.json.gz'));
  const catalog = JSON.parse(fs.readFileSync(path.join(PLAYGROUND, 'data/catalog.json'), 'utf8'));
  const byId = new Map(catalog.items.map((i) => [String(i.item_id), i]));

  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    order: base.orders.classic,
    slotOf: base.smaps.classic,
    frames: {},
    skins: {},
    equips: {},
    pool: {},
  };

  for (const [action, spec] of Object.entries(base.specs)) {
    manifest.frames[action] = spec.map((f) => ({ f: f.frame, d: f.delay }));
  }

  for (const skin of SKINS) {
    if (!base.poses[skin]) { unresolved.push(`skin ${skin}`); continue; }
    manifest.skins[skin] = takePoses(base.poses[skin]);
  }

  // Anything the §6.2 table can be wearing has to be vendored too.
  POOL.gear = [...new Set(Object.values(GEAR_LOOKS))].filter(
    (id) => !Object.values(POOL).flat().includes(id));

  for (const [group, ids] of Object.entries(POOL)) {
    manifest.pool[group] = [];
    for (const id of ids) {
      const file = path.join(PLAYGROUND, `data/layers/${id}.json.gz`);
      if (!fs.existsSync(file)) { unresolved.push(`layer ${group}/${id}`); continue; }
      const layer = readGz(file);
      const poses = takePoses(flattenWeaponPoses(layer.poses));
      const expressions = {};
      if (layer.expressions) {
        for (const name of EXPRESSIONS) {
          const e = layer.expressions[name];
          if (!e || !e.frames || !e.frames['0']) continue;
          const parts = e.frames['0'].filter((p) => p && p.visible !== false && p.url);
          if (!parts.length) continue;
          expressions[name] = parts.map(trimPart);
          for (const p of parts) copyAsset(p.url);
        }
      }
      if (!Object.keys(poses).length && !Object.keys(expressions).length) {
        unresolved.push(`layer ${group}/${id} (no usable poses)`);
        continue;
      }
      const meta = byId.get(String(id));
      manifest.equips[id] = {
        islot: layer.islot,
        vslot: layer.vslot,
        name: meta ? meta.name : String(id),
        poses,
      };
      if (Object.keys(expressions).length) manifest.equips[id].expressions = expressions;
      manifest.pool[group].push(id);
    }
  }

  // Inventory icons for the §6.2 table.
  const iconMap = {};
  for (const [key, [name, mapleId]] of Object.entries(ICONS)) {
    const candidates = [
      path.join(LIBRARY, 'en/library/images/items', `${name}.png`),
      path.join(LIBRARY, 'library/images/items', `${name}.png`),
    ];
    const src = candidates.find((c) => fs.existsSync(c));
    if (!src) { unresolved.push(`icon ${key} (${name})`); continue; }
    fs.copyFileSync(src, path.join(OUT, 'items', `${key}.png`));
    iconMap[key] = { file: `items/${key}.png`, source: name, mapleId };
  }
  manifest.icons = iconMap;
  manifest.gearLooks = {};
  for (const [key, id] of Object.entries(GEAR_LOOKS)) {
    if (manifest.equips[id]) manifest.gearLooks[key] = id;
    else unresolved.push(`gear look ${key} (${id})`);
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));

  const bytes = [...copied].reduce((n, u) => n + fs.statSync(path.join(PLAYGROUND, u)).size, 0);
  console.log(`sprites  ${copied.size} files, ${(bytes / 1e6).toFixed(1)} MB`);
  console.log(`icons    ${Object.keys(iconMap).length}/${Object.keys(ICONS).length}`);
  console.log(`equips   ${Object.keys(manifest.equips).length} across ${Object.keys(POOL).length} groups`);
  console.log(`manifest ${(fs.statSync(path.join(OUT, 'manifest.json')).size / 1e6).toFixed(2)} MB`);
  if (unresolved.length) {
    console.log(`\nunresolved (${unresolved.length}):`);
    for (const u of unresolved) console.log('  ' + u);
  }
}

main();
