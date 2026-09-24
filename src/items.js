// Item instances, build -> fighter conversion, and the headline numbers.

import {
  ITEMS, WEAPON_TYPES, FAMILIES, BASE, RESIST_CAP, MOBS, AFFIXES, RARITIES, rarityOdds, MOB_POWER, PERKS, PERK_ODDS,
  slotKind, scaleFor, dayOf,
} from './data.js';

let uidCounter = 1;
export const newUid = () => 'i' + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const PCT = new Set(['crit', 'haste', 'resist', 'lifesteal', 'evasion', 'critDmg']);
const STAT_KEYS = ['hp', 'def', 'atk', 'crit', 'haste', 'resist', 'lifesteal', 'evasion', 'critDmg', 'thorns', 'pen'];
const roundStat = (stat, v) => (PCT.has(stat) ? Math.round(v * 100) / 100 : Math.round(v));

export function rollInstance(itemId, rarity, round, rng) {
  const def = ITEMS[itemId];
  const scale = scaleFor(round);
  const n = RARITIES[rarity].affixes;
  const pool = Object.keys(AFFIXES).filter((a) => a !== 'status' || (def.family && FAMILIES[def.family]));
  const affixes = rng.shuffle(pool).slice(0, n).map((stat) => ({
    stat, value: stat === 'status' ? AFFIXES.status.value : AFFIXES[stat].value,
  }));
  return { uid: newUid(), item: itemId, rarity, round, scale, affixes, perks: rollPerks(def, rarity, rng) };
}

// The statuses an item is about: its family's, and whatever it applies.
export function itemTags(def) {
  const tags = new Set();
  if (def.family && FAMILIES[def.family]) tags.add(FAMILIES[def.family].status);
  for (const oh of def.onHit || []) tags.add(oh.apply);
  if (def.slot === 'weapon' && !def.replaceOnHit) for (const oh of WEAPON_TYPES[def.type].onHit || []) tags.add(oh.apply);
  if (def.effect?.apply) tags.add(def.effect.apply);
  for (const t of def.tags || []) tags.add(t);
  return tags;
}

// Perks by rarity; 60% of the time a perk that fits the item's statuses.
function rollPerks(def, rarity, rng) {
  const out = [];
  const tags = itemTags(def);
  for (const chance of PERK_ODDS[rarity] || []) {
    if (!rng.chance(chance)) continue;
    const free = Object.values(PERKS).filter((p) => !out.includes(p.id));
    const fitting = free.filter((p) => p.tags.some((t) => tags.has(t)));
    const general = free.filter((p) => !p.tags.length);
    const pool = fitting.length && rng.chance(0.6) ? fitting : general.length ? general : free;
    out.push(rng.pick(pool).id);
  }
  return out;
}

// Ghost builds are written without uid/scale; fill those in. A real build's
// items dropped over earlier rounds, so ghost gear rolls a round behind.
export function hydrate(inst, round, lag = 1) {
  const r = inst.round || Math.max(1, round - lag);
  return { uid: newUid(), round: r, scale: scaleFor(r), affixes: [], perks: [], ...inst };
}

// How strong an instance's base numbers are: its round scale times its rarity.
export const power = (inst) => inst.scale * (RARITIES[inst.rarity]?.mult ?? 1);

// Final numbers for one instance, rounding the way the UI shows them.
export function instanceStats(inst) {
  const def = ITEMS[inst.item];
  const kind = slotKind(def.slot);
  const s = power(inst);
  const out = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const [k, v] of Object.entries(def.stats || {})) out[k] += roundStat(k, v * s);

  if (kind === 'weapon') {
    const wt = WEAPON_TYPES[def.type];
    out.min = Math.round((def.min ?? wt.min) * s);
    out.max = Math.round((def.max ?? wt.max) * s);
    out.interval = def.interval ?? wt.interval;
  }

  const statusOnHit = [];
  for (const a of inst.affixes || []) {
    if (a.stat === 'status') {
      statusOnHit.push({ chance: a.value, apply: FAMILIES[def.family].status, duration: 0.5 });
    } else {
      out[a.stat] = roundStat(a.stat, out[a.stat] + a.value * inst.scale);
    }
  }

  out.statusOnHit = statusOnHit;
  return out;
}

// Merge situational damage modifiers: {vs: {status: pct}, execute, rage}.
function mergeMods(into, m) {
  if (!m) return;
  if (m.vs) {
    into.vs = into.vs || {};
    for (const [k, v] of Object.entries(m.vs)) into.vs[k] = (into.vs[k] || 0) + v;
  }
  for (const k of ['execute', 'rage']) {
    if (!m[k]) continue;
    into[k] = into[k] ? { below: Math.max(into[k].below, m[k].below), pct: into[k].pct + m[k].pct } : { ...m[k] };
  }
  if (m.glass) into.glass = { out: (into.glass?.out || 0) + m.glass.out, in: (into.glass?.in || 0) + m.glass.in };
}

// Sim flags: numbers stack, switches just turn on.
function mergeFlags(into, flags) {
  for (const [k, v] of Object.entries(flags || {})) into[k] = typeof v === 'number' ? (into[k] || 0) + v : v;
}

// Trinket effect with round-scaled magnitudes.
function scaledEffect(effect, scale) {
  const e = { ...effect };
  for (const k of ['heal', 'damage', 'shield']) if (e[k]) e[k] = Math.round(e[k] * scale);
  return e;
}

export function activeSets(equip) {
  const counts = {};
  const seen = new Set();
  for (const inst of Object.values(equip)) {
    if (!inst) continue;
    const fam = ITEMS[inst.item].family;
    if (!fam || seen.has(inst.item)) continue;
    seen.add(inst.item);
    counts[fam] = (counts[fam] || 0) + 1;
  }
  return Object.keys(counts).filter((f) => counts[f] >= 2);
}

export function setCounts(equip) {
  const counts = {};
  for (const inst of Object.values(equip)) {
    if (!inst) continue;
    const fam = ITEMS[inst.item].family;
    if (fam) counts[fam] = (counts[fam] || 0) + 1;
  }
  return counts;
}

// Build = { name, round, equip: { slot: instance } } -> fighter spec for simulate().
export function heroFighter(build) {
  const round = build.round || 1;
  const f = {
    name: build.name, kind: 'hero', scale: scaleFor(round), look: build.look,
    maxHp: BASE.hp, atk: BASE.atk, def: BASE.def, crit: BASE.crit, haste: BASE.haste,
    lifesteal: BASE.lifesteal, resist: BASE.resist, regen: 0, evasion: 0, critDmg: 0, thorns: 0, pen: 0,
    weapon: { min: 3, max: 5, interval: 1.0, magic: false, firstSwing: null, statusMult: 1 },
    onHit: [], triggers: [], sets: {}, mods: {},
  };
  const equip = build.equip || {};
  for (const [slot, inst] of Object.entries(equip)) {
    if (!inst) continue;
    const def = ITEMS[inst.item];
    const st = instanceStats(inst);
    f.maxHp += st.hp;
    for (const k of STAT_KEYS) if (k !== 'hp') f[k] += st[k];
    f.onHit.push(...st.statusOnHit);
    mergeMods(f.mods, def.mods);
    mergeFlags(f.sets, def.flags);
    if (def.slot !== 'weapon' && def.onHit) f.onHit.push(...def.onHit);
    if (def.slot === 'weapon') {
      const wt = WEAPON_TYPES[def.type];
      f.weapon = {
        min: st.min, max: st.max, interval: st.interval, magic: !!wt.magic,
        firstSwing: wt.firstSwing ?? null, statusMult: wt.statusMult ?? 1, type: def.type,
      };
      if (wt.crit) f.crit += wt.crit;
      if (!def.replaceOnHit && wt.onHit) f.onHit.push(...wt.onHit);
      if (def.onHit) f.onHit.push(...def.onHit);
    }
    if (def.trigger) {
      f.triggers.push({ trigger: def.trigger, effect: scaledEffect(def.effect, power(inst)), source: def.name, slot });
    }
    for (const id of inst.perks || []) {
      const p = PERKS[id];
      if (!p) continue;
      for (const [k, v] of Object.entries(p.stats || {})) f[k] += v;
      mergeMods(f.mods, p.mods);
      if (p.trigger) f.triggers.push({ trigger: p.trigger, effect: scaledEffect(p.effect, power(inst)), source: def.name, slot });
    }
  }
  for (const fam of activeSets(equip)) {
    const set = FAMILIES[fam].set;
    if (set.regen) f.regen += Math.round(set.regen * scaleFor(round));
    if (set.def) f.def += set.def;
    if (set.poisonMax) f.sets.poisonMax = set.poisonMax;
    if (set.bleedBonus) f.sets.bleedBonus = set.bleedBonus;
    if (set.freezeAt) f.sets.freezeAt = set.freezeAt;
    if (set.stunBonus) f.sets.stunBonus = set.stunBonus;
    if (set.burnCrit) f.sets.burnCrit = true;
    // newer sets: flat stats, flags, modifiers, a trigger, a faster first swing
    for (const [k, v] of Object.entries(set.stats || {})) f[k] += v;
    mergeFlags(f.sets, set.flags);
    mergeMods(f.mods, set.mods);
    if (set.trigger) f.triggers.push({ trigger: set.trigger, effect: scaledEffect(set.effect, scaleFor(round)), source: set.name });
    if (set.firstSwing) f.weapon.firstSwing = Math.min(f.weapon.firstSwing ?? Infinity, set.firstSwing);
  }
  f.resist = Math.min(RESIST_CAP, f.resist);
  f.haste = Math.max(-0.5, f.haste);
  f.crit = Math.min(1, f.crit);
  return f;
}

export function mobFighter(mobId, round) {
  const m = MOBS[mobId];
  const s = scaleFor(round);
  const p = s * (MOB_POWER[mobId]?.[dayOf(round) - 1] ?? 1);
  const st = m.stats || {};
  return {
    name: m.name, kind: 'mob', mob: mobId, scale: s,
    maxHp: Math.round(m.hp * p), atk: 0, def: m.def, crit: st.crit ?? 0.05, haste: st.haste || 0,
    lifesteal: st.lifesteal || 0, resist: st.resist || 0, evasion: st.evasion || 0, critDmg: st.critDmg || 0,
    thorns: st.thorns ? Math.round(st.thorns * s) : 0, pen: st.pen || 0,
    regen: m.regen ? Math.round(m.regen * s) : 0,
    weapon: { min: Math.round(m.min * p), max: Math.round(m.max * p), interval: m.interval, magic: !!m.magic, firstSwing: null, statusMult: 1 },
    onHit: m.onHit ? m.onHit.slice() : [],
    triggers: (m.triggers || []).map((tr) => ({ ...tr, effect: scaledEffect(tr.effect, s) })),
    sets: {}, mods: m.mods || {},
  };
}

export function headline(f) {
  const avg = (f.weapon.min + f.weapon.max) / 2 + f.atk;
  const interval = f.weapon.interval / Math.max(0.2, 1 + f.haste);
  const dps = (avg * (1 + Math.min(1, f.crit) * (0.5 + (f.critDmg || 0)))) / interval;
  const ehp = (f.maxHp * (1 + f.def / 15)) / (1 - Math.min(0.4, f.evasion || 0));
  return { dps: Math.round(dps * 10) / 10, ehp: Math.round(ehp) };
}

export function rollRarity(tier, rng, bump = false, day = 1) {
  let r = rng.weighted(rarityOdds(tier, day));
  if (bump) r = RARITIES[r].next;
  return r;
}

// `count` drops from a pool of item ids, distinct where the pool allows it.
export function rollLoot(pool, tier, round, rng, bump = false, day = 1, count = 3) {
  const picks = rng.shuffle(pool);
  const out = [];
  for (let i = 0; i < count; i++) {
    const id = picks[i % picks.length];
    let rarity = rollRarity(tier, rng, bump, day);
    if (ITEMS[id].relic && rarity === 'common') rarity = 'rare'; // relics are never common
    out.push(rollInstance(id, rarity, round, rng));
  }
  return out;
}

// Human-readable stat lines for an instance, for cards and sheets.
export function statLines(inst) {
  const def = ITEMS[inst.item];
  const st = instanceStats(inst);
  const lines = perkLines(inst);
  if (def.slot === 'weapon') {
    const wt = WEAPON_TYPES[def.type];
    lines.push(`${st.min}–${st.max} dmg · ${st.interval}s`);
    lines.push(def.replaceOnHit ? wt.sig.split(',')[0] : wt.sig);
  }
  for (const oh of def.onHit || []) lines.push(`${Math.round(oh.chance * 100)}% ${cap(oh.apply)} on hit`);
  const fmt = { hp: (v) => `+${v} HP`, def: (v) => `${v >= 0 ? '+' : ''}${v} Def`, atk: (v) => `+${v} Atk`,
    crit: (v) => `+${Math.round(v * 100)}% Crit`, haste: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}% Haste`,
    resist: (v) => `+${Math.round(v * 100)}% Resist`, lifesteal: (v) => `+${Math.round(v * 100)}% Lifesteal`,
    evasion: (v) => `+${Math.round(v * 100)}% Evasion`, critDmg: (v) => `+${Math.round(v * 100)}% Crit dmg`,
    thorns: (v) => `+${v} Thorns`, pen: (v) => `Pierce ${v}` };
  for (const k of Object.keys(fmt)) if (st[k]) lines.push(fmt[k](st[k]));
  for (const oh of st.statusOnHit) lines.push(`+${Math.round(oh.chance * 100)}% ${cap(oh.apply)} on hit`);
  for (const [k, v] of Object.entries(def.mods?.vs || {})) lines.push(`+${Math.round(v * 100)}% dmg vs ${cap(k)}`);
  if (def.mods?.execute) lines.push(`+${Math.round(def.mods.execute.pct * 100)}% dmg vs foes under ${Math.round(def.mods.execute.below * 100)}% HP`);
  if (def.mods?.rage) lines.push(`+${Math.round(def.mods.rage.pct * 100)}% dmg while under ${Math.round(def.mods.rage.below * 100)}% HP`);
  if (def.desc) {
    const scaled = def.effect ? scaledEffect(def.effect, power(inst)) : null;
    let d = def.desc;
    if (scaled) for (const k of ['heal', 'damage', 'shield']) if (scaled[k]) d = d.replace(String(def.effect[k]), String(scaled[k]));
    // a relic's rule is the point of it, so it leads (after any perks)
    if (def.relic) lines.splice((inst.perks || []).length, 0, d);
    else lines.push(d);
  }
  return lines;
}

// Perk descriptions with numbers scaled like the item's, marked with ✦.
export function perkLines(inst) {
  return (inst.perks || []).map((id) => {
    const p = PERKS[id];
    if (!p) return null;
    let label = p.label;
    if (p.effect) {
      const scaled = scaledEffect(p.effect, power(inst));
      for (const k of ['heal', 'damage', 'shield']) if (p.effect[k]) label = label.replace(String(p.effect[k]), String(scaled[k]));
    }
    return `✦ ${label}`;
  }).filter(Boolean);
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
