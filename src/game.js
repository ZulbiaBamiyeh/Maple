// The run: 9 rounds, 3 lives, hunts and duels. Holds all run state and the
// actions the screens call. No DOM in here.

import { Rng, hash } from './rng.js';
import {
  ITEMS, MOBS, TIERS, GHOSTS, SLOTS, LIVES, ROUNDS, DUEL_ROUNDS, BAG_SIZE, SCROLLS, slotKind,
} from './data.js';
import {
  rollInstance, hydrate, heroFighter, mobFighter, headline, rollLoot, scrapValue, applyScroll,
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

export const isDuel = (round) => DUEL_ROUNDS.includes(round);

export class Run {
  constructor(seed = Math.floor(Math.random() * 1e9), look = null) {
    this.seed = seed;
    this.rng = new Rng(hash(seed, 'run'));
    this.look = look || randomLook(this.rng);
    this.round = 1;
    this.lives = LIVES;
    this.gold = 3;
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
    this.rollRound();
  }

  get name() { return this.look.name; }
  get isDuel() { return isDuel(this.round); }
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
      const gh = r.pick(pool);
      this.ghost = {
        ...gh,
        equip: Object.fromEntries(SLOTS.map((s) => [s, gh.equip[s] ? hydrate(gh.equip[s], this.round) : null])),
      };
      this.offers = null;
    } else {
      this.offers = ['easy', 'normal', 'elite'].map((t) => r.pick(TIERS[t].mobs));
      this.ghost = null;
    }
  }

  ghostFighter() {
    return heroFighter({ name: this.ghost.name, round: this.round, look: this.ghost.look, equip: this.ghost.equip });
  }

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
    const out = { won, draw, lifeLost: false, gold: 0 };
    const label = duel ? this.ghost.name : MOBS[mobId].name;
    if (won) {
      this.wins++;
      const lr = new Rng(hash(this.seed, this.round, 'loot'));
      if (duel) {
        const pool = [...new Set(Object.values(this.ghost.equip).filter(Boolean).map((i) => i.item))];
        this.loot = rollLoot(pool, 'normal', this.round, lr, true);
      } else {
        const m = MOBS[mobId];
        this.loot = rollLoot(m.drops, m.tier, this.round, lr);
      }
      // The last duel pays out a Crown, not a drop.
      if (this.round === ROUNDS) { this.crown = true; this.loot = null; }
    } else if (!draw) {
      this.losses++;
      this.lives--;
      this.gold += 2;
      out.lifeLost = true;
      out.gold = 2;
      this.loot = null;
    } else {
      this.loot = null;
    }
    this.history.push({ round: this.round, duel, label, result: won ? 'W' : draw ? 'D' : 'L' });
    if (this.lives <= 0 || (this.round === ROUNDS && !this.loot)) this.over = true;
    return out;
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

  // Take a loot pick. action: 'equip' | 'bag' | 'scrap'. slot optional for trinkets.
  takeLoot(inst, action, slot) {
    if (action === 'scrap') {
      this.gold += scrapValue(inst);
    } else if (action === 'bag') {
      if (this.bagFull()) return false;
      this.bag.push(inst);
    } else {
      slot = slot || this.slotFor(inst);
      const old = this.equip[slot];
      this.equip[slot] = inst;
      if (old) {
        if (this.bagFull()) this.gold += scrapValue(old);
        else this.bag.push(old);
      }
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

  scrap(uid) {
    const i = this.bag.findIndex((x) => x.uid === uid);
    if (i >= 0) {
      this.gold += scrapValue(this.bag[i]);
      this.bag.splice(i, 1);
      return;
    }
    for (const s of SLOTS) {
      if (this.equip[s]?.uid === uid) {
        this.gold += scrapValue(this.equip[s]);
        this.equip[s] = null;
      }
    }
  }

  find(uid) {
    return this.bag.find((x) => x.uid === uid) || Object.values(this.equip).find((x) => x?.uid === uid);
  }

  scroll(uid, scrollId) {
    const inst = this.find(uid);
    const sc = SCROLLS[scrollId];
    if (!inst || this.gold < sc.cost) return null;
    const r = new Rng(hash(this.seed, uid, inst.upgrades.used, scrollId));
    const ok = applyScroll(inst, scrollId, r);
    if (ok === null) return null;
    this.gold -= sc.cost;
    return ok;
  }

  next() {
    if (this.over) return;
    this.round++;
    this.lastFight = null;
    this.loot = null;
    this.rollRound();
  }
}
