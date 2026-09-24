// Entry point: owns the current run and screen, wires screens together, and
// keeps the run saved on this device so a reload never loses it.

import { Run, randomLook, savedGhosts } from './game.js';
import { Rng } from './rng.js';
import { showBattle } from './ui/battle.js';
import { titleScreen, pickScreen, gearScreen, lootScreen, shopScreen, endScreen, menuSheet, buildSheet } from './ui/screens.js';
import { eventScreen } from './ui/event.js';
import { toast, closeSheet } from './ui/common.js';
import { installTooltips } from './ui/tooltip.js';
import { load, save } from './ui/store.js';
import { rollInstance } from './items.js';
import { ROUNDS_PER_DAY, DAYS_IN_RUN } from './data.js';

const app = document.getElementById('app');
installTooltips();
const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');

const lookRng = new Rng(seedParam ? +seedParam : Date.now() & 0xffffffff);
const starterEquip = {
  weapon: rollInstance('wooden_sword', 'common', 1, lookRng),
  top: rollInstance('linen_shirt', 'common', 1, lookRng),
};

// Your own past duel builds, newest first, kept per duel round.
const GHOSTS_PER_ROUND = 6;
// Only builds from the current day layout: rounds meant something else when days were 3 rounds long.
savedGhosts.push(...load('ghosts', []).filter((g) => g.perDay === ROUNDS_PER_DAY));
function keepGhost(run) {
  if (seedParam) return;
  const g = run.snapshot();
  const rest = savedGhosts.filter((x) => x.id !== g.id);
  const sameRound = rest.filter((x) => x.round === g.round).slice(0, GHOSTS_PER_ROUND - 1);
  const others = rest.filter((x) => x.round !== g.round);
  savedGhosts.length = 0;
  savedGhosts.push(g, ...sameRound, ...others);
  save('ghosts', savedGhosts);
}

// Screens that are safe to resume on. A battle resumes on whatever comes after it.
const RESUMABLE = new Set(['pick', 'gear', 'loot', 'shop', 'event', 'end']);

function readSave() {
  const data = load('run');
  // Saved under an older day layout (3-round or 5-day runs): start fresh.
  if (!data || data.perDay !== ROUNDS_PER_DAY || (data.days ?? 5) !== DAYS_IN_RUN) return null;
  const run = Run.fromJSON(data.run);
  if (!run) return null;
  return { run, screen: data.screen, opts: data.opts || {}, name: run.name, round: run.round };
}

const ctx = {
  run: null,
  titleLook: randomLook(lookRng),
  starterEquip,
  screen: 'title',
  opts: {},
  saved: seedParam ? null : readSave(),
  best: load('best', null),
  speed: load('speed', 1),

  go(screen, opts = {}) {
    ctx.screen = screen;
    ctx.opts = opts;
    closeSheet();
    persist();
    render();
    window.scrollTo(0, 0);
  },
  refresh() {
    persist();
    render();
  },

  rerollLook() {
    ctx.titleLook = randomLook(lookRng);
    render();
  },
  startRun() {
    ctx.run = new Run(seedParam ? +seedParam : undefined, ctx.titleLook);
    ctx.saved = null;
    ctx.go(ctx.run.isDuel ? 'gear' : 'pick', ctx.run.isDuel ? { mode: 'duel' } : {});
  },
  continueRun() {
    const sv = ctx.saved;
    ctx.run = sv.run;
    ctx.saved = null;
    if (ctx.run.over) return ctx.go('end');
    // Saves from older versions may point at screens that no longer exist.
    if (!RESUMABLE.has(sv.screen)) return ctx.go(ctx.run.isDuel ? 'gear' : 'pick', ctx.run.isDuel ? { mode: 'duel' } : {});
    ctx.go(sv.screen, sv.opts);
  },
  newRun() {
    ctx.titleLook = randomLook(lookRng);
    ctx.run = null;
    save('run', null);
    ctx.go('title');
  },
  abandon() {
    ctx.run = null;
    ctx.saved = null;
    save('run', null);
    ctx.titleLook = randomLook(lookRng);
    ctx.go('title');
  },

  // The fight is decided and applied before it plays, so a reload mid-battle
  // can't undo the result. The battle screen shows the state from before.
  hunt(mobId) { startFight(mobId); },
  duel() { startFight(); },

  afterLoot() {
    if (ctx.run.over) return finishRun();
    if (ctx.run.event) return ctx.go('event');
    ctx.go('gear', { mode: 'hub' });
  },
  nextRound() {
    ctx.run.next();
    ctx.go(ctx.run.isDuel ? 'gear' : 'pick', ctx.run.isDuel ? { mode: 'duel' } : {});
  },
  openMenu() { menuSheet(ctx); },
  leaveEvent() {
    ctx.run.endEvent();
    ctx.go('gear', { mode: 'hub' });
  },
  leaveShop() {
    ctx.run.leaveShop();
    ctx.nextRound();
  },
};

function startFight(mobId) {
  const run = ctx.run;
  const before = { lives: run.lives, history: run.history.slice() };
  // Entering a duel saves your build as a ghost for future runs.
  if (run.isDuel) keepGhost(run);
  const fight = run.fight(mobId);
  const out = run.resolve();
  const next = run.over ? 'end' : run.loot ? 'loot' : run.shop ? 'shop' : run.event ? 'event' : 'gear';
  // Save the outcome now, pointing at the screen that follows the battle.
  if (!seedParam) save('run', { run, screen: next, opts: next === 'gear' ? { mode: 'hub' } : {}, perDay: ROUNDS_PER_DAY, days: DAYS_IN_RUN });
  if (run.over) recordBest(run);
  ctx.screen = 'battle';
  ctx.opts = { fight, out, before };
  closeSheet();
  render();
  window.scrollTo(0, 0);
}

function afterBattle() {
  const run = ctx.run;
  const { out } = ctx.opts;
  if (out.lifeLost) toast('−1 life', 'bad');
  if (out.won && out.duel && !run.over) toast(`Duel won · record ${run.record}`, 'good');
  if (out.draw) toast('Draw — no life lost');
  if (out.gold) toast(`+${out.gold} gold`, 'gold');
  if (run.over) return ctx.go('end');
  if (run.loot) return ctx.go('loot');
  if (run.shop) return ctx.go('shop');
  if (run.event) return ctx.go('event');
  ctx.go('gear', { mode: 'hub' });
}

function finishRun() {
  recordBest(ctx.run);
  ctx.go('end');
}

function recordBest(run) {
  if (run._recorded) return;
  run._recorded = true;
  const b = ctx.best || { runs: 0, crowns: 0, bestWins: 0 };
  b.runs++;
  if (run.crown) b.crowns++;
  b.bestWins = Math.max(b.bestWins, run.duelWins ?? 0);
  ctx.best = b;
  save('best', b);
}

function persist() {
  if (seedParam) return; // seeded test runs don't touch the real save
  if (!ctx.run) return;
  if (RESUMABLE.has(ctx.screen)) {
    save('run', { run: ctx.run, screen: ctx.screen, opts: { mode: ctx.opts.mode, back: ctx.opts.back }, perDay: ROUNDS_PER_DAY, days: DAYS_IN_RUN });
  }
}

function render() {
  switch (ctx.screen) {
    case 'title': return titleScreen(app, ctx);
    case 'pick': return pickScreen(app, ctx);
    case 'gear': return gearScreen(app, ctx, ctx.opts);
    case 'loot': return lootScreen(app, ctx);
    case 'shop': return shopScreen(app, ctx);
    case 'event': return eventScreen(app, ctx);
    case 'end': return endScreen(app, ctx);
    case 'battle': return showBattle(app, ctx.run, ctx.opts.fight, afterBattle, {
      before: ctx.opts.before, out: ctx.opts.out, speed: ctx.speed,
      onSpeed: (v) => { ctx.speed = v; save('speed', v); },
      showFoe: (onClose) => buildSheet(ctx, onClose),
    });
    default: return titleScreen(app, ctx);
  }
}

// The HUD menu button lives on many screens; catch it once here.
document.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-menu]')) ctx.openMenu();
});

// Re-render layouts that depend on width (whole-number sprite scales).
let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  if (Math.abs(window.innerWidth - lastW) > 40 && ctx.screen !== 'battle') { lastW = window.innerWidth; render(); }
});

render();
