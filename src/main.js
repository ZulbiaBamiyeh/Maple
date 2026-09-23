// Entry point: owns the current run and screen, and wires screens together.

import { Run, randomLook } from './game.js';
import { Rng } from './rng.js';
import { showBattle } from './ui/battle.js';
import { titleScreen, pickScreen, gearScreen, lootScreen, endScreen } from './ui/screens.js';
import { toast, closeSheet } from './ui/common.js';
import { rollInstance } from './items.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');

const lookRng = new Rng(seedParam ? +seedParam : Date.now() & 0xffffffff);
const starterEquip = {
  weapon: rollInstance('wooden_sword', 'common', 1, lookRng),
  top: rollInstance('linen_shirt', 'common', 1, lookRng),
};

const ctx = {
  run: null,
  titleLook: randomLook(lookRng),
  starterEquip,
  screen: 'title',
  opts: {},

  go(screen, opts = {}) {
    ctx.screen = screen;
    ctx.opts = opts;
    closeSheet();
    render();
    window.scrollTo(0, 0);
  },
  refresh() { render(); },

  rerollLook() {
    ctx.titleLook = randomLook(lookRng);
    render();
  },
  startRun() {
    ctx.run = new Run(seedParam ? +seedParam : undefined, ctx.titleLook);
    ctx.go(ctx.run.isDuel ? 'gear' : 'pick', ctx.run.isDuel ? { mode: 'duel' } : {});
  },
  newRun() {
    ctx.titleLook = randomLook(lookRng);
    ctx.run = null;
    ctx.go('title');
  },

  hunt(mobId) {
    const fight = ctx.run.fight(mobId);
    ctx.go('battle', { fight });
  },
  duel() {
    const fight = ctx.run.fight();
    ctx.go('battle', { fight });
  },
  afterBattle() {
    const run = ctx.run;
    const out = run.resolve();
    if (out.lifeLost) toast(`−1 life · +${out.gold} gold`, 'bad');
    if (out.draw) toast('Draw — no life lost', '');
    if (run.over) return ctx.go('end');
    if (run.loot) return ctx.go('loot');
    ctx.go('gear', { mode: 'hub' });
  },
  afterLoot() {
    if (ctx.run.over) return ctx.go('end');
    ctx.go('gear', { mode: 'hub' });
  },
  nextRound() {
    ctx.run.next();
    ctx.go(ctx.run.isDuel ? 'gear' : 'pick', ctx.run.isDuel ? { mode: 'duel' } : {});
  },
};

function render() {
  switch (ctx.screen) {
    case 'title': return titleScreen(app, ctx);
    case 'pick': return pickScreen(app, ctx);
    case 'gear': return gearScreen(app, ctx, ctx.opts);
    case 'loot': return lootScreen(app, ctx);
    case 'end': return endScreen(app, ctx);
    case 'battle': return showBattle(app, ctx.run, ctx.opts.fight, ctx.afterBattle);
    default: return titleScreen(app, ctx);
  }
}

// Re-render layouts that depend on width (whole-number sprite scales).
let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  if (Math.abs(window.innerWidth - lastW) > 40 && ctx.screen !== 'battle') { lastW = window.innerWidth; render(); }
});

render();
