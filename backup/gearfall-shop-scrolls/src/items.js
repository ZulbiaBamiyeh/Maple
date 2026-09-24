// Item instances, build -> fighter conversion, and the headline numbers.

import {
  ITEMS, WEAPON_TYPES, FAMILIES, BASE, RESIST_CAP, MOBS, AFFIXES, RARITIES, RARITY_ODDS,
  MAIN_STAT, SCROLLS, UPGRADE_SLOTS, slotKind, scaleFor,
} from './data.js';

let uidCounter = 1;
export const newUid = () => 'i' + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const PCT = new Set(['crit', 'haste', 'resist', 'lifesteal']);
const roundStat = (stat, v) => (PCT.has(stat) ? Math.round(v * 100) / 100 : Math.round(v));

export function rollInstance(itemId, rarity, round, rng) {
  const def = ITEMS[itemId];
  const scale = scaleFor(round);
  const n = RARITIES[rarity].affixes;
  const pool = Object.keys(AFFIXES).filter((a) => a !== 'status' || (def.family && FAMILIES[def.family]));
  const affixes = rng.shuffle(pool).slice(0, n).map((stat) => ({
    stat, value: stat === 'status' ? AFFIXES.status.value : AFFIXES[stat].value,
  }));
  return { uid: newUid(), item: itemId, rarity, round, scale, affixes, upgrades: { used: 0, bonus: 0 }, glow: false };
}

// Ghost builds are written without uid/scale; fill those in. A real build's
// items dropped over earlier rounds, so ghost gear rolls two rounds behind.
export function hydrate(inst, round, lag = 2) {
  const r = inst.round || Math.max(1, round - lag);
  return { uid: newUid(), round: r, scale: scaleFor(r), glow: false, affixes: [], upgrades: { used: 0, bonus: 0 }, ...inst };
}

// Final numbers for one instance, rounding the way the UI shows them.
export function instanceStats(inst) {
  const def = ITEMS[inst.item];
  const kind = slotKind(def.slot);
  const s = inst.scale;
  const out = { hp: 0, def: 0, atk: 0, crit: 0, haste: 0, resist: 0, lifesteal: 0 };
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
      out[a.stat] = roundStat(a.stat, out[a.stat] + a.value * s);
    }
  }

  const bonus = inst.upgrades?.bonus || 0;
  if (bonus) {
    const ms = MAIN_STAT[kind];
    if (ms.stat === 'dmg') { out.min += bonus; out.max += bonus; }
    else out[ms.stat] = roundStat(ms.stat, out[ms.stat] + bonus * ms.per);
  }
  out.statusOnHit = statusOnHit;
  return out;
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
    lifesteal: BASE.lifesteal, resist: BASE.resist, regen: 0,
    weapon: { min: 3, max: 5, interval: 1.0, magic: false, firstSwing: null, statusMult: 1 },
    onHit: [], triggers: [], sets: {},
  };
  const equip = build.equip || {};
  for (const [slot, inst] of Object.entries(equip)) {
    if (!inst) continue;
    const def = ITEMS[inst.item];
    const st = instanceStats(inst);
    f.maxHp += st.hp; f.atk += st.atk; f.def += st.def; f.crit += st.crit;
    f.haste += st.haste; f.resist += st.resist; f.lifesteal += st.lifesteal;
    f.onHit.push(...st.statusOnHit);
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
      f.triggers.push({ trigger: def.trigger, effect: scaledEffect(def.effect, inst.scale), source: def.name, slot });
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
  }
  f.resist = Math.min(RESIST_CAP, f.resist);
  f.haste = Math.max(-0.5, f.haste);
  f.crit = Math.min(1, f.crit);
  return f;
}

export function mobFighter(mobId, round) {
  const m = MOBS[mobId];
  const s = scaleFor(round);
  return {
    name: m.name, kind: 'mob', mob: mobId, scale: s,
    maxHp: Math.round(m.hp * s), atk: 0, def: m.def, crit: 0.05, haste: 0, lifesteal: 0, resist: 0,
    regen: m.regen ? Math.round(m.regen * s) : 0,
    weapon: { min: Math.round(m.min * s), max: Math.round(m.max * s), interval: m.interval, magic: !!m.magic, firstSwing: null, statusMult: 1 },
    onHit: m.onHit ? m.onHit.slice() : [], triggers: [], sets: {},
  };
}

export function headline(f) {
  const avg = (f.weapon.min + f.weapon.max) / 2 + f.atk;
  const interval = f.weapon.interval / Math.max(0.2, 1 + f.haste);
  const dps = (avg * (1 + Math.min(1, f.crit) * 0.5)) / interval;
  const ehp = f.maxHp * (1 + f.def / 15);
  return { dps: Math.round(dps * 10) / 10, ehp: Math.round(ehp) };
}

export function rollRarity(tier, rng, bump = false) {
  let r = rng.weighted(RARITY_ODDS[tier]);
  if (bump) r = RARITIES[r].next;
  return r;
}

// Three drops from a pool of item ids, distinct where the pool allows it.
export function rollLoot(pool, tier, round, rng, bump = false) {
  const picks = rng.shuffle(pool);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const id = picks[i % picks.length];
    out.push(rollInstance(id, rollRarity(tier, rng, bump), round, rng));
  }
  return out;
}

export function scrapValue(inst) {
  return RARITIES[inst.rarity].scrap;
}

export function applyScroll(inst, scrollId, rng) {
  const sc = SCROLLS[scrollId];
  if ((inst.upgrades.used || 0) >= UPGRADE_SLOTS) return null;
  inst.upgrades.used++;
  const ok = rng.chance(sc.chance);
  if (ok) {
    inst.upgrades.bonus += sc.bonus;
    if (sc.glow) inst.glow = true;
  }
  return ok;
}

// Human-readable stat lines for an instance, for cards and sheets.
export function statLines(inst) {
  const def = ITEMS[inst.item];
  const st = instanceStats(inst);
  const lines = [];
  if (def.slot === 'weapon') {
    const wt = WEAPON_TYPES[def.type];
    lines.push(`${st.min}–${st.max} dmg · ${st.interval}s`);
    lines.push(wt.sig);
    for (const oh of def.onHit || []) lines.push(`${Math.round(oh.chance * 100)}% ${cap(oh.apply)}`);
  }
  const fmt = { hp: (v) => `+${v} HP`, def: (v) => `${v >= 0 ? '+' : ''}${v} Def`, atk: (v) => `+${v} Atk`,
    crit: (v) => `+${Math.round(v * 100)}% Crit`, haste: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}% Haste`,
    resist: (v) => `+${Math.round(v * 100)}% Resist`, lifesteal: (v) => `+${Math.round(v * 100)}% Lifesteal` };
  for (const k of Object.keys(fmt)) if (st[k]) lines.push(fmt[k](st[k]));
  for (const oh of st.statusOnHit) lines.push(`+${Math.round(oh.chance * 100)}% ${cap(oh.apply)} on hit`);
  if (def.desc) {
    const scaled = def.effect ? scaledEffect(def.effect, inst.scale) : null;
    let d = def.desc;
    if (scaled) for (const k of ['heal', 'damage', 'shield']) if (scaled[k]) d = d.replace(String(def.effect[k]), String(scaled[k]));
    lines.push(d);
  }
  return lines;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
