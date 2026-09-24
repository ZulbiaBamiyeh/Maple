// Every screen except the battle. Each takes the app element and a context
// object with the run and navigation callbacks.
//
// Every screen fits one phone screen without scrolling: the flexible part of
// each layout (card list, hero stage) takes whatever height is left, and
// sprites pick a whole-number scale that fits the space they were given.

import {
  ITEMS, MOBS, FAMILIES, RARITIES, RARITY_ODDS, SCROLLS, MAIN_STAT, UPGRADE_SLOTS, BAG_SIZE,
  slotKind, scaleFor, STATUSES, SLOTS,
} from '../data.js';
import { statLines, scrapValue, setCounts, activeSets, headline } from '../items.js';
import { drawScene } from '../art/scenes.js';
import {
  hud, heroImg, iconImg, mobImg, glyph, statusGlyph, tile, itemName, slotName, cap,
  openSheet, closeSheet, toast, delta, oddsChip, firstTime,
} from './common.js';
import { resetTips } from './store.js';

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
    const img = el.querySelector('img.hero, img.mob');
    const mob = img?.classList.contains('mob');
    const sw = mob ? 32 : 48;
    const sh = mob ? 31 : 42; // rows down to the feet
    const S = Math.max(1, Math.min(+maxS || 5, Math.floor((el.clientHeight * ground - 6) / sh), Math.floor(el.clientWidth / (sw + 2))));
    const groundPx = backdrop(el, biome, S, ground);
    if (!img) return;
    img.width = sw * S;
    img.height = (mob ? 32 : 44) * S;
    img.style.marginBottom = `${el.clientHeight - groundPx - (mob ? 2 : 3) * S}px`;
  });
}

const fmtPct = (v) => `${Math.round(v * 100)}%`;

// Defer heavy work (odds) until after the browser paints the screen.
function later(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}


// ---------------------------------------------------------------- first-time popups

const INTRO = {
  pick: ['Choose your hunt', `
    <p>Pick one of three monsters. The fight plays itself.</p>
    <p>Each card shows what it <b>drops</b> and your <b>odds</b> with your current gear. Elite hunts drop rarer loot and pay more gold, but a loss costs one of your 3 lives.</p>
    <p>Every 3rd round is a <b>duel</b> against another player's build. Win round 9 for a Crown.</p>`],
  loot: ['Pick your drop', `
    <p>Keep one of three drops. Tap it to compare with what you wear.</p>
    <p><b>Equip</b> it, stash it in your <b>bag</b> for later duels, or <b>scrap</b> it for gold.</p>`],
  hub: ['Your gear', `
    <p><b>DPS</b> is your damage per second. <b>EHP</b> is how much you can take, counting Def.</p>
    <p>Tap any item to swap or scrap it. Two pieces from one monster family unlock a set bonus.</p>
    <p>Save your gold: a <b>shop</b> opens before every duel.</p>`],
  shop: ['The shop', `
    <p>A merchant sets up before every duel. Their gear never drops from monsters.</p>
    <p><b>Scrolls</b> upgrade what you already own. Each item has 3 upgrade slots, used whether the scroll works or not.</p>`],
  duelBlind: ['Duel!', `
    <p>You face another player's saved build. You won't see it until the fight starts.</p>
    <p>Go in with your strongest all-round gear. Win and you loot from their build; lose and you'll know what beat you.</p>`],
};
const intro = (key) => firstTime(key, ...INTRO[key]);

// ---------------------------------------------------------------- title

export function titleScreen(app, ctx) {
  const sv = ctx.saved;
  const look = sv ? sv.run.look : ctx.titleLook;
  const equip = sv ? sv.run.equip : ctx.starterEquip;
  app.innerHTML = `
    <section class="screen title-wrap">
      <div class="logo">GEARFALL</div>
      <div class="tagline">Hunt monsters. Wear what drops. Duel rival builds.</div>
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
  const sc = scaleFor(run.round);
  const cards = run.offers.map((id, i) => {
    const m = MOBS[id];
    const odds = RARITY_ODDS[m.tier];
    const oh = m.onHit?.[0];
    const traitGlyph = oh ? statusGlyph(oh.apply, 2) : m.regen ? statusGlyph('regen', 2) : '';
    return `
    <div class="mobcard panel deal" data-mob="${id}" style="animation-delay:${i * 0.08}s">
      <div class="portrait" data-stage="${m.family},0.86,3">${mobImg(m.sprite, 3)}</div>
      <div class="info">
        <div class="name"><span>${m.name}</span><span class="chip tier-${m.tier}">${cap(m.tier)}</span></div>
        <div class="oddsline" data-odds="${id}"><span class="odds-chip o0">…</span></div>
        <div class="line">HP ${Math.round(m.hp * sc)} · Hit ${Math.round(m.min * sc)}–${Math.round(m.max * sc)} · ${m.interval}s${m.def ? ` · Def ${m.def}` : ''}</div>
        <div class="traitrow"><span class="chip trait">${traitGlyph} ${m.trait}</span></div>
        <div class="drops">${m.drops.map((d) => iconImg(d, 1.2)).join('')}</div>
        <div class="odds" aria-label="Common ${odds[0][1]}%, rare ${odds[1][1]}%, epic ${odds[2][1]}%">
          ${odds.map(([r, w]) => `<span class="${r[0]}" style="width:${w}%"></span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
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
  intro('pick');
}

// ---------------------------------------------------------------- gear hub / duel preview

export function gearScreen(app, ctx, { mode = 'hub' } = {}) {
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
          <div class="kicker">DUEL · ROUND ${run.round}</div>
          <div class="name">${gh.name} <span class="chip trait">${gh.record}</span></div>
          <div class="sub">${gh.mine ? 'One of your past builds. ' : ''}Build hidden until the fight.</div>
        </div>
      </div>`;
  }

  const setChips = Object.entries(counts).map(([fam, n]) => {
    const set = FAMILIES[fam].set;
    return `<span class="set ${on.has(fam) ? 'on' : ''}">${set.name} ${Math.min(n, 2)}/2</span>`;
  }).join('');

  const bag = Array.from({ length: BAG_SIZE }, (_, i) => run.bag[i]
    ? tile(run.bag[i], { size: 2, attrs: `data-bag="${run.bag[i].uid}"` })
    : tile(null)).join('');

  const primary = mode === 'duel'
    ? `<button class="btn go" id="primary">Fight ${run.ghost.name} ▸</button>`
    : mode === 'view'
      ? `<button class="btn" id="primary">◂ Back to hunt</button>`
      : `<button class="btn primary" id="primary">Round ${run.round + 1} ▸</button>`;

  app.innerHTML = `
    ${hud(run)}
    <section class="screen gear ${mode}">
      ${foeHtml}
      <div class="paperdoll panel">
        <div class="col">${slotTile('hat', 'Hat')}${slotTile('top', 'Top')}${slotTile('gloves', 'Gloves')}${slotTile('shoes', 'Shoes')}</div>
        <div class="doll-stage ${pop ? 'pop' : ''}" data-stage="${mode === 'duel' ? 'duel' : 'slime'},0.88,5">${heroImg(run.look, run.equip, 4)}${pop ? '<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i><i class="spk s4"></i>' : ''}</div>
        <div class="col">${slotTile('weapon', 'Weapon')}${slotTile('trinket1', 'Trinket')}${slotTile('trinket2', 'Trinket')}</div>
      </div>
      <div class="statpanel panel">
        <div class="big"><span class="k">DPS ${deltaBadge(prev?.dps, h.dps, (x) => x.toFixed(1))}</span><span class="v">${h.dps}</span></div>
        <div class="big"><span class="k">EHP ${deltaBadge(prev?.ehp, h.ehp, Math.round)}</span><span class="v">${h.ehp}</span></div>
        <div class="small">
          <span>HP <b>${me.maxHp}</b></span><span>Atk <b>${me.atk}</b></span><span>Def <b>${me.def}</b></span>
          <span>Crit <b>${fmtPct(me.crit)}</b></span><span>Haste <b>${fmtPct(me.haste)}</b></span><span>Res <b>${fmtPct(me.resist)}</b></span>
          ${me.lifesteal ? `<span>Steal <b>${fmtPct(me.lifesteal)}</b></span>` : ''}${me.regen ? `<span>Regen <b>${me.regen}/s</b></span>` : ''}
        </div>
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
    else if (mode === 'view') ctx.go('pick');
    else ctx.nextRound();
  };
  if (mode === 'duel') intro('duelBlind');
  else if (mode === 'hub') intro('hub');
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
    const cur = run.equip[run.slotFor(inst)];
    const sameFam = cur && ITEMS[cur.item].family === it.family;
    if (it.family && counts[it.family] === 1 && !sameFam) tags.push(`<span class="tag set">Completes ${FAMILIES[it.family].set.name}</span>`);
    return `
    <div class="lootcard panel deal lc-${inst.rarity}" data-loot="${i}" style="animation-delay:${i * 0.1}s">
      ${tile(inst, { size: 2.5 })}
      <div class="lc-body">
        <div class="nm rc-${inst.rarity}">${it.name}</div>
        <div class="meta">${RARITIES[inst.rarity].name} ${slotName(inst)}${it.family ? ` · ${FAMILIES[it.family].name}` : ''}</div>
        <div class="lines">${statLines(inst).join(' · ')}</div>
        <div class="cmp">DPS ${delta(before.dps, after.dps)} EHP ${delta(before.ehp, after.ehp)}</div>
        ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      <h2>${run.isDuel ? 'Duel spoils' : 'Pick your drop'}</h2>
      <div class="loots">${cards}</div>
    </section>`;
  app.querySelectorAll('[data-loot]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.loot[+el.dataset.loot], { from: 'loot' });
  });
  intro('loot');
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
      <div class="nameplate">${run.name} · <span class="num">${run.record}</span></div>
      <div class="endstats panel">
        <div><span class="k">DPS</span><span class="v">${h.dps}</span></div>
        <div><span class="k">EHP</span><span class="v">${h.ehp}</span></div>
        <div><span class="k">DAMAGE</span><span class="v">${st.dealt ?? 0}</span></div>
        <div><span class="k">BEST HIT</span><span class="v">${st.bestHit ?? 0}</span></div>
        <div><span class="k">CRITS</span><span class="v">${st.crits ?? 0}</span></div>
        <div><span class="k">HEALED</span><span class="v">${st.healed ?? 0}</span></div>
      </div>
      <div class="history">${run.history.map((x) => `<span class="h ${x.result}" title="${x.label}">${x.duel ? '⚔' : ''}${x.round}</span>`).join('')}</div>
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

  const upg = `<span class="upg">${Array.from({ length: UPGRADE_SLOTS }, (_, i) => `<span class="${i < inst.upgrades.used ? 'used' : ''}"></span>`).join('')}</span>`;
  const setLine = fam
    ? `<div class="setline">${glyph('plus', 1)} <b>${fam.set.name}</b> 2-piece: ${fam.set.desc} · you wear ${counts[it.family] || 0}</div>`
    : '';

  // actions
  const sv = scrapValue(inst);
  const acts = [];
  if (where.from === 'loot') {
    for (const s of targetSlots) {
      const old = run.equip[s];
      const label = targetSlots.length > 1 ? `Replace ${itemName(old)}` : 'Equip';
      const note = old && run.bagFull() ? ` <small>(scraps old)</small>` : '';
      acts.push(`<button class="btn go" data-act="equip" data-to="${s}">${label}${note}</button>`);
    }
    acts.push(`<button class="btn" data-act="bag" ${run.bagFull() ? 'disabled' : ''}>To bag</button>`);
    acts.push(`<button class="btn" data-act="scrap">Scrap +${sv}g</button>`);
  } else if (where.from === 'bag') {
    for (const s of targetSlots) {
      const label = targetSlots.length > 1 ? `Replace ${itemName(run.equip[s])}` : 'Equip';
      acts.push(`<button class="btn go" data-act="equip" data-to="${s}">${label}</button>`);
    }
    acts.push(`<button class="btn danger" data-act="scrap">Scrap +${sv}g</button>`);
  } else if (where.from === 'equip') {
    acts.push(`<button class="btn" data-act="unequip" ${run.bagFull() ? 'disabled' : ''}>${run.bagFull() ? 'Bag full' : 'Unequip'}</button>`);
    acts.push(`<button class="btn danger" data-act="scrap">Scrap +${sv}g</button>`);
  } else if (where.from === 'shop') {
    const ware = run.shop[where.ware];
    const broke = run.gold < ware.price;
    for (const s of targetSlots) {
      const old = run.equip[s];
      const label = targetSlots.length > 1 ? `Replace ${itemName(old)}` : 'Buy & equip';
      acts.push(`<button class="btn go" data-act="buy-equip" data-to="${s}" ${broke ? 'disabled' : ''}>${label}</button>`);
    }
    acts.push(`<button class="btn" data-act="buy-bag" ${broke || run.bagFull() ? 'disabled' : ''}>Buy to bag</button>`);
    cmp += `<div class="pricetag"><span>Price ${glyph('coin', 2)} <b>${ware.price}</b></span><span class="${broke ? 'down-bad' : ''}">You have ${glyph('coin', 2)} ${run.gold}</span></div>`;
  }

  const html = `
    <div class="top">
      ${tile(inst, { size: 3 })}
      <div>
        <div class="nm rc-${inst.rarity}">${it.name}${inst.glow ? ' ✦' : ''}</div>
        <div class="meta">${RARITIES[inst.rarity].name} ${slotName(inst)}${fam ? ` · ${fam.name}` : ''}</div>
        <div class="meta">Upgrades ${upg} ${inst.upgrades.bonus ? `<b class="up-good">+${inst.upgrades.bonus}</b>` : ''}</div>
      </div>
    </div>
    <div class="statlist">${statLines(inst).map((l) => `<span>${l}</span>`).join('')}</div>
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
      if (where.from === 'shop') {
        if (run.buy(where.ware, act === 'buy-bag' ? 'bag' : 'equip', b.dataset.to)) {
          toast(`Bought ${itemName(inst)}`, 'gold');
        }
        closeSheet();
        ctx.refresh();
        return;
      }
      if (where.from === 'loot') {
        if (act === 'scrap') toast(`+${sv} gold`, 'gold');
        run.takeLoot(inst, act, b.dataset.to);
        closeSheet();
        ctx.afterLoot();
        return;
      }
      if (act === 'equip') run.equipFromBag(inst.uid, b.dataset.to);
      else if (act === 'unequip') run.unequip(where.slot);
      else if (act === 'scrap') { run.scrap(inst.uid); toast(`+${sv} gold`, 'gold'); }
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

// Scrolls are only sold (and used) at the shop: pick one, then tap items to
// read it onto them, one slot each, while your gold lasts.
function scrollSheet(ctx, scrollId) {
  const { run } = ctx;
  const sc = SCROLLS[scrollId];
  const owned = [...SLOTS.map((s) => run.equip[s]).filter(Boolean), ...run.bag];
  const cells = owned.map((inst, i) => {
    const left = UPGRADE_SLOTS - inst.upgrades.used;
    const ms = MAIN_STAT[slotKind(ITEMS[inst.item].slot)];
    return `<div class="sc-cell ${left <= 0 ? 'full' : ''}" data-i="${i}">
      ${tile(inst, { size: 2 })}
      <span class="sc-left">${left > 0 ? `${left} left` : 'full'}</span>
      <span class="sc-stat">${ms.label}</span>
    </div>`;
  }).join('');
  const amt = sc.bonus;
  const html = `
    <div class="sc-head">
      <h2>${sc.name}</h2>
      <span class="gold num">${glyph('coin', 2)} ${run.gold}</span>
    </div>
    <div class="sub">${Math.round(sc.chance * 100)}% chance of +${amt} to the item's main stat${sc.glow ? ', and it glows' : ''}. Costs ${sc.cost}g and uses one of its 3 slots either way.</div>
    <div class="sc-grid">${cells || '<div class="sub">Nothing to upgrade.</div>'}</div>
    <div class="actions"><button class="btn" id="sc-done">Done</button></div>`;
  openSheet(html, (sheet) => {
    sheet.querySelector('#sc-done').onclick = closeSheet;
    sheet.querySelectorAll('[data-i]').forEach((el) => {
      el.onclick = () => {
        const inst = owned[+el.dataset.i];
        if (run.gold < sc.cost) { toast(`Need ${sc.cost - run.gold} more gold`, 'bad'); return; }
        const ok = run.scroll(inst.uid, scrollId);
        if (ok === null) return;
        toast(ok ? `Success! ${itemName(inst)} +${inst.upgrades.bonus}` : 'The scroll fizzled… slot used.', ok ? 'good' : 'bad');
        ctx.refresh();
        scrollSheet(ctx, scrollId);
        const cell = document.querySelector(`#sheet-root [data-i="${el.dataset.i}"]`);
        cell?.classList.add(ok ? 'sc-ok' : 'sc-fail');
      };
    });
  });
}

// ---------------------------------------------------------------- shop

const MERCHANT = {
  look: { gender: 'boy', hair: 'messy', hairColor: 'ash', skin: 'tan', eyes: 'amber', name: 'Moss' },
  equip: { hat: { item: 'leather_cap' }, top: { item: 'chain_mail' }, weapon: { item: 'oak_staff' } },
};

export function shopScreen(app, ctx) {
  const { run } = ctx;
  const before = run.headline();
  const wares = run.shop.map((w, i) => {
    const it = ITEMS[w.inst.item];
    const after = run.headline(run.withItem(w.inst));
    const up = after.dps > before.dps + 0.05 ? '▲ DPS' : after.ehp > before.ehp ? '▲ EHP' : '';
    return `
    <div class="ware panel ${w.sold ? 'sold' : ''} ${!w.sold && run.gold < w.price ? 'dear' : ''}" ${w.sold ? '' : `data-ware="${i}"`}>
      ${tile(w.inst, { size: 2 })}
      <div class="ware-body">
        <div class="nm rc-${w.inst.rarity}">${it.name}</div>
        <div class="meta">${RARITIES[w.inst.rarity].name} ${slotName(w.inst)}</div>
        ${up && !w.sold ? `<span class="tag up">${up}</span>` : ''}
      </div>
      <div class="price num">${w.sold ? 'SOLD' : `${glyph('coin', 2)}${w.price}`}</div>
    </div>`;
  }).join('');
  const scrolls = Object.entries(SCROLLS).map(([id, sc]) => `
    <button class="btn scrollbtn" data-scroll="${id}" ${run.gold < sc.cost ? 'disabled' : ''}>
      <span class="sn">${sc.name.replace(' Scroll', '')}</span>
      <small>${Math.round(sc.chance * 100)}% · +${sc.bonus}</small>
      <span class="sp num">${glyph('coin', 1)}${sc.cost}</span>
    </button>`).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen shop">
      <div class="shop-head panel">
        <div class="merchant" data-stage="boar,0.9,3">${heroImg(MERCHANT.look, MERCHANT.equip, 3, { flip: true })}</div>
        <div class="shop-title">
          <div class="kicker">WANDERING MERCHANT</div>
          <h2>Moss's Wares</h2>
          <div class="bubble">Duel ahead. Spend wisely!</div>
        </div>
      </div>
      <div class="shop-label">GEAR</div>
      <div class="wares">${wares}</div>
      <div class="shop-label">SCROLLS</div>
      <div class="scrollrow">${scrolls}</div>
      <div class="actions"><button class="btn go" id="leave">To the duel ▸</button></div>
    </section>`;
  fitStages(app);
  app.querySelectorAll('[data-ware]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.shop[+el.dataset.ware].inst, { from: 'shop', ware: +el.dataset.ware });
  });
  app.querySelectorAll('[data-scroll]').forEach((el) => { el.onclick = () => scrollSheet(ctx, el.dataset.scroll); });
  app.querySelector('#leave').onclick = ctx.leaveShop;
  intro('shop');
}

// ---------------------------------------------------------------- menu & help

export function menuSheet(ctx) {
  const html = `
    <h2>Menu</h2>
    <div class="menu-list">
      <button class="btn" data-m="help">How to play</button>
      <button class="btn" data-m="tips">Show intro popups again</button>
      ${ctx.run && !ctx.run.over ? '<button class="btn danger" data-m="abandon">Abandon run</button>' : ''}
      <button class="btn" data-m="close">Close</button>
    </div>`;
  openSheet(html, (sheet) => {
    sheet.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      if (m === 'help') helpSheet();
      else if (m === 'tips') { resetTips(); closeSheet(); toast('Intro popups will show again'); }
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
      <p><b>The run.</b> 9 rounds, 3 lives. Rounds 3, 6 and 9 are duels against another player's saved build. Win round 9 for a Crown.</p>
      <p><b>Hunts.</b> Pick a monster; the fight plays itself. Win to choose 1 of 3 drops from its table. Tougher monsters drop rarer gear and pay more gold. A loss costs a life.</p>
      <p><b>Duels.</b> Rounds 3, 6 and 9 pit you against another player's saved build, hidden until the fight starts. Build for all-round strength; win to loot from their gear.</p>
      <p><b>Sets.</b> Two pieces from the same monster family unlock a bonus.</p>
      <p><b>Shop.</b> Before each duel a merchant sells gear you can't get from monsters, plus scrolls.</p>
      <p><b>Scrolls.</b> Bought at the shop. Every item has 3 upgrade slots. Sure: 100%, +1. Chancy: 60%, +3. Long-shot: 10%, +8. A slot is used either way.</p>
      <h3>Stats</h3>
      ${stat('DPS', 'Average damage per second.')}
      ${stat('EHP', 'Effective HP: health counting Def.')}
      ${stat('Atk', 'Added to every weapon hit.')}
      ${stat('Def', 'Removed from every physical hit (min 1). Magic ignores half. Status damage ignores all of it.')}
      ${stat('Crit', 'Chance to hit for 150%.')}
      ${stat('Haste', 'Faster attacks.')}
      ${stat('Resist', 'Shortens harmful statuses on you, up to 50%.')}
      ${stat('Lifesteal', 'Heals you for a share of damage dealt.')}
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
