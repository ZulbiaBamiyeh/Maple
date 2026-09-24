// Random events, a few per run, between hunts. Each is a character with an
// offer: a gremlin's trade, a demon's bargain, a ghost that re-stitches your
// gear. Pure logic, no DOM: the event screen reads `eventOptions(run)` and
// calls `chooseEvent(run, key, uid)`.
//
// Options that need an item carry `pick`, a filter for which of your items
// qualify; the screen asks for one and passes its uid.

import { Rng, hash } from './rng.js';
import { ITEMS, RARITIES, FAMILIES, KEYSTONES, SLOTS, ROUNDS, DUEL_ROUNDS, slotKind } from './data.js';
import { rollInstance, rollPerk, setCounts } from './items.js';

export const EVENTS = {
  gremlin: { name: 'Gremlin Trader', line: '"Shiny thing! Gimme, gimme. I give you shinier. Probably."' },
  demon: { name: 'The Crimson Bargain', line: '"Power, little hero. Only a small price. Sign in red."' },
  tailor: { name: 'Ghostly Tailor', line: '"Such poor stitching. Let me make it match, dearie."' },
  smith: { name: 'Dwarf Smith', line: '"Bring it to the anvil. I\'ll hammer the luck back into it."' },
  mimic: { name: 'A Suspicious Chest', line: 'A chest sits alone in the dark. It is breathing. Probably.' },
  shrine: { name: 'Echo Shrine', line: 'Whatever you lay on the altar rings back twice.' },
  well: { name: 'Fortune Well', line: 'Coins glitter far below. Something down there is counting.' },
};
export const EVENT_IDS = Object.keys(EVENTS);
export const EVENTS_PER_RUN = 4;

// Four event rounds, one per stretch of the run, on hunts only (never the
// first hunt, never a duel), each with a different event.
export function planEvents(seed) {
  const r = new Rng(hash(seed, 'events'));
  const ids = r.shuffle(EVENT_IDS).slice(0, EVENTS_PER_RUN);
  const cut = (k) => Math.round(2 + ((ROUNDS - 2) * k) / EVENTS_PER_RUN);
  return ids.map((id, k) => {
    const pool = [];
    for (let round = cut(k); round < cut(k + 1); round++) if (!DUEL_ROUNDS.includes(round)) pool.push(round);
    return { id, round: r.pick(pool) };
  });
}

const owned = (run) => [...run.bag, ...Object.values(run.equip)].filter(Boolean);
const tradeable = (i) => !ITEMS[i.item].relic;
const rng = (run) => new Rng(hash(run.seed, run.round, 'event', run.event.id, run.event.tries || 0));

// A random piece for a slot kind, from any family (no relics or keystones).
function randomPiece(r, kind, rarity, round, filter = () => true) {
  const pool = Object.keys(ITEMS).filter((id) => {
    const it = ITEMS[id];
    return !it.relic && !it.keystone && it.family && slotKind(it.slot) === kind && filter(it);
  });
  return rollInstance(r.pick(pool), rarity, round, r);
}
const up = (rar) => RARITIES[rar].next;
const down = (rar) => (rar === 'epic' ? 'rare' : 'common');
// The family you're building: most distinct pieces owned.
function mainFamily(run, not = null) {
  const counts = setCounts(Object.fromEntries(owned(run).map((i, k) => [k, i])));
  return Object.keys(counts).filter((f) => f !== not).sort((a, b) => counts[b] - counts[a])[0] || null;
}
// Swap `old` for `inst` wherever `old` is.
function replace(run, old, inst) {
  const slot = SLOTS.find((s) => run.equip[s]?.uid === old.uid);
  if (slot && slotKind(ITEMS[inst.item].slot) === slotKind(slot)) run.equip[slot] = inst;
  else {
    run.discard(old.uid);
    if (!run.bagFull()) run.bag.push(inst);
    else run.gold += 1;
  }
}
const name = (inst) => `${RARITIES[inst.rarity].name} ${ITEMS[inst.item].name}`;

export function eventOptions(run) {
  const ev = run.event;
  if (!ev) return [];
  const leave = { key: 'leave', label: 'Walk away', detail: '' };
  switch (ev.id) {
    case 'gremlin':
      return [
        { key: 'trade', label: 'Trade an item', detail: 'For a random piece of the same kind. Could be rarer. Could be worse.', pick: tradeable },
        { key: 'junk', label: 'Buy his junk · 5g', detail: 'A random piece, any rarity.', disabled: run.gold < 5 || run.bagFull() },
        leave,
      ];
    case 'demon':
      return [
        { key: 'blood', label: 'Blood pact · lose a life', detail: 'An Epic keystone.', disabled: run.lives <= 1 },
        { key: 'brand', label: 'Soul brand · −12% max HP', detail: 'A relic. The brand lasts the whole run.' },
        leave,
      ];
    case 'tailor': {
      const fam = mainFamily(run);
      return [
        { key: 'stitch', label: 'Re-stitch an item', detail: fam ? `Into a ${FAMILIES[fam].set.name} piece, keeping its rarity and perks.` : 'Into a piece of the family you wear most.',
          pick: (i) => tradeable(i) && !ITEMS[i.item].keystone && !!fam && ITEMS[i.item].family !== fam, disabled: !fam },
        { key: 'lining', label: 'Take the silk lining', detail: '+8 max HP for the rest of the run.' },
        leave,
      ];
    }
    case 'smith':
      return [
        { key: 'reforge', label: 'Reforge an item', detail: 'New affixes and perks, same rarity. Free.', pick: (i) => tradeable(i) && RARITIES[i.rarity].affixes > 0 },
        { key: 'hone', label: 'Hone an item · 8g', detail: 'One rarity up.', pick: (i) => tradeable(i) && i.rarity !== 'epic', disabled: run.gold < 8 },
        leave,
      ];
    case 'mimic':
      return [
        { key: 'open', label: 'Open it', detail: 'Treasure that fits your build... if it\'s a chest.', disabled: run.bagFull() },
        { key: 'kick', label: 'Kick it', detail: 'Whatever it is, some coins fall out.' },
        leave,
      ];
    case 'shrine':
      return [
        { key: 'echo', label: 'Echo an item · −8% max HP', detail: 'A copy at the same rarity. Two of a kind can merge.',
          pick: (i) => tradeable(i) && !ITEMS[i.item].keystone, disabled: run.bagFull() },
        { key: 'pray', label: 'Pray', detail: '+1 loot reroll.' },
        leave,
      ];
    case 'well':
      return [
        { key: 'coin', label: 'Toss 5 gold', detail: 'Half the time, 15 comes back.', disabled: run.gold < 5 },
        { key: 'drop', label: 'Drop an item in', detail: 'Something one rarity higher floats up. Same kind of piece.',
          pick: (i) => tradeable(i) && !ITEMS[i.item].keystone && i.rarity !== 'epic' },
        leave,
      ];
    default:
      return [leave];
  }
}

// Apply a choice. Returns the outcome line and any item gained, and marks the
// event done.
export function chooseEvent(run, key, uid) {
  const ev = run.event;
  const opt = eventOptions(run).find((o) => o.key === key);
  if (!ev || ev.result || !opt || opt.disabled) return null;
  const inst = uid ? run.find(uid) : null;
  if (opt.pick && (!inst || !opt.pick(inst))) return null;
  const r = rng(run);
  const round = run.round;
  let text = '';
  let gained = null;

  switch (`${ev.id}:${key}`) {
    case 'gremlin:trade': {
      const roll = r.next();
      const rarity = roll < 0.5 ? up(inst.rarity) : roll < 0.85 ? inst.rarity : down(inst.rarity);
      gained = randomPiece(r, slotKind(ITEMS[inst.item].slot), rarity, Math.max(round, inst.round), (it) => it.id !== inst.item);
      replace(run, inst, gained);
      text = rarity === up(inst.rarity) && rarity !== inst.rarity ? `The gremlin cackles and hands over a ${name(gained)}. A good trade!`
        : rarity === inst.rarity ? `He sniffs your ${ITEMS[inst.item].name} and swaps it for a ${name(gained)}.`
          : `He's gone before you look. A ${name(gained)}. Hm.`;
      break;
    }
    case 'gremlin:junk': {
      run.gold -= 5;
      const rar = r.weighted([['common', 55], ['rare', 35], ['epic', 10]]);
      gained = randomPiece(r, r.pick(['weapon', 'hat', 'top', 'gloves', 'shoes', 'trinket']), rar, round);
      run.bag.push(gained);
      text = `Out of a sack: a ${name(gained)}.`;
      break;
    }
    case 'demon:blood': {
      run.lives--;
      const have = new Set(owned(run).map((i) => i.item));
      gained = rollInstance(r.pick(KEYSTONES.filter((id) => !have.has(id))), 'epic', round, r);
      place(run, gained);
      text = `A drop of your blood hisses on the page. The ${ITEMS[gained.item].name} is yours.`;
      break;
    }
    case 'demon:brand': {
      run.boons.hpMult = Math.round(run.boons.hpMult * 0.88 * 100) / 100;
      const relics = Object.keys(ITEMS).filter((id) => ITEMS[id].relic && !owned(run).some((i) => i.item === id));
      gained = rollInstance(r.pick(relics), r.chance(0.35) ? 'epic' : 'rare', round, r);
      place(run, gained);
      text = `The brand burns cold. In your hand: the ${ITEMS[gained.item].name}.`;
      break;
    }
    case 'tailor:stitch': {
      const fam = mainFamily(run, ITEMS[inst.item].family);
      const kind = slotKind(ITEMS[inst.item].slot);
      const same = Object.keys(ITEMS).filter((id) => ITEMS[id].family === fam && slotKind(ITEMS[id].slot) === kind);
      const any = Object.keys(ITEMS).filter((id) => ITEMS[id].family === fam && !ITEMS[id].relic);
      const id = r.pick(same.length ? same : any);
      gained = { ...rollInstance(id, inst.rarity, Math.max(round, inst.round), r), affixes: inst.affixes, perks: inst.perks };
      replace(run, inst, gained);
      text = `Snip, stitch, pull. Your ${ITEMS[inst.item].name} is now a ${ITEMS[id].name}.`;
      break;
    }
    case 'tailor:lining':
      run.boons.hpFlat += 8;
      text = 'Soft as moonlight. You feel sturdier. (+8 max HP)';
      break;
    case 'smith:reforge': {
      const fresh = rollInstance(inst.item, inst.rarity, inst.round, r);
      if (!fresh.perks.length && inst.rarity !== 'common') fresh.perks = [rollPerk(ITEMS[inst.item], r)];
      Object.assign(inst, { affixes: fresh.affixes, perks: fresh.perks });
      text = `CLANG. CLANG. The ${ITEMS[inst.item].name} cools with new edges.`;
      break;
    }
    case 'smith:hone': {
      run.gold -= 8;
      const rarity = up(inst.rarity);
      const fresh = rollInstance(inst.item, rarity, Math.max(round, inst.round), r);
      fresh.affixes = [...inst.affixes, ...fresh.affixes].filter((x, k, a) => a.findIndex((y) => y.stat === x.stat) === k).slice(0, RARITIES[rarity].affixes);
      fresh.perks = [...new Set([...(inst.perks || []), ...fresh.perks])].slice(0, 2);
      if (!fresh.perks.length) fresh.perks = [rollPerk(ITEMS[inst.item], r)];
      replace(run, inst, fresh);
      gained = fresh;
      text = `Honed to a ${name(fresh)}.`;
      break;
    }
    case 'mimic:open':
      if (r.chance(0.65)) {
        const fam = mainFamily(run);
        const have = new Set(owned(run).map((i) => i.item));
        const pool = Object.keys(ITEMS).filter((id) => ITEMS[id].family && !ITEMS[id].relic && (!fam || ITEMS[id].family === fam) && !have.has(id));
        const pick = pool.length ? r.pick(pool) : r.pick(Object.keys(ITEMS).filter((id) => ITEMS[id].family && !ITEMS[id].relic));
        gained = rollInstance(pick, r.chance(0.4) ? 'epic' : 'rare', round, r);
        run.bag.push(gained);
        text = `Just a chest! Inside: a ${name(gained)}.`;
      } else {
        const lost = Math.ceil(run.gold / 2);
        run.gold -= lost;
        text = lost ? `TEETH. The mimic snaps up ${lost} gold and scuttles off.` : 'TEETH. It finds your purse empty, and scuttles off in disgust.';
      }
      break;
    case 'mimic:kick': {
      const g = 3 + r.int(0, 3);
      run.gold += g;
      text = `Clunk. ${g} coins roll out. Something inside grumbles.`;
      break;
    }
    case 'shrine:echo': {
      run.boons.hpMult = Math.round(run.boons.hpMult * 0.92 * 100) / 100;
      gained = { ...rollInstance(inst.item, inst.rarity, inst.round, r), affixes: inst.affixes, perks: inst.perks };
      run.bag.push(gained);
      text = `The altar rings. Two ${ITEMS[inst.item].name}s now, and you feel a little thinner.`;
      break;
    }
    case 'shrine:pray':
      run.rerolls += 1;
      text = 'A calm settles. (+1 loot reroll)';
      break;
    case 'well:coin':
      run.gold -= 5;
      if (r.chance(0.5)) { run.gold += 15; text = 'Plink... and a splash of 15 gold comes back up!'; }
      else text = 'Plink. Nothing. Something below giggles.';
      break;
    case 'well:drop': {
      gained = randomPiece(r, slotKind(ITEMS[inst.item].slot), up(inst.rarity), Math.max(round, inst.round), (it) => it.id !== inst.item);
      replace(run, inst, gained);
      text = `The water glows. Up floats a ${name(gained)}.`;
      break;
    }
    default:
      text = 'You leave it be.';
  }
  ev.result = { text, gained: gained?.uid || null };
  return ev.result;
}

// A new item: equip it if its slot is free, else the bag (or sell if full).
function place(run, inst) {
  const slot = run.slotFor(inst);
  if (!run.equip[slot]) run.equip[slot] = inst;
  else if (!run.bagFull()) run.bag.push(inst);
  else run.gold += 2;
}
