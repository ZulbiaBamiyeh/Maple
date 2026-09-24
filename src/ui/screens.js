// Every screen except the battle. Each takes the app element and a context
// object with the run and navigation callbacks.
//
// Every screen fits one phone screen without scrolling: the flexible part of
// each layout (card list, hero stage) takes whatever height is left, and
// sprites pick a whole-number scale that fits the space they were given.

import {
  ITEMS, MOBS, FAMILIES, RARITIES, rarityOdds, BAG_SIZE,
  slotKind, scaleFor, STATUSES, dayInfo, dayOf, slotOf, DAYS_IN_RUN, ROUNDS, ROUNDS_PER_DAY, STAT_HELP, SHOP_REROLL, WIN_TARGET, LIVES,
} from '../data.js';
import { statLines, perkLines, setCounts, activeSets, headline, mobFighter } from '../items.js';
import { sellPrice } from '../game.js';
import { drawScene } from '../art/scenes.js';
import {
  hud, heroImg, iconImg, mobImg, glyph, statusGlyph, tile, itemName, slotName, cap,
  openSheet, closeSheet, toast, delta, oddsChip,
} from './common.js';

// ---------------------------------------------------------------- stages

function backdrop(el, biome, S, ground) {
  el.querySelector(':scope > canvas.bg')?.remove();
  const w = Math.ceil(el.clientWidth / S) || 60;
  const h = Math.ceil(el.clientHeight / S) || 60;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.className = 'bg';
  c.style.cssText = `width:${w * S}px;height:${h * S}px;top:0;left:50%;margin-left:${-(w * S) / 2}px`;
  drawScene(c.getContext('2d'), w, h, biome, Math.round(h * ground), w + h);
  el.prepend(c);
  return Math.round(h * ground) * S; // ground line in CSS px from the top
}

// Fit each [data-stage="biome,ground,maxScale"]: pick the largest whole-number
// scale whose sprite fits above the ground, paint the backdrop at that scale
// and stand the sprite on the grass.
function fitStages(root) {
  root.querySelectorAll('[data-stage]').forEach((el) => {
    const [biome, g, maxS] = el.dataset.stage.split(',');
    const ground = +g;
    const img = el.querySelector('.spr.hero, .spr.mob');
    const mob = img?.classList.contains('mob');
    const sw = mob ? 32 : 48;
    const sh = mob ? 31 : 42; // rows down to the feet
    const S = Math.max(1, Math.min(+maxS || 5, Math.floor((el.clientHeight * ground - 6) / sh), Math.floor(el.clientWidth / (sw + 2))));
    const groundPx = backdrop(el, biome, S, ground);
    if (!img) return;
    img.querySelectorAll('img').forEach((f) => { f.width = sw * S; f.height = (mob ? 32 : 44) * S; });
    img.style.marginBottom = `${el.clientHeight - groundPx - (mob ? 2 : 3) * S}px`;
  });
}

const fmtPct = (v) => `${Math.round(v * 100)}%`;

// Every stat as an icon cell; the ones this build doesn't use are dimmed.
const STAT_CELLS = [
  ['HP', 'heart', (f) => f.maxHp, () => false],
  ['Atk', 'sword', (f) => f.atk, (f) => !f.atk],
  ['Def', 'armor', (f) => f.def, (f) => !f.def],
  ['Crit', 'star', (f) => fmtPct(f.crit), () => false],
  ['Crit dmg', 'burst', (f) => `×${(1.5 + (f.critDmg || 0)).toFixed(1)}`, (f) => !f.critDmg],
  ['Haste', 'bolt', (f) => fmtPct(f.haste), (f) => !f.haste],
  ['Res', 'ward', (f) => fmtPct(f.resist), (f) => !f.resist],
  ['Evade', 'wing', (f) => fmtPct(f.evasion || 0), (f) => !f.evasion],
  ['Steal', 'blood', (f) => fmtPct(f.lifesteal), (f) => !f.lifesteal],
  ['Regen', 'plus', (f) => `${f.regen}/s`, (f) => !f.regen],
  ['Thorns', 'thorn', (f) => f.thorns || 0, (f) => !f.thorns],
  ['Pierce', 'arrow', (f) => f.pen || 0, (f) => !f.pen],
];
function statCells(f, max = STAT_CELLS.length) {
  let cells = STAT_CELLS.map((c) => [...c, c[3](f)]);
  if (max < cells.length) cells = [...cells.filter((c) => !c[4]), ...cells.filter((c) => c[4])].slice(0, max);
  const short = { 'Crit dmg': 'Crits' };
  return cells.map(([k, icon, val, off]) => `
    <div class="sc ${off(f) ? 'off' : ''}" data-tipstat="${k}">${glyph(icon, 2)}<div><b>${val(f)}</b><span>${short[k] || k}</span></div></div>`).join('');
}

// Defer heavy work (odds) until after the browser paints the screen.
function later(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}


// RELIC / KEYSTONE badge for an item.
const badge = (it) => (it.relic ? '<span class="relic-tag">RELIC</span> ' : it.keystone ? '<span class="key-tag">KEYSTONE</span> ' : '');
// "Barbed 1/4": how far you are into a family's set, counting the bag too.
function setProgress(run, fam, extra = 0) {
  const owned = [...run.bag, ...Object.values(run.equip)].filter(Boolean);
  const worn = setCounts(run.equip)[fam] || 0;
  const have = new Set(owned.filter((i) => ITEMS[i.item].family === fam).map((i) => i.item)).size;
  return { worn, have: have + extra };
}

// ---------------------------------------------------------------- title

export function titleScreen(app, ctx) {
  const sv = ctx.saved;
  const look = sv ? sv.run.look : ctx.titleLook;
  const equip = sv ? sv.run.equip : ctx.starterEquip;
  app.innerHTML = `
    <section class="screen title-wrap">
      <div class="logo" aria-label="ZereshkStory">Zereshk<span class="berry">Story</span></div>
      <div class="stage panel" data-stage="slime,0.86,5">${heroImg(look, equip, 4)}</div>
      <div class="nameplate">${glyph(look.gender === 'girl' ? 'heart' : 'swords', 2)} ${look.name}${sv ? ` <span class="num" style="font-size:12px;color:var(--muted)">R${sv.round} · ${sv.run.record}</span>` : ''}</div>
      ${ctx.best?.runs ? `<div class="bestline num">${bestLine(ctx.best)}</div>` : ''}
      <div class="actions">
        ${sv ? `<button class="btn go wide" id="continue">Continue ▸</button>` : ''}
        ${sv ? '' : '<button class="btn" id="reroll">New look</button>'}
        <button class="btn ${sv ? '' : 'primary'}" id="start">${sv ? 'New run' : 'Start run ▸'}</button>
        <button class="btn icon" data-help aria-label="How to play">?</button>
      </div>
    </section>`;
  fitStages(app);
  app.querySelector('#reroll')?.addEventListener('click', ctx.rerollLook);
  app.querySelector('[data-help]').onclick = helpSheet;
  const start = app.querySelector('#start');
  start.onclick = () => {
    // Starting over discards the saved run, so ask with a second tap.
    if (sv && !start.dataset.armed) {
      start.dataset.armed = '1';
      start.textContent = 'Tap again to abandon';
      start.classList.add('danger');
      return;
    }
    ctx.startRun();
  };
  app.querySelector('#continue')?.addEventListener('click', ctx.continueRun);
}

// ---------------------------------------------------------------- hunt pick

export function pickScreen(app, ctx) {
  const { run } = ctx;
  const cards = run.offers.map((id, i) => {
    const m = MOBS[id];
    const mf = mobFighter(id, run.round);
    const odds = rarityOdds(m.tier, run.day);
    const ap = m.onHit?.[0]?.apply || m.triggers?.find((tr) => tr.effect.apply)?.effect.apply;
    const traitGlyph = ap ? statusGlyph(ap, 2) : m.regen ? statusGlyph('regen', 2) : '';
    return `
    <div class="mobcard panel deal" data-mob="${id}" style="animation-delay:${i * 0.08}s">
      <div class="portrait" data-stage="${m.family},0.86,3">${mobImg(m.sprite, 3)}</div>
      <div class="info">
        <div class="name"><span>${m.name}</span><span class="chip tier-${m.tier}">${cap(m.tier)}</span></div>
        <div class="oddsline" data-odds="${id}"><span class="odds-chip o0">…</span></div>
        <div class="line">HP ${mf.maxHp} · Hit ${mf.weapon.min}–${mf.weapon.max} · ${m.interval}s${m.def ? ` · Def ${m.def}` : ''}</div>
        <div class="traitrow"><span class="chip trait" ${ap ? `data-tipstatus="${ap}"` : ''}>${traitGlyph} ${m.trait}</span></div>
        <div class="drops">${m.drops.map((d) => `<span class="drop ${ITEMS[d].relic ? 'relic-drop' : ITEMS[d].keystone ? 'key-drop' : ''}" data-tipdef="${d}">${iconImg(d, 1.2)}</span>`).join('')}</div>
        <div class="oddsrow">
          <div class="odds" aria-label="Common ${odds[0][1]}%, rare ${odds[1][1]}%, epic ${odds[2][1]}%">
            ${odds.map(([r, w]) => `<span class="${r[0]}" style="width:${w}%"></span>`).join('')}
          </div>
          <span class="set mini ${setProgress(run, m.family).worn >= 2 ? 'on' : ''}" data-tipset="${m.family}">${FAMILIES[m.family].set.name} ${setProgress(run, m.family).worn}/4</span>
        </div>
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      <div class="day-kicker">DAY ${run.day} · ${run.dayInfo().name.toUpperCase()}</div>
      <h2>Choose your hunt</h2>
      <div class="mobs">${cards}</div>
      <div class="actions">
        <button class="btn small" id="gear">Gear</button>
        <button class="btn small" id="bag">Bag ${run.bag.length}/${BAG_SIZE}</button>
      </div>
    </section>`;
  fitStages(app);
  app.querySelectorAll('[data-mob]').forEach((el) => { el.onclick = () => ctx.hunt(el.dataset.mob); });
  app.querySelector('#gear').onclick = () => ctx.go('gear', { mode: 'view' });
  app.querySelector('#bag').onclick = () => ctx.go('gear', { mode: 'view' });
  // Odds take a few practice fights each; fill them in after the first paint.
  later(() => app.querySelectorAll('[data-odds]').forEach((el) => {
    el.innerHTML = oddsChip(run.mobOdds(el.dataset.odds));
  }));
  // A new day gets a short title card the first time its hunt screen shows.
  if (slotOf(run.round) === 1 && run._dayShown !== run.day) {
    run._dayShown = run.day;
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `<div class="n">DAY ${run.day}<span>/${DAYS_IN_RUN}</span></div><div class="t">${run.dayInfo().name}</div>`;
    app.append(card);
    const bye = () => { card.classList.add('out'); setTimeout(() => card.remove(), 300); };
    card.onclick = bye;
    setTimeout(bye, 1700);
  }
}

// ---------------------------------------------------------------- gear hub / duel preview

export function gearScreen(app, ctx, { mode = 'hub', back = null } = {}) {
  const { run } = ctx;
  const me = run.fighter();
  const h = headline(me);
  const prev = ctx.prevHead;
  const pop = ctx.popHero;
  ctx.prevHead = null;
  ctx.popHero = false;
  const deltaBadge = (a, b, fmt) => {
    if (!prev || Math.abs(b - a) < 0.05) return '';
    const up = b > a;
    return `<span class="delta ${up ? 'up-good' : 'down-bad'}">${up ? '▲' : '▼'}${fmt(Math.abs(b - a))}</span>`;
  };
  const counts = setCounts(run.equip);
  const on = new Set(activeSets(run.equip));
  const slotTile = (slot, label) => tile(run.equip[slot], { size: 2, attrs: `data-slot="${slot}"`, label });

  // A duel rival's build stays hidden until the fight starts, like a ghost
  // board in The Bazaar: you prepare for the field, not for one opponent.
  let foeHtml = '';
  if (mode === 'duel') {
    const gh = run.ghost;
    foeHtml = `
      <div class="foe panel">
        <div class="foe-stage" data-stage="duel,0.88,2">${heroImg(gh.look, null, 2, { flip: true, shadow: true })}<span class="mystery">?</span></div>
        <div class="foe-info">
          <div class="kicker">DUEL · DAY ${run.day}</div>
          <div class="name">${gh.name} <span class="chip trait">${gh.record}</span></div>
          ${gh.mine ? '<div class="sub">Your past build</div>' : ''}
        </div>
      </div>`;
  }

  const setChips = Object.entries(counts).map(([fam, n]) => {
    const set = FAMILIES[fam].set;
    return `<span class="set ${on.has(fam) ? 'on' : ''} ${n >= 4 ? 'full' : ''}" data-tipset="${fam}">${set.name} ${Math.min(n, 4)}/4</span>`;
  }).join('');

  const bag = Array.from({ length: BAG_SIZE }, (_, i) => run.bag[i]
    ? tile(run.bag[i], { size: 2, attrs: `data-bag="${run.bag[i].uid}"` })
    : tile(null)).join('');

  const primary = mode === 'duel'
    ? `<button class="btn go" id="primary">Fight ${run.ghost.name} ▸</button>`
    : mode === 'view'
      ? `<button class="btn" id="primary">◂ Back to ${back === 'shop' ? 'shop' : 'hunt'}</button>`
      : `<button class="btn primary" id="primary">${slotOf(run.round + 1) === ROUNDS_PER_DAY ? 'Duel' : slotOf(run.round) === ROUNDS_PER_DAY ? `Day ${dayOf(run.round) + 1}` : 'Next hunt'} ▸</button>`;

  app.innerHTML = `
    ${hud(run)}
    <section class="screen gear ${mode}">
      ${foeHtml}
      <div class="paperdoll panel">
        <div class="col">${slotTile('hat', 'Hat')}${slotTile('top', 'Top')}${slotTile('gloves', 'Gloves')}${slotTile('shoes', 'Shoes')}</div>
        <div class="doll-stage ${pop ? 'pop' : ''}" data-stage="${mode === 'duel' ? 'duel' : run.dayInfo().biome},0.88,5">${heroImg(run.look, run.equip, 4)}${pop ? '<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i><i class="spk s4"></i>' : ''}</div>
        <div class="col">${slotTile('weapon', 'Weapon')}${slotTile('trinket1', 'Trinket')}${slotTile('trinket2', 'Trinket')}</div>
      </div>
      <div class="statpanel panel">
        <div class="big" data-tipstat="DPS">${glyph('swords', 3)}<div><span class="k">DPS ${deltaBadge(prev?.dps, h.dps, (x) => x.toFixed(1))}</span><span class="v">${h.dps}</span></div></div>
        <div class="big" data-tipstat="EHP">${glyph('shield', 3)}<div><span class="k">EHP ${deltaBadge(prev?.ehp, h.ehp, Math.round)}</span><span class="v">${h.ehp}</span></div></div>
        <div class="sgrid">${statCells(me, mode === 'duel' ? 8 : 12)}</div>
      </div>
      <div class="bagpanel panel">
        <div class="baghead"><span>BAG ${run.bag.length}/${BAG_SIZE}</span><span class="sets">${setChips}</span></div>
        <div class="bag">${bag}</div>
      </div>
      <div class="actions">${primary}</div>
    </section>`;
  // Slot tiles shrink with the panel so four always fit down each side.
  const pd = app.querySelector('.paperdoll');
  pd.style.setProperty('--slot', `${Math.max(40, Math.min(56, Math.floor((pd.clientHeight - 16 - 18) / 4)))}px`);
  fitStages(app);

  app.querySelectorAll('[data-slot]').forEach((el) => {
    const inst = run.equip[el.dataset.slot];
    if (inst) el.onclick = () => itemSheet(ctx, inst, { from: 'equip', slot: el.dataset.slot });
  });
  app.querySelectorAll('[data-bag]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.find(el.dataset.bag), { from: 'bag' });
  });
  app.querySelector('#primary').onclick = () => {
    if (mode === 'duel') ctx.duel();
    else if (mode === 'view') ctx.go(back === 'shop' ? 'shop' : 'pick');
    else ctx.nextRound();
  };
}

// ---------------------------------------------------------------- loot

export function lootScreen(app, ctx) {
  const { run } = ctx;
  const before = run.headline();
  const counts = setCounts(run.equip);
  const cards = run.loot.map((inst, i) => {
    const it = ITEMS[inst.item];
    const after = run.headline(run.withItem(inst));
    const tags = [];
    if (after.dps > before.dps + 0.05) tags.push('<span class="tag up">▲ DPS</span>');
    if (after.ehp > before.ehp) tags.push('<span class="tag up">▲ EHP</span>');
    if (it.family) {
      const n = setCounts(run.withItem(inst))[it.family] || 0;
      if (n > (counts[it.family] || 0) && (n === 2 || n === 4)) tags.push(`<span class="tag set" data-tipset="${it.family}">${FAMILIES[it.family].set.name} ${n}/4 ✓</span>`);
    }
    if ([...run.bag, ...Object.values(run.equip)].some((x) => x && x.item === inst.item && x.rarity === inst.rarity && x.rarity !== 'epic')) tags.push('<span class="tag twin">Twin: merge</span>');
    return `
    <div class="lootcard panel deal lc-${inst.rarity}" data-loot="${i}" style="animation-delay:${i * 0.1}s">
      ${tile(inst, { size: 2.5 })}
      <div class="lc-body">
        <div class="nm rc-${inst.rarity}">${it.name}</div>
        <div class="meta">${badge(it)}${RARITIES[inst.rarity].name} ${slotName(inst)}${it.family ? ` · ${FAMILIES[it.family].name}` : ''}</div>
        ${perkLines(inst).length ? `<div class="perkline">${perkLines(inst).join(' ')}</div>` : ''}
        <div class="lines">${statLines(inst).slice(perkLines(inst).length).join(' · ')}</div>
        <div class="cmp"><span>DPS ${delta(before.dps, after.dps)}</span><span>EHP ${delta(before.ehp, after.ehp)}</span></div>
        ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      <h2>Pick your drop</h2>
      <div class="loots">${cards}</div>
      <div class="actions">
        <button class="btn small" id="reroll" ${run.rerolls > 0 && !run.lastFight?.duel ? '' : 'disabled'}>↻ Reroll <span class="num">${run.rerolls}</span></button>
      </div>
    </section>`;
  app.querySelectorAll('[data-loot]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.loot[+el.dataset.loot], { from: 'loot' });
  });
  app.querySelector('#reroll').onclick = () => { if (run.rerollLoot()) ctx.refresh(); };
}

// ---------------------------------------------------------------- shop

const MERCHANT = {
  look: { gender: 'boy', hair: 'messy', hairColor: 'ash', skin: 'tan', eyes: 'amber', name: 'Moss' },
  equip: { hat: { item: 'nomad_wrap' }, top: { item: 'leech_wrap' }, weapon: { item: 'bogwood_staff' } },
};
const WHY = { Set: 'Your set', Twin: 'Twin', Keystone: 'Keystone', Tomorrow: 'Tomorrow' };

export function shopScreen(app, ctx) {
  const { run } = ctx;
  if (!run.shop) return ctx.nextRound();
  const before = run.headline();
  const tomorrow = run.dayInfo(run.round + 1);
  const wares = run.shop.map((w, i) => {
    const it = ITEMS[w.inst.item];
    const after = run.headline(run.withItem(w.inst));
    const up = after.dps > before.dps + 0.05 ? '▲ DPS' : after.ehp > before.ehp ? '▲ EHP' : '';
    return `
    <div class="ware panel ${w.sold ? 'sold' : ''} ${!w.sold && run.gold < w.price ? 'dear' : ''}" ${w.sold ? '' : `data-ware="${i}"`}>
      ${tile(w.inst, { size: 2 })}
      <div class="ware-body">
        <div class="nm rc-${w.inst.rarity}">${it.name}</div>
        <div class="meta">${badge(it)}${it.keystone ? '' : WHY[w.why] || ''}</div>
        ${up && !w.sold ? `<span class="tag up">${up}</span>` : ''}
      </div>
      <div class="price num">${w.sold ? 'SOLD' : `${glyph('coin', 2)}${w.price}`}</div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen shop">
      <div class="shop-head panel">
        <div class="merchant" data-stage="${tomorrow.biome},0.9,3">${heroImg(MERCHANT.look, MERCHANT.equip, 3, { flip: true })}</div>
        <div class="shop-title">
          <div class="kicker">MERCHANT · NEXT: ${tomorrow.name.toUpperCase()}</div>
          <h2>Moss's Wares</h2>
          <div class="goldline">${glyph('coin', 2)} <b class="num">${run.gold}</b></div>
        </div>
      </div>
      <div class="wares">${wares}</div>
      <div class="actions">
        <button class="btn small" id="reshop" ${run.gold < SHOP_REROLL ? 'disabled' : ''}>↻ ${glyph('coin', 1)}${SHOP_REROLL}</button>
        <button class="btn" id="gear">Gear</button>
        <button class="btn go" id="leave">Day ${run.day + 1} ▸</button>
      </div>
    </section>`;
  fitStages(app);
  app.querySelectorAll('[data-ware]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.shop[+el.dataset.ware].inst, { from: 'shop', ware: +el.dataset.ware });
  });
  app.querySelector('#reshop').onclick = () => { if (run.rerollShop()) ctx.refresh(); };
  app.querySelector('#gear').onclick = () => ctx.go('gear', { mode: 'view', back: 'shop' });
  app.querySelector('#leave').onclick = ctx.leaveShop;
}

// ---------------------------------------------------------------- end

export function endScreen(app, ctx) {
  const { run } = ctx;
  const h = run.headline();
  const title = run.crown ? 'Crowned!' : run.lives <= 0 ? 'Out of lives' : 'Run complete';
  const st = run.stats || {};
  app.innerHTML = `
    <section class="screen end">
      <div class="logo end-logo">${run.crown ? glyph('crown', 5) : ''}${title}</div>
      <div class="stage panel" data-stage="${run.crown ? 'boar' : 'duel'},0.86,5">${heroImg(run.look, run.equip, 4)}</div>
      <div class="nameplate">${run.name} · <span class="num">${run.duelWins ?? 0}/${WIN_TARGET}</span> duels won</div>
      <div class="endstats panel">
        <div><span class="k">DPS</span><span class="v">${h.dps}</span></div>
        <div><span class="k">EHP</span><span class="v">${h.ehp}</span></div>
        <div><span class="k">DAMAGE</span><span class="v">${st.dealt ?? 0}</span></div>
        <div><span class="k">BEST HIT</span><span class="v">${st.bestHit ?? 0}</span></div>
        <div><span class="k">CRITS</span><span class="v">${st.crits ?? 0}</span></div>
        <div><span class="k">HEALED</span><span class="v">${st.healed ?? 0}</span></div>
      </div>
      <div class="history">${run.history.filter((x) => x.duel).map((x) => `<span class="h ${x.result}" title="${x.label}">⚔ ${x.label}</span>`).join('')}</div>
      ${ctx.best ? `<div class="bestline num">${bestLine(ctx.best)}</div>` : ''}
      <div class="actions"><button class="btn primary" id="again">New run ▸</button></div>
    </section>`;
  fitStages(app);
  app.querySelector('#again').onclick = ctx.newRun;
}

// ---------------------------------------------------------------- item sheet

export function itemSheet(ctx, inst, where) {
  const { run } = ctx;
  const it = ITEMS[inst.item];
  const kind = slotKind(it.slot);
  const fam = it.family ? FAMILIES[it.family] : null;
  const counts = setCounts(run.equip);
  const before = run.headline();

  // what the build looks like with/without this item
  let cmp = '';
  let targetSlots = [];
  if (where.from === 'loot' || where.from === 'bag' || where.from === 'foe' || where.from === 'shop') {
    if (kind === 'trinket' && run.equip.trinket1 && run.equip.trinket2) targetSlots = ['trinket1', 'trinket2'];
    else targetSlots = [run.slotFor(inst)];
    const after = run.headline(run.withItem(inst, targetSlots[0]));
    const cur = run.equip[targetSlots[0]];
    cmp = `<div class="cmpbox">
      <div><div class="k">DPS</div><div class="v">${delta(before.dps, after.dps)}</div></div>
      <div><div class="k">EHP</div><div class="v">${delta(before.ehp, after.ehp)}</div></div>
    </div>${cur ? `<div class="vsline">vs your ${itemName(cur)}</div>` : ''}`;
  } else if (where.from === 'equip') {
    const after = run.headline({ ...run.equip, [where.slot]: null });
    cmp = `<div class="cmpbox">
      <div><div class="k">DPS WITHOUT</div><div class="v">${delta(before.dps, after.dps)}</div></div>
      <div><div class="k">EHP WITHOUT</div><div class="v">${delta(before.ehp, after.ehp)}</div></div>
    </div>`;
  }

  const n = counts[it.family] || 0;
  const setLine = fam
    ? `<div class="setline" data-tipset="${it.family}">
        <div class="${n >= 2 ? 'lit' : ''}">${glyph('plus', 1)} <b>${fam.set.name} 2</b> ${fam.set.desc}</div>
        ${fam.set4 ? `<div class="${n >= 4 ? 'lit' : ''}">${glyph('plus', 1)} <b>${fam.set.name} 4</b> ${fam.set4.desc}</div>` : ''}
        <div class="worn">Wearing ${n}/4</div>
      </div>`
    : '';
  const twin = where.from === 'bag' || where.from === 'equip' ? run.twinOf(inst) : null;

  // actions
  const acts = [];
  if (where.from === 'loot') {
    for (const s of targetSlots) {
      const old = run.equip[s];
      const label = targetSlots.length > 1 ? `Replace ${itemName(old)}` : 'Equip';
      const note = old && run.bagFull() ? ` <small>(bag full: old one is left behind)</small>` : '';
      acts.push(`<button class="btn go" data-act="equip" data-to="${s}">${label}${note}</button>`);
    }
    acts.push(`<button class="btn" data-act="bag" ${run.bagFull() ? 'disabled' : ''}>To bag</button>`);
    acts.push(`<button class="btn" data-act="discard">Leave</button>`);
  } else if (where.from === 'bag') {
    for (const s of targetSlots) {
      const label = targetSlots.length > 1 ? `Replace ${itemName(run.equip[s])}` : 'Equip';
      acts.push(`<button class="btn go" data-act="equip" data-to="${s}">${label}</button>`);
    }
    if (twin) acts.push(`<button class="btn merge" data-act="merge">Merge → ${RARITIES[RARITIES[inst.rarity].next].name}</button>`);
    acts.push(`<button class="btn danger" data-act="discard">Sell +${sellPrice(inst)}g</button>`);
  } else if (where.from === 'equip') {
    if (twin) acts.push(`<button class="btn merge" data-act="merge">Merge → ${RARITIES[RARITIES[inst.rarity].next].name}</button>`);
    acts.push(`<button class="btn" data-act="unequip" ${run.bagFull() ? 'disabled' : ''}>${run.bagFull() ? 'Bag full' : 'Unequip'}</button>`);
    acts.push(`<button class="btn danger" data-act="discard">Sell +${sellPrice(inst)}g</button>`);
  } else if (where.from === 'shop') {
    const w = run.shop[where.ware];
    const poor = run.gold < w.price;
    for (const s of targetSlots) {
      const label = targetSlots.length > 1 ? `Buy, replace ${itemName(run.equip[s])}` : 'Buy & equip';
      acts.push(`<button class="btn go" data-act="equip" data-to="${s}" ${poor ? 'disabled' : ''}>${label}</button>`);
    }
    acts.push(`<button class="btn" data-act="bag" ${poor || run.bagFull() ? 'disabled' : ''}>Buy to bag</button>`);
    acts.push(`<div class="pricetag"><span>${glyph('coin', 2)} <b>${w.price}</b></span><span>You have <b>${run.gold}</b></span></div>`);
  }

  const html = `
    <div class="top">
      ${tile(inst, { size: 3 })}
      <div>
        <div class="nm rc-${inst.rarity}">${it.name}</div>
        <div class="meta">${badge(it)}${RARITIES[inst.rarity].name} ${slotName(inst)}${fam ? ` · ${fam.name}` : ''}</div>
      </div>
    </div>
    <div class="statlist">${statLines(inst).map((l) => `<span class="${l.startsWith('✦') ? 'perk' : ''}">${l}</span>`).join('')}</div>
    ${setLine}
    ${cmp}
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : `<div class="actions">${where.back ? '<button class="btn" data-act="back">◂ Their build</button>' : ''}<button class="btn" data-act="close">Close</button></div>`}`;

  openSheet(html, (sheet) => {
    sheet.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.act === undefined) return;
      const act = b.dataset.act;
      if (act === 'close') return closeSheet();
      if (act === 'back') return where.back();
      ctx.prevHead = run.headline();
      ctx.popHero = act === 'equip';
      if (where.from === 'loot') {
        run.takeLoot(inst, act, b.dataset.to);
        closeSheet();
        ctx.afterLoot();
        return;
      }
      if (where.from === 'shop') {
        if (run.buy(where.ware, act, b.dataset.to)) toast(`Bought ${itemName(inst)}`, 'gold');
        closeSheet();
        ctx.refresh();
        return;
      }
      if (act === 'merge') {
        const m = run.merge(inst.uid);
        if (m) toast(`Merged: ${RARITIES[m.rarity].name} ${itemName(m)}`, 'good');
        closeSheet();
        ctx.refresh();
        return;
      }
      if (act === 'equip') run.equipFromBag(inst.uid, b.dataset.to);
      else if (act === 'unequip') run.unequip(where.slot);
      else if (act === 'discard') {
        // Discarding is permanent, so it takes a second tap.
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to sell'; return; }
        const g = run.sell(inst.uid);
        toast(`Sold ${itemName(inst)} · +${g} gold`, 'gold');
      }
      closeSheet();
      ctx.refresh();
    });
  }, where.onClose);
}

// A rival's build, shown during a duel (the fight pauses) and after it.
// Never before: duels are blind until the fight starts.
export function buildSheet(ctx, onClose = null) {
  const { run } = ctx;
  const gh = run.ghost;
  const gf = run.ghostFighter();
  const hl = headline(gf);
  const slots = ['weapon', 'hat', 'top', 'gloves', 'shoes', 'trinket1', 'trinket2'];
  const html = `
    <div class="bs-head">
      <div class="bs-stage" data-stage="duel,0.9,3">${heroImg(gh.look, gh.equip, 2, { flip: true })}</div>
      <div class="bs-info">
        <div class="nm">${gh.name} <span class="chip trait">${gh.record}</span></div>
        <div class="meta">${gh.archetype}${gh.mine ? ' · your past build' : ''}</div>
        <div class="bs-stats num">
          <span>DPS <b>${hl.dps}</b></span><span>EHP <b>${hl.ehp}</b></span>
          <span>DEF <b>${gf.def}</b></span><span>RES <b>${fmtPct(gf.resist)}</b></span>
        </div>
      </div>
    </div>
    <div class="bs-slots">${slots.map((s) => tile(gh.equip[s], { size: 1.5, attrs: gh.equip[s] ? `data-bs="${s}"` : '', label: '' })).join('')}</div>
    <div class="actions"><button class="btn" id="bs-close">${onClose ? 'Resume ▸' : 'Close'}</button></div>`;
  openSheet(html, (sheet) => {
    fitStages(sheet);
    sheet.querySelector('#bs-close').onclick = closeSheet;
    sheet.querySelectorAll('[data-bs]').forEach((el) => {
      el.onclick = () => itemSheet(ctx, gh.equip[el.dataset.bs], { from: 'foe', back: () => buildSheet(ctx, onClose), onClose });
    });
  }, onClose);
}

// ---------------------------------------------------------------- menu & help

export function menuSheet(ctx) {
  const html = `
    <h2>Menu</h2>
    <div class="menu-list">
      <button class="btn" data-m="help">How to play</button>
      ${ctx.run && !ctx.run.over ? '<button class="btn danger" data-m="abandon">Abandon run</button>' : ''}
      <button class="btn" data-m="close">Close</button>
    </div>`;
  openSheet(html, (sheet) => {
    sheet.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      if (m === 'help') helpSheet();
      else if (m === 'abandon') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to abandon'; return; }
        ctx.abandon();
      } else closeSheet();
    });
  });
}

export function helpSheet() {
  const stat = (k, v) => `<div class="gl"><b>${k}</b><span>${v}</span></div>`;
  const statuses = Object.entries(STATUSES).map(([id, st]) => `
    <div class="gl"><b style="color:${st.color}">${statusGlyph(id, 2)} ${st.name}</b><span>${st.desc}</span></div>`).join('');
  const html = `
    <h2>How to play</h2>
    <div class="help">
      <p>Win ${WIN_TARGET} duels for the Crown. Lose ${LIVES} and the run ends. Each day: 3 hunts, then a duel, for up to ${DAYS_IN_RUN} days.</p>
      <p>Sets: bonuses at 2 and 4 pieces of one family. Two identical items merge into a rarer one.</p>
      <p>Keystones change a rule. The merchant visits after the day-2 and day-5 duels.</p>
      <h3>Stats</h3>
      ${Object.entries(STAT_HELP).map(([k, v]) => stat(k, v)).join('')}
      <h3>Statuses</h3>
      ${statuses}
    </div>
    <div class="actions"><button class="btn" id="help-close">Close</button></div>`;
  openSheet(html, (sheet) => { sheet.querySelector('#help-close').onclick = closeSheet; });
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 'S'}`;
function bestLine(b) {
  return `${plural(b.runs, 'RUN')} · ${plural(b.crowns, 'CROWN')} · BEST ${plural(b.bestWins, 'WIN')}`;
}
