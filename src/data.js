// All game content lives here as plain data. Adding an item, trinket or mob
// is one entry; the sim, the art and the UI read from these tables.

export const BASE = { hp: 120, atk: 0, def: 0, crit: 0.05, haste: 0, lifesteal: 0, resist: 0 };
export const RESIST_CAP = 0.5;
export const BAG_SIZE = 6;
export const LIVES = 3;
export const ROUNDS = 9;
export const DUEL_ROUNDS = [3, 6, 9];
// Gold for a win, by what you beat. Losses pay 2 as consolation.
export const GOLD_WIN = { easy: 1, normal: 2, elite: 3, duel: 3 };
export const GOLD_LOSS = 2;

export const scaleFor = (round) => 1 + 0.12 * (round - 1);

// ---------------------------------------------------------------- statuses

export const STATUSES = {
  burn:   { name: 'Burn',   harmful: true,  color: '#f58a3a', glyph: 'fire',   desc: 'Damage every second. Ignores Def.' },
  poison: { name: 'Poison', harmful: true,  color: '#6cc24a', glyph: 'drop',   desc: '1 damage/s per stack. Ignores Def.' },
  bleed:  { name: 'Bleed',  harmful: true,  color: '#d9434f', glyph: 'blood',  desc: 'Takes damage each time it attacks.' },
  stun:   { name: 'Stun',   harmful: true,  color: '#f2c14e', glyph: 'star',   desc: 'Attack timer paused.' },
  chill:  { name: 'Chill',  harmful: true,  color: '#7fd8e8', glyph: 'flake',  desc: '-10% attack speed per stack.' },
  freeze: { name: 'Freeze', harmful: true,  color: '#c9f3ff', glyph: 'ice',    desc: 'Frozen solid: no attacks.' },
  weaken: { name: 'Weaken', harmful: true,  color: '#9a5cc6', glyph: 'down',   desc: 'Deals 25% less damage.' },
  sunder: { name: 'Sunder', harmful: true,  color: '#aeb4c8', glyph: 'crack',  desc: '-3 Def per stack.' },
  shield: { name: 'Shield', harmful: false, color: '#7fd8e8', glyph: 'shield', desc: 'Absorbs damage before HP.' },
  regen:  { name: 'Regen',  harmful: false, color: '#6cc24a', glyph: 'plus',   desc: 'Heals every second.' },
  frenzy: { name: 'Frenzy', harmful: false, color: '#f28bb0', glyph: 'bolt',   desc: '+30% attack speed.' },
};

// ---------------------------------------------------------------- weapons

export const WEAPON_TYPES = {
  dagger: { name: 'Dagger', min: 6,  max: 9,  interval: 0.6, statusMult: 1.5, sig: 'Quick: status chances ×1.5' },
  sword:  { name: 'Sword',  min: 10, max: 15, interval: 1.0, crit: 0.08,      sig: '+8% Crit' },
  spear:  { name: 'Spear',  min: 11, max: 17, interval: 1.1, firstSwing: 0.2, sig: 'Reach: first swing at 0.2s' },
  mace:   { name: 'Mace',   min: 18, max: 26, interval: 1.5, onHit: [{ chance: 0.15, apply: 'stun', duration: 0.8 }], sig: '15% Stun 0.8s' },
  axe:    { name: 'Axe',    min: 24, max: 36, interval: 1.9, onHit: [{ chance: 0.25, apply: 'bleed' }], sig: '25% Bleed' },
  staff:  { name: 'Staff',  min: 8,  max: 12, interval: 1.2, magic: true, onHit: [{ chance: 0.2, apply: 'burn' }], sig: 'Magic, 20% Burn' },
};

// ---------------------------------------------------------------- families & sets

export const FAMILIES = {
  slime:  { name: 'Slime',  status: 'weaken', set: { name: 'Gelheart',   desc: 'Regen 2/s',              regen: 2 } },
  spore:  { name: 'Spore',  status: 'poison', set: { name: 'Sporeborn',  desc: 'Poison max stacks +5',    poisonMax: 5 } },
  boar:   { name: 'Boar',   status: 'bleed',  set: { name: 'Tuskbound',  desc: 'Bleed deals +3',          bleedBonus: 3 } },
  wisp:   { name: 'Wisp',   status: 'chill',  set: { name: 'Rimebound',  desc: 'Freeze at 2 Chill stacks', freezeAt: 2 } },
  golem:  { name: 'Golem',  status: 'stun',   set: { name: 'Bedrock',    desc: '+3 Def, Stun +0.3s',      def: 3, stunBonus: 0.3 } },
  imp:    { name: 'Imp',    status: 'burn',   set: { name: 'Cinderkin',  desc: 'Burn ticks can crit',     burnCrit: true } },
};

// ---------------------------------------------------------------- items
// `look` tells the paper doll how to draw the piece on the hero.

export const ITEMS = {
  // starter kit
  wooden_sword: { name: 'Wooden Sword', slot: 'weapon', type: 'sword', family: null, min: 7, max: 11, interval: 1.0,
    icon: 'sword', ramp: 'wood', flavor: 'Every hero starts somewhere.' },
  linen_shirt: { name: 'Linen Shirt', slot: 'top', family: null, stats: { hp: 10 },
    icon: 'top_tunic', look: { shape: 'tunic', ramp: 'linen', trim: 'leather' }, flavor: 'Smells like home.' },

  // slime
  jelly_sabre: { name: 'Jelly Sabre', slot: 'weapon', type: 'sword', family: 'slime',
    icon: 'sword', ramp: 'jelly', flavor: 'Wobbles, but it cuts.' },
  gel_gloves: { name: 'Gel Gloves', slot: 'gloves', family: 'slime', stats: { atk: 2 },
    icon: 'gloves', look: { ramp: 'jelly' }, flavor: 'Grippy. Very grippy.' },
  slime_cap: { name: 'Slime Cap', slot: 'hat', family: 'slime', stats: { hp: 18, def: 1 },
    icon: 'hat_slime', look: { shape: 'slime', ramp: 'jelly' }, flavor: 'It is still a little bit alive.' },

  // spore
  spore_shiv: { name: 'Spore Shiv', slot: 'weapon', type: 'dagger', family: 'spore',
    icon: 'dagger', ramp: 'spore', onHit: [{ chance: 0.15, apply: 'poison' }], flavor: 'The tip is always damp.' },
  spore_hood: { name: 'Spore Hood', slot: 'hat', family: 'spore', stats: { hp: 12, def: 1, resist: 0.1 },
    icon: 'hat_shroom', look: { shape: 'shroom', ramp: 'shroom', trim: 'cream' }, flavor: 'Polka dots are armor.' },
  spore_boots: { name: 'Spore Boots', slot: 'shoes', family: 'spore', stats: { resist: 0.15 },
    icon: 'boots', look: { ramp: 'shroom', trim: 'cream' }, flavor: 'Soft soles, softer steps.' },

  // boar
  tusk_cleaver: { name: 'Tusk Cleaver', slot: 'weapon', type: 'axe', family: 'boar',
    icon: 'axe', ramp: 'steel', flavor: 'Heavy enough to argue with.' },
  hide_vest: { name: 'Hide Vest', slot: 'top', family: 'boar', stats: { hp: 30, def: 2 },
    icon: 'top_vest', look: { shape: 'vest', ramp: 'hide', trim: 'bone' }, flavor: 'Stitched from a very large grudge.' },
  tusk_gloves: { name: 'Tusk Gloves', slot: 'gloves', family: 'boar', stats: { atk: 1, crit: 0.06 },
    icon: 'gloves_spiked', look: { ramp: 'hide', trim: 'bone' }, flavor: 'Knuckles with opinions.' },

  // wisp
  rime_pike: { name: 'Rime Pike', slot: 'weapon', type: 'spear', family: 'wisp',
    icon: 'spear', ramp: 'ice', flavor: 'Frost gathers on the point.' },
  frost_staff: { name: 'Frost Staff', slot: 'weapon', type: 'staff', family: 'wisp',
    icon: 'staff', ramp: 'ice', onHit: [{ chance: 0.25, apply: 'chill' }], replaceOnHit: true,
    flavor: 'Magic. Chills instead of burns.' },
  wisp_hood: { name: 'Wisp Hood', slot: 'hat', family: 'wisp', stats: { hp: 12, def: 1, haste: 0.05 },
    icon: 'hat_hood', look: { shape: 'hood', ramp: 'frost', trim: 'ice' }, flavor: 'Weightless, and always cold.' },

  // golem
  boulder_maul: { name: 'Boulder Maul', slot: 'weapon', type: 'mace', family: 'golem',
    icon: 'mace', ramp: 'stone', flavor: 'Technically a rock on a stick.' },
  golem_plate: { name: 'Golem Plate', slot: 'top', family: 'golem', stats: { hp: 30, def: 4, haste: -0.05 },
    icon: 'top_plate', look: { shape: 'plate', ramp: 'steel', trim: 'gold' }, flavor: 'Slow. Unbothered.' },
  golem_helm: { name: 'Golem Helm', slot: 'hat', family: 'golem', stats: { hp: 15, def: 3 },
    icon: 'hat_helm', look: { shape: 'helm', ramp: 'steel', trim: 'gold' }, flavor: 'Rings like a bell when hit.' },

  // imp
  cinder_rod: { name: 'Cinder Rod', slot: 'weapon', type: 'staff', family: 'imp',
    icon: 'staff', ramp: 'ember', flavor: 'Warm to the touch. Always.' },
  imp_robe: { name: 'Imp Robe', slot: 'top', family: 'imp', stats: { hp: 20, def: 1, atk: 2 },
    icon: 'top_robe', look: { shape: 'robe', ramp: 'imp', trim: 'gold' }, flavor: 'Singed at the hem, on purpose.' },
  cinder_boots: { name: 'Cinder Boots', slot: 'shoes', family: 'imp', stats: { haste: 0.08 },
    icon: 'boots', look: { ramp: 'imp', trim: 'ember' }, flavor: 'Leave little scorch marks.' },

  // trinkets
  lucky_clover: { name: 'Lucky Clover', slot: 'trinket', family: 'slime', icon: 't_clover',
    stats: { crit: 0.08 }, trigger: { type: 'onCrit' }, effect: { heal: 4 }, desc: 'Crits heal 4.' },
  viper_fang: { name: 'Viper Fang', slot: 'trinket', family: 'spore', icon: 't_fang',
    trigger: { type: 'onHit', chance: 0.3 }, effect: { apply: 'poison', stacks: 1 }, desc: '30% on hit: 1 Poison.' },
  thorn_ring: { name: 'Thorn Ring', slot: 'trinket', family: 'boar', icon: 't_ring',
    trigger: { type: 'onHitTaken' }, effect: { damage: 3 }, desc: 'When hit, deal 3 back.' },
  frost_bell: { name: 'Frost Bell', slot: 'trinket', family: 'wisp', icon: 't_bell',
    trigger: { type: 'battleStart' }, effect: { apply: 'chill', stacks: 2 }, desc: 'Battle start: 2 Chill on foe.' },
  last_stand_locket: { name: 'Last Stand Locket', slot: 'trinket', family: 'golem', icon: 't_locket',
    trigger: { type: 'hpBelow', pct: 0.4 }, effect: { shield: 30, target: 'self' }, desc: 'Below 40% HP, once: 30 Shield.' },
  metronome: { name: 'Metronome', slot: 'trinket', family: 'golem', icon: 't_metronome',
    trigger: { type: 'everyNthHit', n: 3 }, effect: { apply: 'stun', duration: 0.5 }, desc: 'Every 3rd hit: Stun 0.5s.' },
  ember_charm: { name: 'Ember Charm', slot: 'trinket', family: 'imp', icon: 't_charm',
    trigger: { type: 'onHit', chance: 0.15 }, effect: { apply: 'burn' }, desc: '15% on hit: Burn.' },
  hourglass: { name: 'Hourglass', slot: 'trinket', family: 'imp', icon: 't_hourglass',
    trigger: { type: 'battleStart' }, effect: { apply: 'frenzy', duration: 5, target: 'self' }, desc: 'Battle start: Frenzy 5s.' },
  whetstone: { name: 'Whetstone', slot: 'trinket', family: 'imp', icon: 't_whetstone',
    trigger: { type: 'onCrit' }, effect: { apply: 'sunder' }, desc: 'On crit: Sunder.' },
  vampire_tooth: { name: 'Vampire Tooth', slot: 'trinket', family: null, icon: 't_tooth',
    stats: { lifesteal: 0.06 }, desc: '+6% Lifesteal.' },

  // ---- shop stock: sold before each duel, never dropped by monsters
  iron_sword: { name: 'Iron Sword', slot: 'weapon', type: 'sword', family: null, shop: true, min: 11, max: 16,
    icon: 'sword', ramp: 'steel', flavor: 'Plain, sharp, dependable.' },
  twin_fang: { name: 'Twin Fang', slot: 'weapon', type: 'dagger', family: null, shop: true,
    icon: 'dagger', ramp: 'bone', stats: { crit: 0.05 }, flavor: 'Two edges, no manners.' },
  oak_staff: { name: 'Oak Staff', slot: 'weapon', type: 'staff', family: null, shop: true, min: 9, max: 13,
    icon: 'staff', ramp: 'gold', flavor: 'The orb hums when it is happy.' },
  leather_cap: { name: 'Leather Cap', slot: 'hat', family: null, shop: true, stats: { hp: 14, def: 1, resist: 0.05 },
    icon: 'hat_helm', look: { shape: 'helm', ramp: 'leather', trim: 'bone' }, flavor: 'Smells of the road.' },
  chain_mail: { name: 'Chain Mail', slot: 'top', family: null, shop: true, stats: { hp: 26, def: 3 },
    icon: 'top_plate', look: { shape: 'tunic', ramp: 'steel', trim: 'leather' }, flavor: 'Rings like rain when you run.' },
  brawler_wraps: { name: 'Brawler Wraps', slot: 'gloves', family: null, shop: true, stats: { atk: 3 },
    icon: 'gloves', look: { ramp: 'linen', trim: 'leather' }, flavor: 'Knuckles first.' },
  swift_boots: { name: 'Swift Boots', slot: 'shoes', family: null, shop: true, stats: { haste: 0.1 },
    icon: 'boots', look: { ramp: 'frost', trim: 'gold' }, flavor: 'Barely touch the ground.' },
  guard_charm: { name: 'Guard Charm', slot: 'trinket', family: null, shop: true, icon: 't_guard',
    trigger: { type: 'battleStart' }, effect: { shield: 20, target: 'self' }, desc: 'Battle start: 20 Shield.' },
  berserker_band: { name: 'Berserker Band', slot: 'trinket', family: null, shop: true, icon: 't_band',
    trigger: { type: 'hpBelow', pct: 0.5 }, effect: { apply: 'frenzy', duration: 6, target: 'self' }, desc: 'Below 50% HP, once: Frenzy 6s.' },
  iron_heart: { name: 'Iron Heart', slot: 'trinket', family: null, shop: true, icon: 't_heart',
    stats: { hp: 25 }, desc: 'A second, sturdier heartbeat.' },
  mending_pendant: { name: 'Mending Pendant', slot: 'trinket', family: null, shop: true, icon: 't_pendant',
    trigger: { type: 'everySeconds', s: 4 }, effect: { heal: 6 }, desc: 'Every 4s: heal 6.' },
};
for (const [id, it] of Object.entries(ITEMS)) it.id = id;

export const SLOTS = ['hat', 'top', 'weapon', 'gloves', 'shoes', 'trinket1', 'trinket2'];
export const slotKind = (slot) => (slot.startsWith('trinket') ? 'trinket' : slot);
export const SLOT_LABEL = { hat: 'Hat', top: 'Top', weapon: 'Weapon', gloves: 'Gloves', shoes: 'Shoes', trinket1: 'Trinket', trinket2: 'Trinket' };

// Scroll "main stat" per slot kind.
export const MAIN_STAT = {
  weapon: { stat: 'dmg', per: 1, label: 'Damage' },
  hat: { stat: 'def', per: 1, label: 'Def' },
  top: { stat: 'def', per: 1, label: 'Def' },
  gloves: { stat: 'atk', per: 1, label: 'Atk' },
  shoes: { stat: 'haste', per: 0.02, label: 'Haste' },
  trinket: { stat: 'hp', per: 4, label: 'HP' },
};

// ---------------------------------------------------------------- mobs

export const MOBS = {
  green_slime: { name: 'Green Slime', tier: 'easy', family: 'slime', sprite: 'slime',
    hp: 60, min: 4, max: 6, interval: 1.0, def: 0, regen: 2, trait: 'Regen 2/s',
    drops: ['jelly_sabre', 'gel_gloves', 'slime_cap', 'lucky_clover'] },
  spore_cap: { name: 'Spore Cap', tier: 'easy', family: 'spore', sprite: 'shroom',
    hp: 55, min: 3, max: 5, interval: 0.9, def: 0, onHit: [{ chance: 0.25, apply: 'poison' }], trait: '25% Poison',
    drops: ['spore_shiv', 'spore_hood', 'spore_boots', 'viper_fang'] },
  tusk_boar: { name: 'Tusk Boar', tier: 'normal', family: 'boar', sprite: 'boar',
    hp: 110, min: 9, max: 13, interval: 1.4, def: 0, onHit: [{ chance: 0.25, apply: 'bleed' }], trait: '25% Bleed',
    drops: ['tusk_cleaver', 'hide_vest', 'tusk_gloves', 'thorn_ring'] },
  frost_wisp: { name: 'Frost Wisp', tier: 'normal', family: 'wisp', sprite: 'wisp',
    hp: 90, min: 7, max: 10, interval: 1.0, def: 0, magic: true, onHit: [{ chance: 0.3, apply: 'chill' }], trait: 'Magic, 30% Chill',
    drops: ['rime_pike', 'frost_staff', 'wisp_hood', 'frost_bell'] },
  stone_golem: { name: 'Stone Golem', tier: 'elite', family: 'golem', sprite: 'golem',
    hp: 170, min: 14, max: 20, interval: 2.0, def: 4, onHit: [{ chance: 0.15, apply: 'stun', duration: 0.8 }], trait: 'Def 4, 15% Stun',
    drops: ['boulder_maul', 'golem_plate', 'golem_helm', 'last_stand_locket', 'metronome'] },
  cinder_imp: { name: 'Cinder Imp', tier: 'elite', family: 'imp', sprite: 'imp',
    hp: 110, min: 6, max: 9, interval: 0.8, def: 0, onHit: [{ chance: 0.2, apply: 'burn' }], trait: '20% Burn',
    drops: ['cinder_rod', 'imp_robe', 'cinder_boots', 'ember_charm', 'hourglass', 'whetstone'] },
};
for (const [id, m] of Object.entries(MOBS)) m.id = id;

export const TIERS = {
  easy: { name: 'Easy', mobs: ['green_slime', 'spore_cap'] },
  normal: { name: 'Normal', mobs: ['tusk_boar', 'frost_wisp'] },
  elite: { name: 'Elite', mobs: ['stone_golem', 'cinder_imp'] },
};

// ---------------------------------------------------------------- rarity & scrolls

export const RARITIES = {
  common: { name: 'Common', affixes: 0, scrap: 1, next: 'rare' },
  rare: { name: 'Rare', affixes: 1, scrap: 3, next: 'epic' },
  epic: { name: 'Epic', affixes: 2, scrap: 6, next: 'epic' },
};
export const RARITY_ODDS = {
  easy: [['common', 80], ['rare', 18], ['epic', 2]],
  normal: [['common', 55], ['rare', 38], ['epic', 7]],
  elite: [['common', 30], ['rare', 50], ['epic', 20]],
};
// Base affix values before round scaling.
export const AFFIXES = {
  atk: { label: 'Atk', value: 2 },
  hp: { label: 'HP', value: 15 },
  crit: { label: 'Crit', value: 0.05 },
  haste: { label: 'Haste', value: 0.06 },
  resist: { label: 'Resist', value: 0.1 },
  status: { label: 'on hit', value: 0.05 },
};

export const SCROLLS = {
  sure: { name: 'Sure Scroll', chance: 1.0, bonus: 1, cost: 2 },
  chancy: { name: 'Chancy Scroll', chance: 0.6, bonus: 3, cost: 3 },
  longshot: { name: 'Long-shot Scroll', chance: 0.1, bonus: 8, cost: 4, glow: true },
};
export const UPGRADE_SLOTS = 3;

// The shop opens before every duel round. Four wares from its own stock,
// with rarity odds that improve as the run goes on.
export const SHOP_SIZE = 4;
export const SHOP_PRICE = { common: 4, rare: 7, epic: 11 };
export const shopTier = (round) => (round <= 3 ? 'easy' : round <= 6 ? 'normal' : 'elite');

// ---------------------------------------------------------------- ghosts
// Hand-written opponents, three per duel round. Each is a saved build as the
// server would store it: the look plus rolled item instances.

const g = (item, rarity = 'common', affixes = [], bonus = 0, used = 0) =>
  ({ item, rarity, affixes, upgrades: { used, bonus } });

export const GHOSTS = [
  // round 3: starter kit plus two drops
  { id: 'mossbell', name: 'Mossbell', record: '2-0', round: 3, archetype: 'Poison dagger',
    look: { gender: 'girl', hair: 'twintails', hairColor: 'mint', skin: 'light', eyes: 'green' },
    equip: { weapon: g('spore_shiv'), top: g('linen_shirt'), trinket1: g('viper_fang') } },
  { id: 'brickley', name: 'Brickley', record: '1-1', round: 3, archetype: 'Tank',
    look: { gender: 'boy', hair: 'crop', hairColor: 'chestnut', skin: 'tan', eyes: 'brown' },
    equip: { weapon: g('wooden_sword'), top: g('hide_vest'), hat: g('slime_cap') } },
  { id: 'pip', name: 'Pip', record: '2-0', round: 3, archetype: 'Crit sword',
    look: { gender: 'boy', hair: 'spiky', hairColor: 'blond', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('jelly_sabre'), top: g('linen_shirt'), trinket1: g('lucky_clover') } },

  // round 6: five drops, a rare or two
  { id: 'ashvane', name: 'Ashvane', record: '4-1', round: 6, archetype: 'Burn staff',
    look: { gender: 'girl', hair: 'long', hairColor: 'crimson', skin: 'light', eyes: 'amber' },
    equip: { weapon: g('cinder_rod', 'rare', [{ stat: 'status', value: 0.05 }]), top: g('imp_robe'), shoes: g('cinder_boots'),
      hat: g('wisp_hood'), trinket1: g('ember_charm') } },
  { id: 'tuskra', name: 'Tuskra', record: '3-2', round: 6, archetype: 'Bleed axe',
    look: { gender: 'girl', hair: 'bob', hairColor: 'midnight', skin: 'deep', eyes: 'amber' },
    equip: { weapon: g('tusk_cleaver'), top: g('hide_vest'), gloves: g('tusk_gloves'),
      hat: g('slime_cap'), trinket1: g('thorn_ring') } },
  { id: 'rimeheart', name: 'Rimeheart', record: '4-1', round: 6, archetype: 'Chill spear',
    look: { gender: 'boy', hair: 'swept', hairColor: 'silver', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('rime_pike', 'rare', [{ stat: 'status', value: 0.05 }]), hat: g('wisp_hood'),
      shoes: g('spore_boots'), top: g('linen_shirt'), trinket1: g('frost_bell') } },

  // round 9: full kit, some upgrades
  { id: 'old_granite', name: 'Old Granite', record: '6-2', round: 9, archetype: 'Mace tank',
    look: { gender: 'boy', hair: 'crop', hairColor: 'ash', skin: 'deep', eyes: 'brown' },
    equip: { weapon: g('boulder_maul', 'rare', [{ stat: 'hp', value: 15 }]), top: g('golem_plate'),
      hat: g('golem_helm', 'rare', [{ stat: 'resist', value: 0.1 }]), shoes: g('spore_boots'),
      trinket1: g('last_stand_locket'), trinket2: g('metronome') } },
  { id: 'nightshade', name: 'Nightshade', record: '7-1', round: 9, archetype: 'Poison dagger',
    look: { gender: 'girl', hair: 'long', hairColor: 'lavender', skin: 'tan', eyes: 'violet' },
    equip: { weapon: g('spore_shiv', 'epic', [{ stat: 'status', value: 0.05 }, { stat: 'haste', value: 0.06 }], 1, 1),
      hat: g('spore_hood'), shoes: g('cinder_boots'), top: g('hide_vest'),
      trinket1: g('viper_fang'), trinket2: g('whetstone') } },
  { id: 'solenne', name: 'Solenne', record: '6-2', round: 9, archetype: 'Crit sword',
    look: { gender: 'girl', hair: 'ponytail', hairColor: 'blond', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('jelly_sabre', 'rare', [{ stat: 'crit', value: 0.05 }], 3, 1),
      gloves: g('tusk_gloves'), top: g('imp_robe'), hat: g('slime_cap'),
      trinket1: g('lucky_clover'), trinket2: g('vampire_tooth') } },
];
