// All game content lives here as plain data. Adding an item, trinket or mob
// is one entry; the sim, the art and the UI read from these tables.

export const BASE = { hp: 120, atk: 0, def: 0, crit: 0.05, haste: 0, lifesteal: 0, resist: 0 };
export const RESIST_CAP = 0.5;
export const BAG_SIZE = 6;
export const LIVES = 3;
// A run is 5 days. Each day is three hunts and then a duel against another
// player's build; the monsters get tougher, and stranger, every day.
export const DAYS_IN_RUN = 5;
export const ROUNDS_PER_DAY = 4;
export const ROUNDS = DAYS_IN_RUN * ROUNDS_PER_DAY;
export const DUEL_ROUNDS = Array.from({ length: DAYS_IN_RUN }, (_, i) => (i + 1) * ROUNDS_PER_DAY);
export const dayOf = (round) => Math.ceil(round / ROUNDS_PER_DAY);
// 1-based position inside the day: 1..3 are hunts, 4 is the duel.
export const slotOf = (round) => ((round - 1) % ROUNDS_PER_DAY) + 1;

// Numbers grow +36% a day, spread evenly across the day's rounds, so each
// day's duel sits at the same strength however many hunts come before it.
export const scaleFor = (round) => 1 + 0.36 * (dayOf(round) - 1) + 0.08 * (slotOf(round) - 1);

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
  shock:  { name: 'Shock',  harmful: true,  color: '#ffe066', glyph: 'spark',  desc: 'Each hit taken deals +2 per stack. Max 5.' },
  stasis: { name: 'Gilded', harmful: false, color: '#ffd36b', glyph: 'hourglass', desc: 'Turned to gold: immune to all damage, but can\'t act.' },
  hex:    { name: 'Hex',    harmful: true,  color: '#c07cff', glyph: 'eye',    desc: 'Healing received is halved.' },
};

// What each stat means, for the help sheet and hover cards.
export const STAT_HELP = {
  DPS: 'Damage per second.',
  EHP: 'HP counting Def.',
  HP: 'Health.',
  Atk: '+damage per hit.',
  Def: '−damage per hit. Magic ignores half.',
  Crit: 'Chance to hit harder.',
  Haste: 'Attack speed.',
  Res: 'Shorter debuffs (max 50%).',
  Steal: 'Heal from damage dealt.',
  Regen: 'HP per second.',
  Evade: 'Dodge chance (max 40%).',
  'Crit dmg': 'Extra crit damage (base +50%).',
  Thorns: 'Hurts attackers.',
  Pierce: 'Ignores enemy Def.',
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

  // day 2: Tidal Shore
  coral:  { name: 'Coral',  status: 'sunder', set: { name: 'Reefguard',   desc: '+2 Def, +3 Thorns',               stats: { def: 2, thorns: 3 } } },
  eel:    { name: 'Eel',    status: 'shock',  set: { name: 'Stormscale',  desc: 'Shock max stacks +3, +8% Haste',  stats: { haste: 0.08 }, flags: { shockMax: 3 } } },
  pearl:  { name: 'Pearl',  status: 'weaken', set: { name: 'Pearlescent', desc: 'Battle start: 15 Shield',
    trigger: { type: 'battleStart' }, effect: { shield: 15, target: 'self' } } },
  // day 3: Clockwork Ruins
  cog:    { name: 'Cog',    status: 'stun',   set: { name: 'Mainspring',  desc: '+10% Haste, first swing at 0.3s', stats: { haste: 0.1 }, firstSwing: 0.3 } },
  rust:   { name: 'Rust',   status: 'sunder', set: { name: 'Corrosion',   desc: 'Sunder max stacks +2, Pierce 2',  stats: { pen: 2 }, flags: { sunderMax: 2 } } },
  spark:  { name: 'Spark',  status: 'shock',  set: { name: 'Overcharge',  desc: '+20% damage vs Shocked',          mods: { vs: { shock: 0.2 } } } },
  // day 4: Haunted Moor
  bone:   { name: 'Bone',   status: 'bleed',  set: { name: 'Ossuary',     desc: '+40% crit damage',                stats: { critDmg: 0.4 } } },
  stasis: { name: 'Gilded', harmful: false, color: '#ffd36b', glyph: 'hourglass', desc: 'Turned to gold: immune to all damage, but can\'t act.' },
  hex:    { name: 'Hex',    status: 'hex',    set: { name: 'Witchmark',   desc: 'Hexed foes take +15% damage',     flags: { hexAmp: 0.15 } } },
  shade:  { name: 'Shade',  status: 'weaken', set: { name: 'Umbral',      desc: '+8% Evasion; after a dodge, your next hit crits', stats: { evasion: 0.08 }, flags: { dodgeCrit: true } } },
  // day 5: Dragon Peak
  drake:  { name: 'Drake',  status: 'burn',   set: { name: 'Dragonblood', desc: '+8% Lifesteal, +20% damage vs Burning', stats: { lifesteal: 0.08 }, mods: { vs: { burn: 0.2 } } } },
  storm:  { name: 'Storm',  status: 'shock',  set: { name: 'Tempest',     desc: 'Battle start: Frenzy 4s; +8% Haste', stats: { haste: 0.08 },
    trigger: { type: 'battleStart' }, effect: { apply: 'frenzy', duration: 4, target: 'self' } } },
  crystal: { name: 'Crystal', status: 'chill', set: { name: 'Prism',       desc: 'Pierce 4, +10% Resist',           stats: { pen: 4, resist: 0.1 } } },
  // Sunscorch Desert
  sand:   { name: 'Sand',   status: 'weaken', set: { name: 'Duneskin',    desc: '+10% Evasion, +5% Crit',          stats: { evasion: 0.1, crit: 0.05 } } },
  scarab: { name: 'Scarab', status: 'poison', set: { name: 'Carapace',    desc: '+3 Def, +2 Thorns',               stats: { def: 3, thorns: 2 } } },
  // Barberry Orchard
  berry:  { name: 'Berry',  status: 'bleed',  set: { name: 'Barbed',      desc: '+4 Thorns, +5% Lifesteal',        stats: { thorns: 4, lifesteal: 0.05 } } },
  bee:    { name: 'Bee',    status: 'poison', set: { name: 'Hivemind',    desc: '+12% Haste',                      stats: { haste: 0.12 } } },
  // Frostfang Glacier
  yeti:   { name: 'Yeti',   status: 'stun',   set: { name: 'Yetiblood',   desc: '+25 HP, +2 Def',                  stats: { hp: 25, def: 2 } } },
  rime:   { name: 'Rime',   status: 'chill',  set: { name: 'Hoarfrost',   desc: '+20% damage vs Chilled',          mods: { vs: { chill: 0.2 } } } },
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

  // ================================================================ day 2: Tidal Shore
  // coral: armour that bites back
  coral_trident: { name: 'Coral Trident', slot: 'weapon', type: 'spear', family: 'coral', min: 12, max: 18,
    icon: 'spear', ramp: 'coral', onHit: [{ chance: 0.2, apply: 'sunder' }], flavor: 'Three points, all of them rude.' },
  crusher_claw: { name: 'Crusher Claw', slot: 'weapon', type: 'mace', family: 'coral',
    icon: 'mace', ramp: 'coral', onHit: [{ chance: 0.25, apply: 'sunder' }], flavor: 'Pried off a very large crab. It was not happy.' },
  shell_helm: { name: 'Shell Helm', slot: 'hat', family: 'coral', stats: { hp: 16, def: 2, thorns: 1 },
    icon: 'hat_shell', look: { shape: 'shell', ramp: 'coral', trim: 'pearl' }, flavor: 'Still smells of the sea.' },
  reef_mail: { name: 'Reef Mail', slot: 'top', family: 'coral', stats: { hp: 26, def: 3, thorns: 1 },
    icon: 'top_scale', look: { shape: 'scale', ramp: 'coral', trim: 'sea' }, flavor: 'Grown, not forged.' },
  barnacle_ring: { name: 'Barnacle Ring', slot: 'trinket', family: 'coral', icon: 't_barnacle',
    trigger: { type: 'onHitTaken', chance: 0.3 }, effect: { apply: 'sunder' }, desc: 'When hit, 30%: Sunder the attacker.' },
  // eel: stack Shock, hit often
  eelfang_dirk: { name: 'Eelfang Dirk', slot: 'weapon', type: 'dagger', family: 'eel',
    icon: 'dagger', ramp: 'sea', onHit: [{ chance: 0.2, apply: 'shock' }], flavor: 'It tingles. Then it hurts.' },
  tidecaller_gloves: { name: 'Tidecaller Gloves', slot: 'gloves', family: 'eel', stats: { atk: 1, haste: 0.05 },
    onHit: [{ chance: 0.1, apply: 'shock' }], icon: 'gloves', look: { ramp: 'sea', trim: 'pearl' }, flavor: 'Always slightly damp.' },
  current_boots: { name: 'Current Boots', slot: 'shoes', family: 'eel', stats: { haste: 0.1, evasion: 0.04 },
    icon: 'boots', look: { ramp: 'sea', trim: 'pearl' }, flavor: 'Go with the flow.' },
  static_charm: { name: 'Static Charm', slot: 'trinket', family: 'eel', icon: 't_static',
    trigger: { type: 'everyNthHit', n: 3 }, effect: { apply: 'shock', stacks: 2 }, desc: 'Every 3rd hit: 2 Shock.' },
  // pearl: shields, weaken, second winds
  pearl_scepter: { name: 'Pearl Scepter', slot: 'weapon', type: 'staff', family: 'pearl',
    icon: 'staff', ramp: 'pearl', onHit: [{ chance: 0.25, apply: 'weaken' }], replaceOnHit: true, flavor: 'Magic. Its glow saps the will to fight.' },
  siren_veil: { name: 'Siren Veil', slot: 'hat', family: 'pearl', stats: { hp: 12, resist: 0.12, evasion: 0.05 },
    icon: 'hat_hood', look: { shape: 'hood', ramp: 'pearl', trim: 'sea' }, flavor: 'Hums a tune only you can hear.' },
  nacre_robe: { name: 'Nacre Robe', slot: 'top', family: 'pearl', stats: { hp: 22, def: 1 },
    trigger: { type: 'everySeconds', s: 5 }, effect: { shield: 8, target: 'self' },
    icon: 'top_robe', look: { shape: 'robe', ramp: 'pearl', trim: 'sea' }, desc: 'Every 5s: 8 Shield.', flavor: 'Shimmers like the inside of a shell.' },
  tear_of_the_deep: { name: 'Tear of the Deep', slot: 'trinket', family: 'pearl', icon: 't_tear',
    trigger: { type: 'hpBelow', pct: 0.35 }, effect: { heal: 25, cleanse: true }, desc: 'Below 35% HP, once: heal 25 and cleanse.' },
  siren_song: { name: "Siren's Song", slot: 'trinket', family: 'pearl', icon: 't_shell',
    trigger: { type: 'everySeconds', s: 4 }, effect: { apply: 'weaken' }, desc: 'Every 4s: Weaken the foe.' },

  // ================================================================ day 3: Clockwork Ruins
  // cog: speed and stuns
  gearbreaker: { name: 'Gearbreaker', slot: 'weapon', type: 'mace', family: 'cog', stats: { haste: 0.05 },
    icon: 'mace', ramp: 'brass', flavor: 'Tick. Tick. THUD.' },
  tinker_goggles: { name: 'Tinker Goggles', slot: 'hat', family: 'cog', stats: { hp: 14, def: 1, crit: 0.06 },
    icon: 'hat_goggles', look: { shape: 'goggles', ramp: 'brass', trim: 'leather' }, flavor: 'See the weak spots. Zoom in on them.' },
  spring_boots: { name: 'Spring Boots', slot: 'shoes', family: 'cog', stats: { haste: 0.12 },
    icon: 'boots', look: { ramp: 'brass', trim: 'steel' }, flavor: 'Boing, professionally.' },
  chronometer: { name: 'Chronometer', slot: 'trinket', family: 'cog', icon: 't_chrono',
    trigger: { type: 'everyNthHit', n: 4 }, effect: { apply: 'frenzy', duration: 2, target: 'self' }, desc: 'Every 4th hit: Frenzy 2s.' },
  // rust: break armour, then punish it
  rust_cleaver: { name: 'Rust Cleaver', slot: 'weapon', type: 'axe', family: 'rust',
    icon: 'axe', ramp: 'rust', onHit: [{ chance: 0.2, apply: 'sunder' }], flavor: 'Tetanus is a feature.' },
  rust_plate: { name: 'Rust Plate', slot: 'top', family: 'rust', stats: { hp: 32, def: 4, haste: -0.05 },
    icon: 'top_plate', look: { shape: 'plate', ramp: 'rust', trim: 'brass' }, flavor: 'Held together by stubbornness.' },
  oil_gauntlets: { name: 'Oil Gauntlets', slot: 'gloves', family: 'rust', stats: { atk: 2, pen: 2 },
    icon: 'gloves_spiked', look: { ramp: 'rust', trim: 'steel' }, flavor: 'Slips right between the plates.' },
  corroder_lens: { name: "Corroder's Lens", slot: 'trinket', family: 'rust', icon: 't_lens',
    mods: { vs: { sunder: 0.2 } }, desc: '+20% damage vs Sundered foes.' },
  titan_core: { name: 'Titan Core', slot: 'trinket', family: 'rust', icon: 't_core',
    stats: { hp: 20, def: 3, haste: -0.08 }, desc: 'Heavy. Very heavy.' },
  // spark: Shock that pays off
  arc_rod: { name: 'Arc Rod', slot: 'weapon', type: 'staff', family: 'spark',
    icon: 'staff', ramp: 'spark', onHit: [{ chance: 0.25, apply: 'shock' }], replaceOnHit: true, flavor: 'Magic. Crackles when you smile.' },
  lightning_rod: { name: 'Lightning Rod', slot: 'weapon', type: 'spear', family: 'spark',
    icon: 'spear', ramp: 'spark', onHit: [{ chance: 0.3, apply: 'shock' }], flavor: 'Hold it up in a storm. Or don\'t.' },
  coil_helm: { name: 'Coil Helm', slot: 'hat', family: 'spark', stats: { hp: 12, resist: 0.1 },
    onHit: [{ chance: 0.1, apply: 'shock' }], icon: 'hat_goggles', look: { shape: 'goggles', ramp: 'spark', trim: 'steel' }, flavor: 'Hair stands on end. All of it.' },
  dynamo_gloves: { name: 'Dynamo Gloves', slot: 'gloves', family: 'spark', stats: { haste: 0.06, crit: 0.04 },
    icon: 'gloves', look: { ramp: 'spark', trim: 'steel' }, flavor: 'Faster with every punch.' },
  leyden_jar: { name: 'Leyden Jar', slot: 'trinket', family: 'spark', icon: 't_jar',
    trigger: { type: 'everySeconds', s: 3 }, effect: { damagePerStack: { status: 'shock', per: 3 } }, desc: 'Every 3s: zap for 3 per Shock on the foe.' },

  // ================================================================ day 4: Haunted Moor
  // bone: crits that land like a coffin lid
  bonecarver: { name: 'Bonecarver', slot: 'weapon', type: 'sword', family: 'bone', stats: { critDmg: 0.15 },
    icon: 'sword', ramp: 'bone', onHit: [{ chance: 0.15, apply: 'bleed' }], flavor: 'Carved from something that disagreed.' },
  executioner: { name: "Executioner's Axe", slot: 'weapon', type: 'axe', family: 'bone', mods: { execute: { below: 0.3, pct: 0.5 } },
    icon: 'axe', ramp: 'shade', flavor: 'Finishes what others start.' },
  skull_helm: { name: 'Skull Helm', slot: 'hat', family: 'bone', stats: { hp: 18, def: 2, crit: 0.04 },
    icon: 'hat_horned', look: { shape: 'horned', ramp: 'bone', trim: 'shade' }, flavor: 'Someone else\'s, originally.' },
  ribcage_plate: { name: 'Ribcage Plate', slot: 'top', family: 'bone', stats: { hp: 28, def: 3, critDmg: 0.15 },
    icon: 'top_plate', look: { shape: 'plate', ramp: 'bone', trim: 'shade' }, flavor: 'Rattles when you breathe.' },
  knucklebones: { name: 'Knucklebones', slot: 'trinket', family: 'bone', icon: 't_dice',
    stats: { crit: 0.1, critDmg: 0.2 }, desc: 'Loaded in your favour.' },
  // hex: shut down healing, rot them out
  blightwood_staff: { name: 'Blightwood Staff', slot: 'weapon', type: 'staff', family: 'hex',
    icon: 'staff', ramp: 'witch', onHit: [{ chance: 0.25, apply: 'hex' }, { chance: 0.15, apply: 'poison' }], replaceOnHit: true,
    flavor: 'Magic. The wood is still growing.' },
  witch_hat: { name: 'Witch Hat', slot: 'hat', family: 'hex', stats: { hp: 12, resist: 0.1, atk: 1 },
    icon: 'hat_witch', look: { shape: 'witch', ramp: 'witch', trim: 'gold' }, flavor: 'Pointy for a reason.' },
  cauldron_robe: { name: 'Cauldron Robe', slot: 'top', family: 'hex', stats: { hp: 24, def: 1 },
    trigger: { type: 'everySeconds', s: 4 }, effect: { apply: 'poison', stacks: 2 },
    icon: 'top_robe', look: { shape: 'robe', ramp: 'witch', trim: 'jelly' }, desc: 'Every 4s: 2 Poison on the foe.', flavor: 'Bubbles quietly.' },
  cursed_doll: { name: 'Cursed Doll', slot: 'trinket', family: 'hex', icon: 't_doll',
    trigger: { type: 'onHit', chance: 0.3 }, effect: { apply: 'hex' }, desc: '30% on hit: Hex (halves their healing).' },
  grave_lantern: { name: 'Grave Lantern', slot: 'trinket', family: 'hex', icon: 't_lantern',
    trigger: { type: 'everySeconds', s: 6 }, effect: { apply: 'hex', heal: 6 }, desc: 'Every 6s: Hex the foe, heal 6.' },
  // shade: be elsewhere, then strike
  nightfang: { name: 'Nightfang', slot: 'weapon', type: 'dagger', family: 'shade', stats: { evasion: 0.05 },
    icon: 'dagger', ramp: 'shade', onHit: [{ chance: 0.15, apply: 'weaken' }], flavor: 'You never see it coming. Neither do they.' },
  shadow_cloak: { name: 'Shadow Cloak', slot: 'top', family: 'shade', stats: { hp: 18, evasion: 0.1 },
    icon: 'top_cloak', look: { shape: 'cloak', ramp: 'shade', trim: 'witch' }, flavor: 'Mostly made of dark.' },
  whisper_boots: { name: 'Whisper Boots', slot: 'shoes', family: 'shade', stats: { haste: 0.06, evasion: 0.06 },
    icon: 'boots', look: { ramp: 'shade', trim: 'witch' }, flavor: 'Not a sound.' },
  mirror_shard: { name: 'Mirror Shard', slot: 'trinket', family: 'shade', icon: 't_mirror',
    trigger: { type: 'onDodge' }, effect: { damage: 10 }, desc: 'When you dodge, strike back for 10.' },

  // ================================================================ day 5: Dragon Peak
  // drake: burn, drain, burst
  emberbrand: { name: 'Emberbrand', slot: 'weapon', type: 'sword', family: 'drake', min: 12, max: 17,
    icon: 'sword', ramp: 'drake', onHit: [{ chance: 0.2, apply: 'burn' }], flavor: 'Forged in a dragon\'s sneeze.' },
  drake_helm: { name: 'Drake Helm', slot: 'hat', family: 'drake', stats: { hp: 22, def: 3 },
    icon: 'hat_horned', look: { shape: 'horned', ramp: 'drake', trim: 'gold' }, flavor: 'The horns are real.' },
  scale_mail: { name: 'Dragonscale Mail', slot: 'top', family: 'drake', stats: { hp: 34, def: 4 },
    icon: 'top_scale', look: { shape: 'scale', ramp: 'drake', trim: 'gold' }, flavor: 'Each scale was a lost argument.' },
  wyrm_heart: { name: 'Wyrm Heart', slot: 'trinket', family: 'drake', icon: 't_wyrm',
    stats: { lifesteal: 0.06, hp: 20 }, desc: 'Still warm.' },
  dragonfire_pact: { name: 'Dragonfire Pact', slot: 'trinket', family: 'drake', icon: 't_pact',
    trigger: { type: 'onHit', chance: 0.2 }, effect: { detonate: 'burn' }, desc: '20% on hit: burst all Burn left on the foe.' },
  // storm: fast, shocking
  stormpiercer: { name: 'Stormpiercer', slot: 'weapon', type: 'spear', family: 'storm',
    icon: 'spear', ramp: 'storm', onHit: [{ chance: 0.25, apply: 'shock' }], flavor: 'Arrives before the thunder.' },
  gale_boots: { name: 'Gale Boots', slot: 'shoes', family: 'storm', stats: { haste: 0.14, evasion: 0.05 },
    icon: 'boots', look: { ramp: 'storm', trim: 'pearl' }, flavor: 'Walk on the wind. Mind the landing.' },
  storm_gauntlets: { name: 'Storm Gauntlets', slot: 'gloves', family: 'storm', stats: { atk: 2, haste: 0.06 },
    icon: 'gloves_spiked', look: { ramp: 'storm', trim: 'spark' }, flavor: 'Knuckles like lightning.' },
  thunderhead_totem: { name: 'Thunderhead Totem', slot: 'trinket', family: 'storm', icon: 't_totem',
    trigger: { type: 'everyNthHit', n: 3 }, effect: { damagePerStack: { status: 'shock', per: 5 } }, desc: 'Every 3rd hit: thunder for 5 per Shock on the foe.' },
  // crystal: reflect and pierce
  prism_rod: { name: 'Prism Rod', slot: 'weapon', type: 'staff', family: 'crystal',
    icon: 'staff', ramp: 'crystal', onHit: [{ chance: 0.2, apply: 'chill' }], replaceOnHit: true, flavor: 'Magic. Splits light, and people.' },
  prism_lance: { name: 'Prism Lance', slot: 'weapon', type: 'spear', family: 'crystal', stats: { pen: 4 },
    icon: 'spear', ramp: 'crystal', onHit: [{ chance: 0.2, apply: 'chill' }], flavor: 'Goes through armour like it isn\'t there.' },
  crystal_crown: { name: 'Crystal Crown', slot: 'hat', family: 'crystal', stats: { hp: 16, resist: 0.12, crit: 0.05 },
    icon: 'hat_crown', look: { shape: 'crown', ramp: 'crystal', trim: 'gold' }, flavor: 'Heavy is the head. Sparkly, though.' },
  geode_plate: { name: 'Geode Plate', slot: 'top', family: 'crystal', stats: { hp: 30, def: 4, resist: 0.08 },
    icon: 'top_plate', look: { shape: 'plate', ramp: 'crystal', trim: 'steel' }, flavor: 'Rough outside, dazzling within.' },
  refraction_gem: { name: 'Refraction Gem', slot: 'trinket', family: 'crystal', icon: 't_gem',
    stats: { thorns: 4, resist: 0.1 }, desc: 'Sends part of every blow back.' },

  // ================================================================ Sunscorch Desert
  // sand: dodge, weaken, crit
  dune_scimitar: { name: 'Dune Scimitar', slot: 'weapon', type: 'sword', family: 'sand', stats: { evasion: 0.04 },
    icon: 'sword', ramp: 'sand', onHit: [{ chance: 0.15, apply: 'weaken' }], flavor: 'Curved like the wind made it.' },
  nomad_wrap: { name: 'Nomad Wrap', slot: 'hat', family: 'sand', stats: { hp: 14, evasion: 0.06 },
    icon: 'hat_hood', look: { shape: 'hood', ramp: 'sand', trim: 'scarab' }, flavor: 'Keeps the sand out. Mostly.' },
  sandstrider_boots: { name: 'Sandstrider Boots', slot: 'shoes', family: 'sand', stats: { haste: 0.08, evasion: 0.06 },
    icon: 'boots', look: { ramp: 'sand', trim: 'leather' }, flavor: 'Never sink, never stop.' },
  mirage_charm: { name: 'Mirage Charm', slot: 'trinket', family: 'sand', icon: 't_mirage',
    trigger: { type: 'onDodge' }, effect: { apply: 'weaken' }, desc: 'After a dodge: Weaken the foe.' },
  // scarab: armour, thorns, poison
  stinger_dirk: { name: 'Stinger Dirk', slot: 'weapon', type: 'dagger', family: 'scarab',
    icon: 'dagger', ramp: 'scarab', onHit: [{ chance: 0.25, apply: 'poison' }], flavor: 'Borrowed from a scorpion. Not returned.' },
  carapace_mail: { name: 'Carapace Mail', slot: 'top', family: 'scarab', stats: { hp: 28, def: 4, thorns: 1 },
    icon: 'top_scale', look: { shape: 'scale', ramp: 'scarab', trim: 'gold' }, flavor: 'Iridescent. Unbudging.' },
  scarab_gauntlets: { name: 'Scarab Gauntlets', slot: 'gloves', family: 'scarab', stats: { def: 2, thorns: 2 },
    icon: 'gloves_spiked', look: { ramp: 'scarab', trim: 'gold' }, flavor: 'Pinch back.' },
  sun_scarab: { name: 'Sun Scarab', slot: 'trinket', family: 'scarab', icon: 't_scarab',
    trigger: { type: 'onHitTaken', chance: 0.3 }, effect: { apply: 'poison', stacks: 2 }, desc: 'When hit, 30%: 2 Poison on the attacker.' },

  // ================================================================ Barberry Orchard
  // berry: thorns, bleed, lifesteal
  barberry_whip: { name: 'Barberry Lash', slot: 'weapon', type: 'spear', family: 'berry',
    icon: 'spear', ramp: 'berry', onHit: [{ chance: 0.2, apply: 'bleed' }], flavor: 'Sour, then sharp.' },
  bramble_vest: { name: 'Bramble Vest', slot: 'top', family: 'berry', stats: { hp: 24, def: 2, thorns: 3 },
    icon: 'top_vest', look: { shape: 'vest', ramp: 'berry', trim: 'leaf' }, flavor: 'Hug at your own risk.' },
  thornleaf_gloves: { name: 'Thornleaf Gloves', slot: 'gloves', family: 'berry', stats: { atk: 1, lifesteal: 0.04 },
    icon: 'gloves', look: { ramp: 'leaf', trim: 'berry' }, flavor: 'Pick berries. Pick fights.' },
  berry_brooch: { name: 'Berry Brooch', slot: 'trinket', family: 'berry', icon: 't_berry',
    mods: { vs: { bleed: 0.2 } }, stats: { hp: 10 }, desc: '+20% damage vs Bleeding foes.' },
  // bee: speed, poison
  honey_stinger: { name: 'Honey Stinger', slot: 'weapon', type: 'dagger', family: 'bee', stats: { haste: 0.05 },
    icon: 'dagger', ramp: 'honey', onHit: [{ chance: 0.2, apply: 'poison' }], flavor: 'Sweet talk, sharp point.' },
  beekeeper_hat: { name: 'Beekeeper Hat', slot: 'hat', family: 'bee', stats: { hp: 12, resist: 0.1 },
    icon: 'hat_shroom', look: { shape: 'shroom', ramp: 'honey', trim: 'linen' }, flavor: 'The veil is mostly decorative.' },
  buzzing_boots: { name: 'Buzzing Boots', slot: 'shoes', family: 'bee', stats: { haste: 0.12 },
    icon: 'boots', look: { ramp: 'honey', trim: 'night' }, flavor: 'Bzz bzz, you are already there.' },
  honeycomb: { name: 'Honeycomb', slot: 'trinket', family: 'bee', icon: 't_honey',
    trigger: { type: 'everySeconds', s: 4 }, effect: { heal: 8 }, desc: 'Every 4s: heal 8.' },

  // ================================================================ Frostfang Glacier
  // yeti: bulk and stuns
  glacier_maul: { name: 'Glacier Maul', slot: 'weapon', type: 'mace', family: 'yeti', stats: { hp: 10 },
    icon: 'mace', ramp: 'yeti', flavor: 'An avalanche with a handle.' },
  fur_mantle: { name: 'Fur Mantle', slot: 'top', family: 'yeti', stats: { hp: 36, def: 2, resist: 0.05 },
    icon: 'top_cloak', look: { shape: 'cloak', ramp: 'yeti', trim: 'frost' }, flavor: 'Warm as a bear hug.' },
  yeti_helm: { name: 'Yeti Helm', slot: 'hat', family: 'yeti', stats: { hp: 20, def: 2 },
    icon: 'hat_horned', look: { shape: 'horned', ramp: 'yeti', trim: 'frost' }, flavor: 'Smells like snow and old wet dog.' },
  avalanche_bell: { name: 'Avalanche Bell', slot: 'trinket', family: 'yeti', icon: 't_avalanche',
    trigger: { type: 'everyNthHit', n: 5 }, effect: { apply: 'stun', duration: 0.8 }, desc: 'Every 5th hit: Stun 0.8s.' },
  // rime: chill and punish it
  icicle_lance: { name: 'Icicle Lance', slot: 'weapon', type: 'spear', family: 'rime',
    icon: 'spear', ramp: 'rime', onHit: [{ chance: 0.25, apply: 'chill' }], flavor: 'Colder at the tip.' },
  rime_gloves: { name: 'Rime Gloves', slot: 'gloves', family: 'rime', stats: { atk: 2, crit: 0.04 },
    onHit: [{ chance: 0.1, apply: 'chill' }], icon: 'gloves', look: { ramp: 'rime', trim: 'frost' }, flavor: 'Numb fingers, steady hands.' },
  snowdrift_boots: { name: 'Snowdrift Boots', slot: 'shoes', family: 'rime', stats: { hp: 10, resist: 0.1 },
    icon: 'boots', look: { ramp: 'rime', trim: 'frost' }, flavor: 'Leave no footprints.' },
  frost_sigil: { name: 'Frost Sigil', slot: 'trinket', family: 'rime', icon: 't_sigil',
    trigger: { type: 'battleStart' }, effect: { apply: 'chill', stacks: 2 }, desc: 'Battle start: 2 Chill on the foe.' },
};
// Relics: one per elite. Rule-bending trinkets that don't do much alone but
// can carry a whole build. Never common. `flags` feed the sim directly.
Object.assign(ITEMS, {
  gilded_hourglass: { name: 'Gilded Hourglass', slot: 'trinket', relic: true, family: null, icon: 'r_hourglass', tags: ['poison', 'burn'],
    trigger: { type: 'hpBelow', pct: 0.4 }, effect: { stasis: 3 },
    desc: 'Below 40% HP (once): turn to gold for 3s. Untouchable but frozen, and your Poison and Burn deal double meanwhile.' },
  plague_censer: { name: 'Plague Censer', slot: 'trinket', relic: true, family: null, icon: 'r_censer', tags: ['poison', 'burn'],
    flags: { dotRate: 0.6 }, desc: 'Your Poison and Burn tick every 0.6s instead of every 1s.' },
  ebb_shell: { name: 'Ebb Shell', slot: 'trinket', relic: true, family: null, icon: 'r_ebb', tags: ['shield'],
    flags: { shieldKeep: true, shieldBoost: 0.5 }, trigger: { type: 'battleStart' }, effect: { shield: 10 },
    desc: 'Start with a 10 Shield. Your Shields are 50% bigger and never fade.' },
  echo_conch: { name: 'Echo Conch', slot: 'trinket', relic: true, family: null, icon: 'r_conch', tags: ['poison', 'shock', 'chill', 'sunder'],
    flags: { echo: 0.3 }, desc: 'Statuses you apply have a 30% chance to land twice.' },
  overclock_core: { name: 'Overclock Core', slot: 'trinket', relic: true, family: null, icon: 'r_core', tags: ['frenzy'],
    stats: { haste: 0.3 }, flags: { selfCost: 0.02 }, desc: 'Each of your swings costs 2% of your max HP.' },
  bottled_storm: { name: 'Bottled Storm', slot: 'trinket', relic: true, family: null, icon: 'r_bottle', tags: ['shock'],
    flags: { shockKeep: true, shockMax: 2 }, desc: 'Shock you apply never fades. +2 max Shock stacks.' },
  bloodpact_chalice: { name: 'Bloodpact Chalice', slot: 'trinket', relic: true, family: null, icon: 'r_chalice', tags: ['regen'],
    stats: { lifesteal: 0.04 }, flags: { healDamage: 1 }, desc: 'Whenever you heal, the foe takes the same amount as damage.' },
  cursed_mirror: { name: 'Cursed Mirror', slot: 'trinket', relic: true, family: null, icon: 'r_mirror', tags: ['hex'],
    flags: { reflect: 0.5 }, desc: 'Statuses put on you have a 50% chance to hit them too.' },
  phoenix_feather: { name: 'Phoenix Feather', slot: 'trinket', relic: true, family: null, icon: 'r_feather', tags: ['burn'],
    flags: { revive: 0.25 }, trigger: { type: 'onRevive' }, effect: { apply: 'burn' },
    desc: 'The first time you would fall: rise at 25% HP, cleansed, and Burn the foe.' },
  glass_heart: { name: 'Glass Heart', slot: 'trinket', relic: true, family: null, icon: 'r_glass', tags: [],
    mods: { glass: { out: 0.5, in: 0.25 } }, desc: 'Your hits deal +50% damage. Hits you take deal +25%.' },
  sunstone_idol: { name: 'Sunstone Idol', slot: 'trinket', relic: true, family: null, icon: 'r_idol', tags: ['poison'],
    trigger: { type: 'everySeconds', s: 3 }, effect: { detonate: 'poison' }, desc: 'Every 3s: burst all Poison on the foe.' },
  royal_jelly: { name: 'Royal Jelly', slot: 'trinket', relic: true, family: null, icon: 'r_jelly', tags: ['regen'],
    flags: { healDamage: 0.5 }, trigger: { type: 'everySeconds', s: 2 }, effect: { heal: 5 },
    desc: 'Every 2s: heal 5. Half of every heal also hurts the foe.' },
  heart_of_winter: { name: 'Heart of Winter', slot: 'trinket', relic: true, family: null, icon: 'r_winter', tags: ['chill'],
    flags: { freezeAt: 2 }, trigger: { type: 'battleStart' }, effect: { apply: 'chill', stacks: 2 },
    desc: 'Your Chill freezes at 2 stacks. Battle start: 2 Chill on the foe.' },
});
export const RELIC_OF = {
  stone_golem: 'gilded_hourglass', cinder_imp: 'plague_censer', king_snapjaw: 'ebb_shell', siren: 'echo_conch',
  rust_titan: 'overclock_core', tesla_sentinel: 'bottled_storm', bone_knight: 'bloodpact_chalice', moor_witch: 'cursed_mirror',
  elder_drake: 'phoenix_feather', prism_colossus: 'glass_heart',
  sand_wyrm: 'gilded_hourglass', pharaoh_sphinx: 'sunstone_idol', elder_treant: 'bloodpact_chalice', wasp_queen: 'royal_jelly',
  abominable: 'glass_heart', frost_wyrm: 'heart_of_winter',
};
for (const [id, it] of Object.entries(ITEMS)) it.id = id;

export const SLOTS = ['hat', 'top', 'weapon', 'gloves', 'shoes', 'trinket1', 'trinket2'];
export const slotKind = (slot) => (slot.startsWith('trinket') ? 'trinket' : slot);
export const SLOT_LABEL = { hat: 'Hat', top: 'Top', weapon: 'Weapon', gloves: 'Gloves', shoes: 'Shoes', trinket1: 'Trinket', trinket2: 'Trinket' };

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

// Monster abilities, written like item triggers.
const ab = (trigger, effect, source) => ({ trigger, effect, source });

Object.assign(MOBS, {
  // ================================================================ day 2: Tidal Shore
  snapjaw_crab: { name: 'Snapjaw Crab', tier: 'easy', family: 'coral', sprite: 'crab',
    hp: 65, min: 4, max: 6, interval: 1.1, def: 2, stats: { thorns: 1 }, trait: 'Def 2, Thorns',
    drops: ['coral_trident', 'shell_helm', 'reef_mail', 'barnacle_ring'] },
  sting_jelly: { name: 'Sting Jelly', tier: 'easy', family: 'eel', sprite: 'jelly',
    hp: 58, min: 3, max: 5, interval: 0.9, def: 0, magic: true, onHit: [{ chance: 0.3, apply: 'shock' }],
    triggers: [ab({ type: 'everySeconds', s: 4 }, { shield: 5, target: 'self' }, 'Bubble')], trait: '30% Shock, bubbles',
    drops: ['eelfang_dirk', 'tidecaller_gloves', 'current_boots', 'static_charm'] },
  reef_eel: { name: 'Reef Eel', tier: 'normal', family: 'eel', sprite: 'eel',
    hp: 95, min: 5, max: 8, interval: 0.7, def: 0, onHit: [{ chance: 0.35, apply: 'shock' }], stats: { evasion: 0.1 },
    trait: 'Fast, 35% Shock, dodges', drops: ['eelfang_dirk', 'tidecaller_gloves', 'current_boots', 'static_charm'] },
  pearl_oyster: { name: 'Pearl Oyster', tier: 'normal', family: 'pearl', sprite: 'oyster',
    hp: 120, min: 9, max: 13, interval: 1.4, def: 3, onHit: [{ chance: 0.25, apply: 'weaken' }],
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { shield: 20, target: 'self' }, 'Clam up')], trait: 'Def 3, Weaken, shells up',
    drops: ['pearl_scepter', 'siren_veil', 'nacre_robe', 'tear_of_the_deep'] },
  king_snapjaw: { name: 'King Snapjaw', tier: 'elite', family: 'coral', sprite: 'crabking',
    hp: 190, min: 15, max: 21, interval: 2.0, def: 5, onHit: [{ chance: 0.3, apply: 'sunder' }], stats: { thorns: 3 },
    trait: 'Def 5, Thorns 3, Sunders', drops: ['coral_trident', 'crusher_claw', 'shell_helm', 'reef_mail', 'barnacle_ring'] },
  siren: { name: 'Siren', tier: 'elite', family: 'pearl', sprite: 'siren',
    hp: 130, min: 7, max: 10, interval: 1.0, def: 0, magic: true, onHit: [{ chance: 0.3, apply: 'weaken' }], stats: { lifesteal: 0.2 },
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { shield: 25, target: 'self' }, 'Sea foam')], trait: 'Magic, Weaken, drains life',
    drops: ['pearl_scepter', 'siren_veil', 'nacre_robe', 'tear_of_the_deep', 'siren_song'] },

  // ================================================================ day 3: Clockwork Ruins
  cogling: { name: 'Cogling', tier: 'easy', family: 'cog', sprite: 'cogling',
    hp: 70, min: 4, max: 6, interval: 0.8, def: 1, stats: { crit: 0.1 },
    triggers: [ab({ type: 'everyNthHit', n: 4 }, { apply: 'stun', duration: 0.5 }, 'Whirr')], trait: 'Fast, stuns every 4th hit',
    drops: ['gearbreaker', 'tinker_goggles', 'spring_boots', 'chronometer'] },
  rust_mite: { name: 'Rust Mite', tier: 'easy', family: 'rust', sprite: 'mite',
    hp: 70, min: 4, max: 6, interval: 0.8, def: 1, onHit: [{ chance: 0.4, apply: 'sunder' }], trait: '40% Sunder',
    drops: ['rust_cleaver', 'rust_plate', 'oil_gauntlets', 'corroder_lens'] },
  arc_sprite: { name: 'Arc Sprite', tier: 'normal', family: 'spark', sprite: 'sprite',
    hp: 100, min: 7, max: 10, interval: 1.0, def: 0, magic: true, onHit: [{ chance: 0.35, apply: 'shock' }], stats: { evasion: 0.1 },
    trait: 'Magic, 35% Shock, dodges', drops: ['arc_rod', 'coil_helm', 'dynamo_gloves', 'leyden_jar'] },
  clockwork_knight: { name: 'Clockwork Knight', tier: 'normal', family: 'cog', sprite: 'automaton',
    hp: 140, min: 11, max: 15, interval: 1.4, def: 4, onHit: [{ chance: 0.15, apply: 'stun', duration: 0.8 }],
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { apply: 'frenzy', duration: 5, target: 'self' }, 'Overwind')], trait: 'Def 4, Stun, overwinds',
    drops: ['gearbreaker', 'tinker_goggles', 'spring_boots', 'chronometer'] },
  rust_titan: { name: 'Rust Titan', tier: 'elite', family: 'rust', sprite: 'titan',
    hp: 220, min: 17, max: 23, interval: 2.0, def: 5, onHit: [{ chance: 0.5, apply: 'sunder' }], stats: { thorns: 2 },
    trait: 'Def 5, 50% Sunder, Thorns', drops: ['rust_cleaver', 'rust_plate', 'oil_gauntlets', 'corroder_lens', 'titan_core'] },
  tesla_sentinel: { name: 'Tesla Sentinel', tier: 'elite', family: 'spark', sprite: 'tesla',
    hp: 150, min: 7, max: 10, interval: 0.9, def: 1, magic: true, onHit: [{ chance: 0.4, apply: 'shock' }, { chance: 0.15, apply: 'burn' }],
    triggers: [ab({ type: 'battleStart' }, { shield: 25, target: 'self' }, 'Capacitor')], trait: 'Magic, 40% Shock, shielded',
    drops: ['arc_rod', 'lightning_rod', 'coil_helm', 'dynamo_gloves', 'leyden_jar'] },

  // ================================================================ day 4: Haunted Moor
  grave_bat: { name: 'Grave Bat', tier: 'easy', family: 'shade', sprite: 'bat',
    hp: 75, min: 4, max: 6, interval: 0.7, def: 0, stats: { lifesteal: 0.25, evasion: 0.15 }, trait: 'Drains life, dodges',
    drops: ['nightfang', 'shadow_cloak', 'whisper_boots', 'mirror_shard'] },
  bone_rattler: { name: 'Bone Rattler', tier: 'easy', family: 'bone', sprite: 'skeleton',
    hp: 85, min: 6, max: 9, interval: 1.1, def: 1, onHit: [{ chance: 0.25, apply: 'bleed' }], stats: { crit: 0.2 },
    trait: '20% Crit, 25% Bleed', drops: ['bonecarver', 'skull_helm', 'ribcage_plate', 'knucklebones'] },
  hex_crow: { name: 'Hex Crow', tier: 'normal', family: 'hex', sprite: 'crow',
    hp: 115, min: 6, max: 9, interval: 0.8, def: 0, onHit: [{ chance: 0.4, apply: 'hex' }, { chance: 0.15, apply: 'weaken' }], stats: { evasion: 0.1 },
    trait: '40% Hex, Weaken', drops: ['blightwood_staff', 'witch_hat', 'cursed_doll', 'grave_lantern'] },
  shade_stalker: { name: 'Shade Stalker', tier: 'normal', family: 'shade', sprite: 'shade',
    hp: 130, min: 9, max: 13, interval: 1.0, def: 0, stats: { evasion: 0.25 },
    triggers: [ab({ type: 'onDodge' }, { damage: 6 }, 'Riposte')], trait: '25% dodge, ripostes',
    drops: ['nightfang', 'shadow_cloak', 'whisper_boots', 'mirror_shard'] },
  bone_knight: { name: 'Bone Knight', tier: 'elite', family: 'bone', sprite: 'boneknight',
    hp: 240, min: 17, max: 24, interval: 1.6, def: 5, onHit: [{ chance: 0.3, apply: 'bleed' }], stats: { crit: 0.25, critDmg: 0.5 },
    trait: 'Def 5, brutal crits, Bleed', drops: ['bonecarver', 'executioner', 'skull_helm', 'ribcage_plate', 'knucklebones'] },
  moor_witch: { name: 'Moor Witch', tier: 'elite', family: 'hex', sprite: 'witch',
    hp: 170, min: 8, max: 12, interval: 1.0, def: 0, magic: true, onHit: [{ chance: 0.4, apply: 'hex' }, { chance: 0.3, apply: 'poison' }],
    triggers: [ab({ type: 'everySeconds', s: 5 }, { heal: 15 }, 'Brew')], trait: 'Magic, Hex, Poison, heals',
    drops: ['blightwood_staff', 'witch_hat', 'cauldron_robe', 'cursed_doll', 'grave_lantern'] },

  // ================================================================ day 5: Dragon Peak
  emberling: { name: 'Emberling', tier: 'easy', family: 'drake', sprite: 'emberling',
    hp: 85, min: 5, max: 8, interval: 0.9, def: 1, onHit: [{ chance: 0.3, apply: 'burn' }], trait: '30% Burn',
    drops: ['emberbrand', 'drake_helm', 'scale_mail', 'wyrm_heart'] },
  gale_harpy: { name: 'Gale Harpy', tier: 'easy', family: 'storm', sprite: 'harpy',
    hp: 80, min: 4, max: 7, interval: 0.6, def: 0, onHit: [{ chance: 0.25, apply: 'shock' }], stats: { evasion: 0.18 },
    trait: 'Very fast, Shock, dodges', drops: ['stormpiercer', 'gale_boots', 'storm_gauntlets', 'thunderhead_totem'] },
  crystal_tortoise: { name: 'Crystal Tortoise', tier: 'normal', family: 'crystal', sprite: 'tortoise',
    hp: 170, min: 10, max: 14, interval: 1.5, def: 7, stats: { thorns: 3 },
    triggers: [ab({ type: 'everySeconds', s: 4 }, { shield: 12, target: 'self' }, 'Crystallise')], trait: 'Def 7, Thorns, shields',
    drops: ['prism_rod', 'crystal_crown', 'geode_plate', 'refraction_gem'] },
  thunder_roc: { name: 'Thunder Roc', tier: 'normal', family: 'storm', sprite: 'roc',
    hp: 150, min: 10, max: 14, interval: 1.0, def: 1, onHit: [{ chance: 0.4, apply: 'shock' }],
    triggers: [ab({ type: 'battleStart' }, { apply: 'frenzy', duration: 5, target: 'self' }, 'Tailwind')], trait: '40% Shock, starts in Frenzy',
    drops: ['stormpiercer', 'gale_boots', 'storm_gauntlets', 'thunderhead_totem'] },
  elder_drake: { name: 'Elder Drake', tier: 'elite', family: 'drake', sprite: 'drake',
    hp: 280, min: 20, max: 27, interval: 1.5, def: 4, onHit: [{ chance: 0.35, apply: 'burn' }], stats: { lifesteal: 0.15 },
    triggers: [ab({ type: 'hpBelow', pct: 0.4 }, { apply: 'frenzy', duration: 6, target: 'self' }, 'Fury')], trait: 'Def 4, Burn, drains, enrages',
    drops: ['emberbrand', 'drake_helm', 'scale_mail', 'wyrm_heart', 'dragonfire_pact'] },
  prism_colossus: { name: 'Prism Colossus', tier: 'elite', family: 'crystal', sprite: 'colossus',
    hp: 250, min: 15, max: 20, interval: 1.7, def: 6, magic: true, onHit: [{ chance: 0.35, apply: 'chill' }], stats: { thorns: 4 },
    triggers: [ab({ type: 'battleStart' }, { shield: 35, target: 'self' }, 'Facets')], trait: 'Magic, Def 6, Chill, Thorns',
    drops: ['prism_rod', 'prism_lance', 'crystal_crown', 'geode_plate', 'refraction_gem'] },

  // ================================================================ one more for each first-five biome
  shroom_knight: { name: 'Mushroom Knight', tier: 'normal', family: 'spore', sprite: 'shroomknight',
    hp: 120, min: 8, max: 12, interval: 1.2, def: 3, onHit: [{ chance: 0.3, apply: 'poison' }], trait: 'Def 3, 30% Poison',
    drops: ['spore_shiv', 'spore_hood', 'spore_boots', 'viper_fang'] },
  puffer: { name: 'Pufferfish', tier: 'easy', family: 'coral', sprite: 'puffer',
    hp: 70, min: 3, max: 5, interval: 1.0, def: 1, stats: { thorns: 3 },
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { shield: 12, target: 'self' }, 'Puff up')], trait: 'Thorns 3, puffs up',
    drops: ['coral_trident', 'shell_helm', 'reef_mail', 'barnacle_ring'] },
  scrap_hound: { name: 'Scrap Hound', tier: 'normal', family: 'rust', sprite: 'hound',
    hp: 115, min: 7, max: 10, interval: 0.8, def: 2, onHit: [{ chance: 0.35, apply: 'sunder' }], trait: 'Fast, 35% Sunder',
    drops: ['rust_cleaver', 'rust_plate', 'oil_gauntlets', 'corroder_lens'] },
  jack_lantern: { name: 'Jack-o-Lurk', tier: 'easy', family: 'hex', sprite: 'pumpkin',
    hp: 80, min: 5, max: 7, interval: 1.0, def: 1, magic: true, onHit: [{ chance: 0.35, apply: 'hex' }, { chance: 0.15, apply: 'burn' }],
    trait: 'Magic, Hex, Burn', drops: ['blightwood_staff', 'witch_hat', 'cursed_doll', 'grave_lantern'] },
  salamander: { name: 'Lava Salamander', tier: 'normal', family: 'drake', sprite: 'salamander',
    hp: 140, min: 9, max: 13, interval: 0.9, def: 2, onHit: [{ chance: 0.35, apply: 'burn' }], stats: { evasion: 0.08 },
    trait: '35% Burn, slippery', drops: ['emberbrand', 'drake_helm', 'scale_mail', 'wyrm_heart'] },

  // ================================================================ Sunscorch Desert
  dune_skink: { name: 'Dune Skink', tier: 'easy', family: 'sand', sprite: 'skink',
    hp: 70, min: 4, max: 6, interval: 0.7, def: 0, stats: { evasion: 0.15 }, onHit: [{ chance: 0.2, apply: 'weaken' }],
    trait: 'Fast, dodges, Weaken', drops: ['dune_scimitar', 'nomad_wrap', 'sandstrider_boots', 'mirage_charm'] },
  scarab_beetle: { name: 'Scarab Beetle', tier: 'easy', family: 'scarab', sprite: 'beetle',
    hp: 80, min: 4, max: 6, interval: 1.1, def: 3, onHit: [{ chance: 0.25, apply: 'poison' }], trait: 'Def 3, 25% Poison',
    drops: ['stinger_dirk', 'carapace_mail', 'scarab_gauntlets', 'sun_scarab'] },
  dune_scorpion: { name: 'Dune Scorpion', tier: 'normal', family: 'scarab', sprite: 'scorpion',
    hp: 120, min: 8, max: 11, interval: 1.0, def: 2, onHit: [{ chance: 0.4, apply: 'poison' }], stats: { crit: 0.15 },
    trait: '40% Poison, 15% Crit', drops: ['stinger_dirk', 'carapace_mail', 'scarab_gauntlets', 'sun_scarab'] },
  mummy: { name: 'Sand Mummy', tier: 'normal', family: 'sand', sprite: 'mummy',
    hp: 150, min: 9, max: 13, interval: 1.3, def: 1, regen: 3, onHit: [{ chance: 0.3, apply: 'weaken' }],
    trait: 'Regen 3/s, Weaken', drops: ['dune_scimitar', 'nomad_wrap', 'sandstrider_boots', 'mirage_charm'] },
  sand_wyrm: { name: 'Sand Wyrm', tier: 'elite', family: 'sand', sprite: 'sandwyrm',
    hp: 230, min: 16, max: 22, interval: 1.7, def: 4, onHit: [{ chance: 0.3, apply: 'sunder' }], stats: { evasion: 0.15 },
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { apply: 'frenzy', duration: 5, target: 'self' }, 'Burrow')], trait: 'Def 4, dodges, Sunders',
    drops: ['dune_scimitar', 'nomad_wrap', 'sandstrider_boots', 'mirage_charm'] },
  pharaoh_sphinx: { name: 'Pharaoh Sphinx', tier: 'elite', family: 'scarab', sprite: 'sphinx',
    hp: 190, min: 9, max: 13, interval: 1.1, def: 3, magic: true, onHit: [{ chance: 0.35, apply: 'poison' }, { chance: 0.2, apply: 'hex' }],
    triggers: [ab({ type: 'battleStart' }, { shield: 30, target: 'self' }, 'Riddle')], trait: 'Magic, Poison, Hex, shield',
    drops: ['stinger_dirk', 'carapace_mail', 'scarab_gauntlets', 'sun_scarab'] },

  // ================================================================ Barberry Orchard
  berry_sprout: { name: 'Berry Sprout', tier: 'easy', family: 'berry', sprite: 'sprout',
    hp: 75, min: 4, max: 6, interval: 1.0, def: 1, regen: 2, onHit: [{ chance: 0.2, apply: 'bleed' }],
    trait: 'Regen 2/s, Bleed', drops: ['barberry_whip', 'bramble_vest', 'thornleaf_gloves', 'berry_brooch'] },
  bumble_bee: { name: 'Bumble Bee', tier: 'easy', family: 'bee', sprite: 'bee',
    hp: 60, min: 3, max: 5, interval: 0.6, def: 0, onHit: [{ chance: 0.25, apply: 'poison' }], stats: { evasion: 0.1 },
    trait: 'Very fast, Poison', drops: ['honey_stinger', 'beekeeper_hat', 'buzzing_boots', 'honeycomb'] },
  thorn_hog: { name: 'Thorn Hedgehog', tier: 'normal', family: 'berry', sprite: 'hedgehog',
    hp: 125, min: 8, max: 11, interval: 1.1, def: 3, stats: { thorns: 4 }, onHit: [{ chance: 0.25, apply: 'bleed' }],
    trait: 'Thorns 4, Bleed', drops: ['barberry_whip', 'bramble_vest', 'thornleaf_gloves', 'berry_brooch'] },
  honey_bear: { name: 'Honey Bear', tier: 'normal', family: 'bee', sprite: 'bear',
    hp: 160, min: 12, max: 16, interval: 1.5, def: 2,
    triggers: [ab({ type: 'everySeconds', s: 5 }, { heal: 12 }, 'Snack')], trait: 'Big hits, snacks',
    drops: ['honey_stinger', 'beekeeper_hat', 'buzzing_boots', 'honeycomb'] },
  elder_treant: { name: 'Elder Treant', tier: 'elite', family: 'berry', sprite: 'treant',
    hp: 260, min: 15, max: 21, interval: 1.8, def: 5, regen: 4, stats: { thorns: 5 }, onHit: [{ chance: 0.3, apply: 'bleed' }],
    trait: 'Def 5, Thorns, Regen', drops: ['barberry_whip', 'bramble_vest', 'thornleaf_gloves', 'berry_brooch'] },
  wasp_queen: { name: 'Wasp Queen', tier: 'elite', family: 'bee', sprite: 'waspqueen',
    hp: 170, min: 7, max: 10, interval: 0.6, def: 1, onHit: [{ chance: 0.35, apply: 'poison' }], stats: { evasion: 0.12 },
    triggers: [ab({ type: 'hpBelow', pct: 0.5 }, { apply: 'frenzy', duration: 6, target: 'self' }, 'Swarm')], trait: 'Very fast, Poison, swarms',
    drops: ['honey_stinger', 'beekeeper_hat', 'buzzing_boots', 'honeycomb'] },

  // ================================================================ Frostfang Glacier
  snow_puff: { name: 'Snow Puff', tier: 'easy', family: 'rime', sprite: 'snowpuff',
    hp: 65, min: 4, max: 6, interval: 1.0, def: 0, magic: true, onHit: [{ chance: 0.3, apply: 'chill' }],
    trait: 'Magic, 30% Chill', drops: ['icicle_lance', 'rime_gloves', 'snowdrift_boots', 'frost_sigil'] },
  ice_penguin: { name: 'Ice Penguin', tier: 'easy', family: 'yeti', sprite: 'penguin',
    hp: 85, min: 5, max: 7, interval: 1.2, def: 2, onHit: [{ chance: 0.15, apply: 'stun', duration: 0.6 }],
    trait: 'Def 2, belly-slide stuns', drops: ['glacier_maul', 'fur_mantle', 'yeti_helm', 'avalanche_bell'] },
  frost_wolf: { name: 'Frost Wolf', tier: 'normal', family: 'rime', sprite: 'wolf',
    hp: 120, min: 7, max: 10, interval: 0.8, def: 1, onHit: [{ chance: 0.35, apply: 'chill' }, { chance: 0.15, apply: 'bleed' }],
    trait: 'Fast, Chill, Bleed', drops: ['icicle_lance', 'rime_gloves', 'snowdrift_boots', 'frost_sigil'] },
  yeti: { name: 'Yeti', tier: 'normal', family: 'yeti', sprite: 'yeti',
    hp: 175, min: 12, max: 17, interval: 1.6, def: 3, onHit: [{ chance: 0.2, apply: 'stun', duration: 0.8 }],
    trait: 'Tough, 20% Stun', drops: ['glacier_maul', 'fur_mantle', 'yeti_helm', 'avalanche_bell'] },
  abominable: { name: 'Abominable', tier: 'elite', family: 'yeti', sprite: 'abominable',
    hp: 290, min: 18, max: 25, interval: 1.8, def: 5, onHit: [{ chance: 0.25, apply: 'stun', duration: 0.8 }],
    triggers: [ab({ type: 'hpBelow', pct: 0.4 }, { apply: 'frenzy', duration: 6, target: 'self' }, 'Roar')], trait: 'Def 5, Stun, enrages',
    drops: ['glacier_maul', 'fur_mantle', 'yeti_helm', 'avalanche_bell'] },
  frost_wyrm: { name: 'Frost Wyrm', tier: 'elite', family: 'rime', sprite: 'frostwyrm',
    hp: 220, min: 12, max: 17, interval: 1.3, def: 3, magic: true, onHit: [{ chance: 0.4, apply: 'chill' }], stats: { resist: 0.2 },
    triggers: [ab({ type: 'everySeconds', s: 5 }, { shield: 15, target: 'self' }, 'Ice scales')], trait: 'Magic, Chill, ice scales',
    drops: ['icicle_lance', 'rime_gloves', 'snowdrift_boots', 'frost_sigil'] },
});
for (const [id, m] of Object.entries(MOBS)) m.id = id;

for (const [mob, relic] of Object.entries(RELIC_OF)) MOBS[mob].drops.push(relic);

// ---------------------------------------------------------------- days

// Biomes. Each run draws DAYS_IN_RUN of them in a random order, so the same
// day can be a meadow in one run and a glacier in the next. A biome's monsters
// are rescaled to whatever day it lands on (see MOB_POWER).
export const BIOMES = [
  { id: 'meadow', name: 'Mossy Meadow', biome: 'slime', tiers: {
    easy: ['green_slime', 'spore_cap'], normal: ['tusk_boar', 'frost_wisp', 'shroom_knight'], elite: ['stone_golem', 'cinder_imp'] } },
  { id: 'shore', name: 'Tidal Shore', biome: 'shore', tiers: {
    easy: ['snapjaw_crab', 'sting_jelly', 'puffer'], normal: ['reef_eel', 'pearl_oyster'], elite: ['king_snapjaw', 'siren'] } },
  { id: 'ruins', name: 'Clockwork Ruins', biome: 'ruins', tiers: {
    easy: ['cogling', 'rust_mite'], normal: ['arc_sprite', 'clockwork_knight', 'scrap_hound'], elite: ['rust_titan', 'tesla_sentinel'] } },
  { id: 'moor', name: 'Haunted Moor', biome: 'moor', tiers: {
    easy: ['grave_bat', 'bone_rattler', 'jack_lantern'], normal: ['hex_crow', 'shade_stalker'], elite: ['bone_knight', 'moor_witch'] } },
  { id: 'peak', name: 'Dragon Peak', biome: 'peak', tiers: {
    easy: ['emberling', 'gale_harpy'], normal: ['crystal_tortoise', 'thunder_roc', 'salamander'], elite: ['elder_drake', 'prism_colossus'] } },
  { id: 'desert', name: 'Sunscorch Desert', biome: 'desert', tiers: {
    easy: ['dune_skink', 'scarab_beetle'], normal: ['dune_scorpion', 'mummy'], elite: ['sand_wyrm', 'pharaoh_sphinx'] } },
  { id: 'orchard', name: 'Barberry Orchard', biome: 'orchard', tiers: {
    easy: ['berry_sprout', 'bumble_bee'], normal: ['thorn_hog', 'honey_bear'], elite: ['elder_treant', 'wasp_queen'] } },
  { id: 'glacier', name: 'Frostfang Glacier', biome: 'glacier', tiers: {
    easy: ['snow_puff', 'ice_penguin'], normal: ['frost_wolf', 'yeti'], elite: ['abominable', 'frost_wyrm'] } },
];
export const BIOME = Object.fromEntries(BIOMES.map((b) => [b.id, b]));
// The original five-day order, for saves from before biomes were shuffled.
export const CLASSIC_ORDER = ['meadow', 'shore', 'ruins', 'moor', 'peak'];
// A run's biome order: `order` is its list of biome ids, one per day.
export const dayInfo = (round, order = CLASSIC_ORDER) => BIOME[order[Math.min(order.length, dayOf(round)) - 1]];

// Balance: each monster's HP and damage are multiplied by its power for the
// day it's fought on, found by tools/tune.mjs so a careful player's build of
// that day wins about 62% of Normal hunts and 42% of Elite hunts, and a
// struggling player's build wins about 80% of Easy hunts. Missing means 1.
export { MOB_POWER } from './mobpower.js';
BIOMES.forEach((b) => {
  for (const ids of Object.values(b.tiers)) for (const id of ids) MOBS[id].biome = b.id;
});

// Where a family's monsters are fought (and drawn).
export const FAMILY_BIOME = { slime: 'slime', spore: 'spore', boar: 'boar', wisp: 'wisp', golem: 'golem', imp: 'imp' };
BIOMES.forEach((b, i) => {
  if (i === 0) return;
  for (const ids of Object.values(b.tiers)) for (const id of ids) FAMILY_BIOME[MOBS[id].family] = b.biome;
});

// ---------------------------------------------------------------- rarity

// Rarer items are a little stronger across the board (mult on every base
// number), roll extra affixes, and are where perks come from (see PERKS).
export const RARITIES = {
  common: { name: 'Common', affixes: 0, mult: 1, next: 'rare' },
  rare: { name: 'Rare', affixes: 1, mult: 1.1, next: 'epic' },
  epic: { name: 'Epic', affixes: 2, mult: 1.2, next: 'epic' },
};
export const RARITY_ODDS = {
  easy: [['common', 80], ['rare', 18], ['epic', 2]],
  normal: [['common', 25], ['rare', 60], ['epic', 15]],
  elite: [['common', 0], ['rare', 55], ['epic', 45]],
};

// Later days shift Normal and Elite odds away from common: 20% fewer commons
// per day. Easy stays mostly common every day: it's the safe pick, not the rich one.
export function rarityOdds(tier, day = 1) {
  const k = tier === 'easy' ? 1 : Math.pow(0.8, day - 1);
  const [c, r, e] = RARITY_ODDS[tier];
  const common = c[1] * k;
  const spare = c[1] - common;
  return [['common', common], ['rare', r[1] + spare * 0.7], ['epic', e[1] + spare * 0.3]];
}
// Perks: the niche, build-defining effects that rare and epic items can roll.
// Rare items have a 40% chance of one; epics always have one and a 25% chance of
// a second. Perks tagged with a status prefer items whose family deals it, so a
// Spore dagger tends to roll poison payoffs. Numbers in labels scale like the
// item's other numbers.
const perk = (label, tags, def) => ({ label, tags, ...def });
const onCrit = { type: 'onCrit' };
export const PERKS = {
  // payoffs for a status you're already applying
  vs_poison: perk('+25% dmg vs Poisoned', ['poison'], { mods: { vs: { poison: 0.25 } } }),
  vs_burn: perk('+25% dmg vs Burning', ['burn'], { mods: { vs: { burn: 0.25 } } }),
  vs_bleed: perk('+25% dmg vs Bleeding', ['bleed'], { mods: { vs: { bleed: 0.25 } } }),
  vs_shock: perk('+25% dmg vs Shocked', ['shock'], { mods: { vs: { shock: 0.25 } } }),
  vs_chill: perk('+25% dmg vs Chilled', ['chill'], { mods: { vs: { chill: 0.25 } } }),
  vs_sunder: perk('+25% dmg vs Sundered', ['sunder'], { mods: { vs: { sunder: 0.25 } } }),
  vs_hex: perk('+25% dmg vs Hexed', ['hex'], { mods: { vs: { hex: 0.25 } } }),
  vs_weaken: perk('+25% dmg vs Weakened', ['weaken'], { mods: { vs: { weaken: 0.25 } } }),
  vs_stun: perk('+40% dmg vs Stunned', ['stun'], { mods: { vs: { stun: 0.4, freeze: 0.4 } } }),
  burst_poison: perk('Every 5th hit: burst all Poison', ['poison'], { trigger: { type: 'everyNthHit', n: 5 }, effect: { detonate: 'poison' } }),
  burst_burn: perk('Every 5th hit: burst all Burn', ['burn'], { trigger: { type: 'everyNthHit', n: 5 }, effect: { detonate: 'burn' } }),
  // spread a status
  shock_on_crit: perk('On crit: 2 Shock', ['shock'], { trigger: onCrit, effect: { apply: 'shock', stacks: 2 } }),
  poison_on_crit: perk('On crit: 3 Poison', ['poison'], { trigger: onCrit, effect: { apply: 'poison', stacks: 3 } }),
  burn_on_crit: perk('On crit: Burn', ['burn'], { trigger: onCrit, effect: { apply: 'burn' } }),
  bleed_on_crit: perk('On crit: Bleed', ['bleed'], { trigger: onCrit, effect: { apply: 'bleed' } }),
  sunder_on_crit: perk('On crit: 2 Sunder', ['sunder'], { trigger: onCrit, effect: { apply: 'sunder', stacks: 2 } }),
  hex_on_hit: perk('15% on hit: Hex', ['hex'], { trigger: { type: 'onHit', chance: 0.15 }, effect: { apply: 'hex' } }),
  chill_on_hit: perk('15% on hit: Chill', ['chill'], { trigger: { type: 'onHit', chance: 0.15 }, effect: { apply: 'chill' } }),
  stun_every: perk('Every 6th hit: Stun 0.6s', ['stun'], { trigger: { type: 'everyNthHit', n: 6 }, effect: { apply: 'stun', duration: 0.6 } }),
  weaken_opener: perk('Battle start: Weaken the foe', ['weaken'], { trigger: { type: 'battleStart' }, effect: { apply: 'weaken' } }),
  shock_back: perk('When hit, 20%: Shock the attacker', ['shock'], { trigger: { type: 'onHitTaken', chance: 0.2 }, effect: { apply: 'shock' } }),
  // any build
  execute: perk('+40% dmg vs foes under 30% HP', [], { mods: { execute: { below: 0.3, pct: 0.4 } } }),
  rage: perk('+30% dmg while under 40% HP', [], { mods: { rage: { below: 0.4, pct: 0.3 } } }),
  set_up_crit: perk('Every 4th hit: next hit crits', [], { trigger: { type: 'everyNthHit', n: 4 }, effect: { critNext: true } }),
  opener_shield: perk('Battle start: 20 Shield', [], { trigger: { type: 'battleStart' }, effect: { shield: 20, target: 'self' } }),
  opener_frenzy: perk('Battle start: Frenzy 3s', [], { trigger: { type: 'battleStart' }, effect: { apply: 'frenzy', duration: 3, target: 'self' } }),
  dodge_shield: perk('When you dodge: 10 Shield', [], { trigger: { type: 'onDodge' }, effect: { shield: 10, target: 'self' } }),
  riposte: perk('When you dodge: strike back for 8', [], { trigger: { type: 'onDodge' }, effect: { damage: 8 } }),
  crit_heal: perk('Crits heal 5', [], { trigger: onCrit, effect: { heal: 5 } }),
  second_wind: perk('Below 30% HP, once: cleanse, heal 20', [], { trigger: { type: 'hpBelow', pct: 0.3 }, effect: { heal: 20, cleanse: true } }),
  vampiric: perk('+5% Lifesteal', [], { stats: { lifesteal: 0.05 } }),
  piercing: perk('Pierce 3', [], { stats: { pen: 3 } }),
};
for (const [id, p] of Object.entries(PERKS)) p.id = id;
export const PERK_ODDS = { common: [], rare: [0.4], epic: [1, 0.25] };

// Base affix values before round scaling.
export const AFFIXES = {
  atk: { label: 'Atk', value: 2 },
  hp: { label: 'HP', value: 15 },
  crit: { label: 'Crit', value: 0.05 },
  haste: { label: 'Haste', value: 0.06 },
  resist: { label: 'Resist', value: 0.1 },
  status: { label: 'on hit', value: 0.05 },
};

// ---------------------------------------------------------------- ghosts
// Hand-written opponents, three per duel round. Each is a saved build as the
// server would store it: the look plus rolled item instances.

const g = (item, rarity = 'common', affixes = [], perks = []) => ({ item, rarity, affixes, perks });

export const GHOSTS = [
  // day 1 (round 4): starter kit plus a few drops
  { id: 'mossbell', name: 'Mossbell', record: '3-0', round: 4, archetype: 'Poison dagger',
    look: { gender: 'girl', hair: 'twintails', hairColor: 'mint', skin: 'light', eyes: 'green' },
    equip: { weapon: g('spore_shiv'), top: g('linen_shirt'), trinket1: g('viper_fang') } },
  { id: 'brickley', name: 'Brickley', record: '2-1', round: 4, archetype: 'Tank',
    look: { gender: 'boy', hair: 'crop', hairColor: 'chestnut', skin: 'tan', eyes: 'brown' },
    equip: { weapon: g('wooden_sword'), top: g('hide_vest'), hat: g('slime_cap') } },
  { id: 'pip', name: 'Pip', record: '3-0', round: 4, archetype: 'Crit sword',
    look: { gender: 'boy', hair: 'spiky', hairColor: 'blond', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('jelly_sabre'), top: g('linen_shirt'), trinket1: g('lucky_clover') } },

  // day 2 (round 8)
  { id: 'ashvane', name: 'Ashvane', record: '6-1', round: 8, archetype: 'Burn staff',
    look: { gender: 'girl', hair: 'long', hairColor: 'crimson', skin: 'light', eyes: 'amber' },
    equip: { weapon: g('cinder_rod', 'rare', [{ stat: 'status', value: 0.05 }]), top: g('imp_robe'), shoes: g('cinder_boots'),
      hat: g('siren_veil'), trinket1: g('ember_charm') } },
  { id: 'tuskra', name: 'Tuskra', record: '5-2', round: 8, archetype: 'Thorns tank',
    look: { gender: 'girl', hair: 'bob', hairColor: 'midnight', skin: 'deep', eyes: 'amber' },
    equip: { weapon: g('tusk_cleaver'), top: g('reef_mail'), gloves: g('tusk_gloves'),
      hat: g('shell_helm'), trinket1: g('thorn_ring') } },
  { id: 'rimeheart', name: 'Rimeheart', record: '6-1', round: 8, archetype: 'Shock dagger',
    look: { gender: 'boy', hair: 'swept', hairColor: 'silver', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('eelfang_dirk', 'rare', [{ stat: 'status', value: 0.05 }]), hat: g('wisp_hood'),
      shoes: g('current_boots'), top: g('hide_vest'), trinket1: g('static_charm') } },

  // day 3 (round 12)
  { id: 'old_granite', name: 'Old Granite', record: '9-2', round: 12, archetype: 'Mace tank',
    look: { gender: 'boy', hair: 'crop', hairColor: 'ash', skin: 'deep', eyes: 'brown' },
    equip: { weapon: g('boulder_maul', 'rare', [{ stat: 'hp', value: 15 }]), top: g('rust_plate'),
      hat: g('golem_helm', 'rare', [{ stat: 'resist', value: 0.1 }]), shoes: g('spring_boots'),
      trinket1: g('last_stand_locket'), trinket2: g('metronome') } },
  { id: 'nightshade', name: 'Nightshade', record: '10-1', round: 12, archetype: 'Poison dagger',
    look: { gender: 'girl', hair: 'long', hairColor: 'lavender', skin: 'tan', eyes: 'violet' },
    equip: { weapon: g('spore_shiv', 'epic', [{ stat: 'status', value: 0.05 }, { stat: 'haste', value: 0.06 }], ['burst_poison']),
      hat: g('spore_hood'), shoes: g('current_boots'), top: g('reef_mail'),
      trinket1: g('viper_fang'), trinket2: g('plague_censer', 'rare') } },
  { id: 'solenne', name: 'Solenne', record: '9-2', round: 12, archetype: 'Shock staff',
    look: { gender: 'girl', hair: 'ponytail', hairColor: 'blond', skin: 'light', eyes: 'blue' },
    equip: { weapon: g('arc_rod', 'rare', [{ stat: 'crit', value: 0.05 }], ['vs_shock']),
      gloves: g('dynamo_gloves'), top: g('nacre_robe'), hat: g('coil_helm'),
      trinket1: g('leyden_jar'), trinket2: g('static_charm') } },

  // day 4 (round 16)
  { id: 'vesper', name: 'Vesper', record: '13-2', round: 16, archetype: 'Evasion riposte',
    look: { gender: 'girl', hair: 'bob', hairColor: 'raven', skin: 'fair', eyes: 'violet' },
    equip: { weapon: g('nightfang', 'rare', [{ stat: 'haste', value: 0.06 }], ['riposte']), top: g('shadow_cloak'), shoes: g('whisper_boots'),
      hat: g('siren_veil'), gloves: g('tusk_gloves'), trinket1: g('mirror_shard'), trinket2: g('knucklebones') } },
  { id: 'grimm', name: 'Grimm', record: '12-3', round: 16, archetype: 'Crit bruiser',
    look: { gender: 'boy', hair: 'messy', hairColor: 'ash', skin: 'tan', eyes: 'amber' },
    equip: { weapon: g('bonecarver', 'epic', [{ stat: 'crit', value: 0.05 }, { stat: 'atk', value: 2 }], ['execute']), hat: g('skull_helm'),
      top: g('ribcage_plate'), gloves: g('dynamo_gloves'), shoes: g('spring_boots'), trinket1: g('knucklebones'), trinket2: g('lucky_clover') } },
  { id: 'morwen', name: 'Morwen', record: '13-2', round: 16, archetype: 'Hex and poison',
    look: { gender: 'girl', hair: 'long', hairColor: 'midnight', skin: 'light', eyes: 'green' },
    equip: { weapon: g('blightwood_staff', 'rare', [{ stat: 'status', value: 0.05 }], ['vs_hex']), hat: g('witch_hat'), top: g('nacre_robe'),
      shoes: g('spore_boots'), gloves: g('gel_gloves'), trinket1: g('cursed_doll'), trinket2: g('gilded_hourglass', 'rare') } },

  // day 5 (round 20): the final duel
  { id: 'ignis', name: 'Ignis', record: '17-2', round: 20, archetype: 'Dragonblood burn',
    look: { gender: 'boy', hair: 'spiky', hairColor: 'crimson', skin: 'tan', eyes: 'amber' },
    equip: { weapon: g('emberbrand', 'epic', [{ stat: 'status', value: 0.05 }, { stat: 'atk', value: 2 }], ['burst_burn']), hat: g('drake_helm'),
      top: g('scale_mail'), gloves: g('storm_gauntlets'), shoes: g('cinder_boots'), trinket1: g('wyrm_heart'), trinket2: g('phoenix_feather', 'rare') } },
  { id: 'zephyra', name: 'Zephyra', record: '16-3', round: 20, archetype: 'Storm shock',
    look: { gender: 'girl', hair: 'ponytail', hairColor: 'silver', skin: 'deep', eyes: 'blue' },
    equip: { weapon: g('stormpiercer', 'epic', [{ stat: 'status', value: 0.05 }, { stat: 'haste', value: 0.06 }], ['shock_on_crit']), hat: g('coil_helm'),
      top: g('reef_mail'), shoes: g('gale_boots'), gloves: g('tidecaller_gloves'), trinket1: g('bottled_storm', 'rare'), trinket2: g('thunderhead_totem') } },
  { id: 'quartzia', name: 'Quartzia', record: '17-2', round: 20, archetype: 'Crystal fortress',
    look: { gender: 'girl', hair: 'twintails', hairColor: 'lavender', skin: 'fair', eyes: 'pink' },
    equip: { weapon: g('prism_lance', 'rare', [{ stat: 'hp', value: 15 }], ['opener_shield']), hat: g('crystal_crown'), top: g('geode_plate'),
      shoes: g('spring_boots'), gloves: g('oil_gauntlets'), trinket1: g('refraction_gem'), trinket2: g('last_stand_locket') } },
];
