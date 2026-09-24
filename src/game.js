// The run: 9 rounds, 3 lives, hunts and duels. Holds all run state and the
// actions the screens call. No DOM in here.

import { Rng, hash } from './rng.js';
import {
  ITEMS, MOBS, DAYS, dayOf, dayInfo, GHOSTS, SLOTS, LIVES, ROUNDS, DUEL_ROUNDS, BAG_SIZE, slotKind,
} from './data.js';
import {
  rollInstance, hydrate, heroFighter, mobFighter, headline, rollLoot,
} from './items.js';
import { simulate } from './sim.js';
import { GIRL_HAIR, BOY_HAIR } from './art/hero.js';
import { HAIR, SKIN, EYES } from './art/palette.js';

const GIRL_NAMES = ['Mira', 'Luna', 'Suri', 'Nell', 'Ivy', 'Rin', 'Aya', 'Tove', 'Pia', 'Wren'];
const BOY_NAMES = ['Kai', 'Theo', 'Ren', 'Oli', 'Juno', 'Sol', 'Finn', 'Arlo', 'Ezra', 'Tam'];

export function randomLook(rng) {
  const gender = rng.chance(0.5) ? 'girl' : 'boy';
  return {
    gender,
    hair: rng.pick(gender === 'girl' ? GIRL_HAIR : BOY_HAIR),
    hairColor: rng.pick(Object.keys(HAIR)),
    skin: rng.pick(Object.keys(SKIN)),
    eyes: rng.pick(Object.keys(EYES)),
    name: rng.pick(gender === 'girl' ? GIRL_NAMES : BOY_NAMES),
  };
}

// Hand-written rivals' gear rolls a few rounds behind the duel, more so later:
// players only gear up from hunts, and a full rival kit at today's numbers is
// too much.
const ghostLag = (round) => 1 + dayOf(round);
export const isDuel = (round) => DUEL_ROUNDS.includes(round);

// Builds saved from earlier runs on this device, fought alongside the
// hand-written ghosts. main.js fills this from storage at startup.
export const savedGhosts = [];

// A label like "Poison dagger" or "Sword" from what a build wears.
export function archetypeOf(equip) {
  const w = equip.weapon ? ITEMS[equip.weapon.item] : null;
  const type = w ? w.type : 'fists';
  const fams = {};
  for (const inst of Object.values(equip)) {
    const f = inst && ITEMS[inst.item].family;
    if (f) fams[f] = (fams[f] || 0) + 1;
  }
  const top = Object.entries(fams).sort((a, b) => b[1] - a[1])[0];
  const flavor = top && top[1] >= 2 ? { slime: 'Gel', spore: 'Poison', boar: 'Bleed', wisp: 'Frost', golem: 'Stone', imp: 'Ember' }[top[0]] : null;
  const name = type[0].toUpperCase() + type.slice(1);
  return flavor ? `${flavor} ${type}` : name;
}

export class Run {
  constructor(seed = Math.floor(Math.random() * 1e9), look = null) {
    this.seed = seed;
    this.rng = new Rng(hash(seed, 'run'));
    this.look = look || randomLook(this.rng);
    this.round = 1;
    this.lives = LIVES;
    this.wins = 0;
    this.losses = 0;
    this.crown = false;
    this.over = false;
    this.history = [];
    this.equip = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.equip.weapon = rollInstance('wooden_sword', 'common', 1, this.rng);
    this.equip.top = rollInstance('linen_shirt', 'common', 1, this.rng);
    this.bag = [];
    this.offers = null;
    this.ghost = null;
    this.loot = null;
    this.lastFight = null;
    this.stats = { dealt: 0, taken: 0, crits: 0, bestHit: 0, healed: 0 };
    this.rollRound();
  }

  // ---- save / restore (everything except the replay of the last fight)

  toJSON() {
    const { rng, lastFight, ...rest } = this;
    return { v: 1, ...rest };
  }

  static fromJSON(data) {
    if (!data || data.v !== 1) return null;
    const run = Object.create(Run.prototype);
    const { v, ...rest } = data;
    Object.assign(run, rest, { rng: new Rng(hash(data.seed, 'run', data.round)), lastFight: null });
    return run;
  }

  get name() { return this.look.name; }
  get isDuel() { return isDuel(this.round); }
  get day() { return dayOf(this.round); }
  get record() { return `${this.wins}-${this.losses}`; }

  build() {
    return { name: this.name, round: this.round, look: this.look, equip: this.equip };
  }
  fighter(equip = this.equip) {
    return heroFighter({ name: this.name, round: this.round, look: this.look, equip });
  }
  headline(equip = this.equip) {
    return headline(this.fighter(equip));
  }

  // One mob per tier for hunts; a ghost from this round's pool for duels.
  rollRound() {
    const r = new Rng(hash(this.seed, this.round, 'offers'));
    if (this.isDuel) {
      const pool = GHOSTS.filter((g) => g.round === this.round);
      // Past builds of yours from this round, when there are any, show up half the time.
      const mine = savedGhosts.filter((g) => g.round === this.round && g.runSeed !== this.seed);
      const gh = mine.length && r.chance(0.5) ? r.pick(mine) : r.pick(pool);
      this.ghost = {
        ...gh,
        equip: Object.fromEntries(SLOTS.map((s) => [s, gh.equip[s] ? hydrate(gh.equip[s], this.round, ghostLag(this.round)) : null])),
      };
      this.offers = null;
    } else {
      const tiers = dayInfo(this.round).tiers;
      this.offers = ['easy', 'normal', 'elite'].map((t) => r.pick(tiers[t]));
      this.ghost = null;
    }
  }

  // This build as a ghost for future runs: look, record and item rolls.
  snapshot() {
    const equip = {};
    for (const [s, inst] of Object.entries(this.equip)) {
      if (inst) equip[s] = { item: inst.item, rarity: inst.rarity, round: inst.round, affixes: inst.affixes, perks: inst.perks || [] };
    }
    return {
      id: `me-${this.seed}-${this.round}`, name: `Ghost ${this.name}`, record: this.record, round: this.round,
      archetype: archetypeOf(this.equip), look: this.look, equip, mine: true, runSeed: this.seed,
    };
  }

  ghostFighter() {
    return heroFighter({ name: this.ghost.name, round: this.round, look: this.ghost.look, equip: this.ghost.equip });
  }

  // Estimated chance to win against a fighter spec, from a handful of practice
  // fights on seeds the real fight never uses. Draws count as half.
  odds(foe, equip = this.equip, n = 24) {
    const me = this.fighter(equip);
    let score = 0;
    for (let k = 0; k < n; k++) {
      const w = simulate(me, foe, hash(this.seed, this.round, 'preview', k)).winner;
      score += w === 0 ? 1 : w === -1 ? 0.5 : 0;
    }
    return score / n;
  }
  mobOdds(mobId, equip) { return this.odds(mobFighter(mobId, this.round), equip); }

  // Run the fight for this round. target: mob id for hunts, ignored for duels.
  fight(mobId) {
    const seed = hash(this.seed, this.round);
    const me = this.fighter();
    const foe = this.isDuel ? this.ghostFighter() : mobFighter(mobId, this.round);
    const result = simulate(me, foe, seed);
    this.lastFight = { mobId, result, me, foe, duel: this.isDuel };
    return this.lastFight;
  }

  // Apply the outcome of lastFight. Returns a summary for the result banner.
  resolve() {
    const { result, mobId, duel } = this.lastFight;
    const won = result.winner === 0;
    const draw = result.winner === -1;
    const out = { won, draw, duel, lifeLost: false };
    const label = duel ? this.ghost.name : MOBS[mobId].name;
    this.tally(result);
    if (won) {
      this.wins++;
      // Duels pay out a win, never items: gear only comes from hunts.
      if (duel) {
        this.loot = null;
        if (this.round === ROUNDS) this.crown = true;
      } else {
        const lr = new Rng(hash(this.seed, this.round, 'loot'));
        const m = MOBS[mobId];
        this.loot = rollLoot(m.drops, m.tier, this.round, lr, false, this.day);
      }
    } else if (!draw) {
      // Hunts are for loot: losing one just means no drop. Only duels cost a life.
      this.losses++;
      if (duel) {
        this.lives--;
        out.lifeLost = true;
      }
      this.loot = null;
    } else {
      this.loot = null;
    }
    this.history.push({ round: this.round, duel, label, result: won ? 'W' : draw ? 'D' : 'L' });
    if (this.lives <= 0 || (this.round === ROUNDS && !this.loot)) this.over = true;
    return out;
  }

  // Lifetime numbers for the end screen.
  tally(result) {
    const st = this.stats;
    for (const e of result.events) {
      if (e.type === 'hit' && e.src === 0) {
        st.dealt += e.dmg;
        if (e.crit) st.crits++;
        st.bestHit = Math.max(st.bestHit, e.dmg);
      } else if (e.type === 'hit' && e.src === 1) st.taken += e.dmg;
      else if (e.type === 'dot') { if (e.dst === 1) st.dealt += e.dmg; else st.taken += e.dmg; }
      else if (e.type === 'heal' && e.dst === 0) st.healed += e.amt;
    }
  }

  // ---- inventory

  bagFull() { return this.bag.length >= BAG_SIZE; }

  slotFor(inst) {
    const kind = slotKind(ITEMS[inst.item].slot);
    if (kind !== 'trinket') return kind;
    if (!this.equip.trinket1) return 'trinket1';
    if (!this.equip.trinket2) return 'trinket2';
    return 'trinket1';
  }

  // Equipment with `inst` placed in `slot`, for previews.
  withItem(inst, slot = this.slotFor(inst)) {
    return { ...this.equip, [slot]: inst };
  }

  // Take a loot pick. action: 'equip' | 'bag' | 'discard'. slot optional for trinkets.
  // Equipping over a piece moves it to the bag, or discards it if the bag is full.
  takeLoot(inst, action, slot) {
    if (action === 'discard') {
      // leave it behind
    } else if (action === 'bag') {
      if (this.bagFull()) return false;
      this.bag.push(inst);
    } else {
      slot = slot || this.slotFor(inst);
      const old = this.equip[slot];
      this.equip[slot] = inst;
      if (old && !this.bagFull()) this.bag.push(old);
    }
    this.loot = null;
    if (this.round === ROUNDS) this.over = true;
    return true;
  }

  equipFromBag(uid, slot) {
    const i = this.bag.findIndex((x) => x.uid === uid);
    if (i < 0) return;
    const inst = this.bag[i];
    slot = slot || this.slotFor(inst);
    const old = this.equip[slot];
    this.equip[slot] = inst;
    if (old) this.bag[i] = old;
    else this.bag.splice(i, 1);
  }

  unequip(slot) {
    if (!this.equip[slot] || this.bagFull()) return false;
    this.bag.push(this.equip[slot]);
    this.equip[slot] = null;
    return true;
  }

  // Throw an item away (from the bag or off the hero) to make room.
  discard(uid) {
    this.bag = this.bag.filter((x) => x.uid !== uid);
    for (const s of SLOTS) if (this.equip[s]?.uid === uid) this.equip[s] = null;
  }

  find(uid) {
    return this.bag.find((x) => x.uid === uid) || Object.values(this.equip).find((x) => x?.uid === uid);
  }

  next() {
    if (this.over) return;
    this.round++;
    this.lastFight = null;
    this.loot = null;
    this.rollRound();
  }
}
