// Every screen except the battle. Each takes the app element and a context
// object with the run and navigation callbacks.

import {
  ITEMS, MOBS, FAMILIES, RARITIES, RARITY_ODDS, SCROLLS, MAIN_STAT, UPGRADE_SLOTS, BAG_SIZE,
  slotKind, scaleFor, STATUSES, WEAPON_TYPES,
} from '../data.js';
import { statLines, scrapValue, setCounts, activeSets, headline } from '../items.js';
import { drawScene } from '../art/scenes.js';
import {
  hud, heroImg, iconImg, mobImg, glyph, statusGlyph, tile, itemName, slotName, cap,
  openSheet, closeSheet, toast, delta, oddsChip, tip, bindTips,
} from './common.js';
import { resetTips } from './store.js';

// ---------------------------------------------------------------- backdrops

// Draw a backdrop into each [data-scene="biome,scale,groundFrom"] at a whole-number scale.
function mountScenes(root) {
  root.querySelectorAll('[data-scene]').forEach((el) => {
    const [biome, s, g] = el.dataset.scene.split(',');
    const S = +s;
    const w = Math.ceil(el.clientWidth / S) || 60;
    const h = Math.ceil(el.clientHeight / S) || 60;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.className = 'bg';
    c.style.cssText = `width:${w * S}px;height:${h * S}px;top:0;left:50%;margin-left:${-(w * S) / 2}px`;
    drawScene(c.getContext('2d'), w, h, biome, Math.round(h * (+g || 0.8)), w + h);
    el.prepend(c);
  });
}

const dollScale = () => (window.innerWidth < 370 ? 3 : 4);
const fmtPct = (v) => `${Math.round(v * 100)}%`;

// ---------------------------------------------------------------- title

export function titleScreen(app, ctx) {
  const sv = ctx.saved;
  const look = sv ? sv.run.look : ctx.titleLook;
  const equip = sv ? sv.run.equip : ctx.starterEquip;
  const S = dollScale();
  app.innerHTML = `
    <section class="screen title-wrap">
      <div class="logo">GEARFALL</div>
      <div class="tagline">Pick your hunt. Wear what drops. Duel other players' builds.</div>
      <div class="stage panel" data-scene="slime,${S},0.86">${heroImg(look, equip, S)}</div>
      <div class="nameplate">${glyph(look.gender === 'girl' ? 'heart' : 'swords', 2)} ${look.name}${sv ? ` <span class="num" style="font-size:12px;color:var(--muted)">${sv.run.record}</span>` : ''}</div>
      <div class="howto panel">
        <div>${glyph('paw', 2)} <b>Hunt</b> — pick 1 of 3 monsters. Each shows what it drops.</div>
        <div>${glyph('coin', 2)} <b>Loot</b> — keep 1 of 3 drops. Equip it, bag it or scrap it.</div>
        <div>${glyph('swords', 2)} <b>Duel</b> — every 3rd round, see a rival's gear and counter it.</div>
        <div>${glyph('crown', 2)} <b>9 rounds, 3 lives.</b> Win the last duel for a Crown.</div>
      </div>
      ${ctx.best?.runs ? `<div class="sub num" style="font-size:11px">${bestLine(ctx.best)}</div>` : ''}
      <div class="actions" style="width:100%;flex-wrap:wrap">
        ${ctx.saved ? `<button class="btn go" id="continue" style="flex-basis:100%">Continue ${ctx.saved.name} · Round ${ctx.saved.round} ▸</button>` : ''}
        ${sv ? '' : '<button class="btn" id="reroll">New look</button>'}
        <button class="btn ${ctx.saved ? '' : 'primary'}" id="start">${ctx.saved ? 'New run' : 'Start run ▸'}</button>
      </div>
    </section>`;
  mountScenes(app);
  app.querySelector('#reroll')?.addEventListener('click', ctx.rerollLook);
  const start = app.querySelector('#start');
  start.onclick = () => {
    // Starting over discards the saved run, so ask with a second tap.
    if (ctx.saved && !start.dataset.armed) {
      start.dataset.armed = '1';
      start.textContent = 'Tap again to abandon saved run';
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
  const cards = run.offers.map((id) => {
    const m = MOBS[id];
    const odds = RARITY_ODDS[m.tier];
    const oh = m.onHit?.[0];
    const traitGlyph = oh ? statusGlyph(oh.apply, 2) : m.regen ? statusGlyph('regen', 2) : '';
    return `
    <div class="mobcard panel deal" data-mob="${id}" style="animation-delay:${run.offers.indexOf(id) * 0.1}s">
      <div class="portrait" data-scene="${m.family},3,0.84">${mobImg(m.sprite, 3)}</div>
      <div class="info">
        <div class="name">${m.name} <span class="chip tier-${m.tier}">${cap(m.tier)}</span></div>
        <div class="oddsline" data-odds="${id}"><span class="odds-chip o0">Sizing up…</span></div>
        <div class="line">HP ${Math.round(m.hp * sc)} · Hit ${Math.round(m.min * sc)}–${Math.round(m.max * sc)} · ${m.interval}s${m.def ? ` · Def ${m.def}` : ''}</div>
        <div><span class="chip trait">${traitGlyph} ${m.trait}</span></div>
        <div class="drops">${m.drops.map((d) => iconImg(d, 1.5)).join('')}</div>
        <div class="odds" title="Common ${odds[0][1]}% · Rare ${odds[1][1]}% · Epic ${odds[2][1]}%">
          ${odds.map(([r, w]) => `<span class="${r[0]}" style="width:${w}%"></span>`).join('')}
        </div>
        <div class="line" style="font-size:10px">RARE ${odds[1][1]}% · EPIC ${odds[2][1]}%</div>
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      <div><h2>Choose your hunt</h2><div class="sub">Tougher mobs drop rarer gear. Losing costs a life.</div></div>
      ${tip('pick', `Each card shows the monster's drops and your <b>odds</b> against it with your current gear. Elite hunts are a gamble with a big payout.`)}
      ${cards}
      <div class="grow"></div>
      <div class="actions sticky">
        <button class="btn small" id="gear">Gear</button>
        <button class="btn small" id="bag">Bag ${run.bag.length}/${BAG_SIZE}</button>
        <button class="btn small" id="scrolls">Scrolls</button>
      </div>
    </section>`;
  mountScenes(app);
  bindTips(app);
  app.querySelectorAll('[data-mob]').forEach((el) => { el.onclick = () => ctx.hunt(el.dataset.mob); });
  // Odds take a few practice fights each; fill them in after the first paint.
  later(() => app.querySelectorAll('[data-odds]').forEach((el) => {
    el.innerHTML = oddsChip(run.mobOdds(el.dataset.odds));
  }));
  app.querySelector('#gear').onclick = () => ctx.go('gear', { mode: 'view' });
  app.querySelector('#bag').onclick = () => ctx.go('gear', { mode: 'view', focus: 'bag' });
  app.querySelector('#scrolls').onclick = () => scrollPicker(ctx);
}

// ---------------------------------------------------------------- gear hub / duel preview

export function gearScreen(app, ctx, { mode = 'hub', focus } = {}) {
  const { run } = ctx;
  const S = dollScale();
  const me = run.fighter();
  const h = headline(me);
  const prev = ctx.prevHead;
  const pop = ctx.popHero;
  ctx.prevHead = null;
  ctx.popHero = false;
  const deltaBadge = (a, b, fmt = (x) => x) => {
    if (!prev || Math.abs(b - a) < 0.05) return '';
    const up = b > a;
    return `<span class="delta ${up ? 'up-good' : 'down-bad'}">${up ? '▲' : '▼'} ${fmt(Math.abs(b - a))}</span>`;
  };
  const counts = setCounts(run.equip);
  const on = new Set(activeSets(run.equip));
  const slotTile = (slot, label) => tile(run.equip[slot], { size: 2, attrs: `data-slot="${slot}"`, label });

  let foeHtml = '';
  if (mode === 'duel') {
    const gh = run.ghost;
    const gf = run.ghostFighter();
    const gh2 = headline(gf);
    foeHtml = `
      <div><h2>Duel · ${gh.name}</h2><div class="sub">Their build is locked in. Yours isn't — swap from your bag to counter it.</div></div>
      <div class="foe panel">
        <div class="doll-stage" data-scene="duel,2,0.86">${heroImg(gh.look, gh.equip, 2, { flip: true })}</div>
        <div>
          <div class="name">${gh.name} <span class="chip trait">${gh.record}</span></div>
          <div class="sub">${gh.archetype}${gh.mine ? ' · <span style="color:var(--gold)">your past build</span>' : ''}</div>
          <div class="cmp"><span>DPS <b>${gh2.dps}</b></span><span>EHP <b>${gh2.ehp}</b></span><span>Def <b>${gf.def}</b></span><span>Res <b>${fmtPct(gf.resist)}</b></span></div>
          <div class="slots">${['weapon', 'hat', 'top', 'gloves', 'shoes', 'trinket1', 'trinket2'].map((s) => gh.equip[s] ? tile(gh.equip[s], { size: 1.5, attrs: `data-foe="${s}"` }) : '').join('')}</div>
        </div>
      </div>
      <div class="vs" id="duel-odds"><span class="odds-chip o0">Sizing up…</span></div>`;
  }

  const setChips = Object.entries(counts).map(([fam, n]) => {
    const set = FAMILIES[fam].set;
    return `<span class="set ${on.has(fam) ? 'on' : ''}" title="${set.desc}">${set.name} ${Math.min(n, 2)}/2 · ${set.desc}</span>`;
  }).join('') || '<span class="set">No set pieces yet — wear 2 from one family</span>';

  const bag = Array.from({ length: BAG_SIZE }, (_, i) => run.bag[i]
    ? tile(run.bag[i], { size: 2, attrs: `data-bag="${run.bag[i].uid}"` })
    : tile(null, { label: '' })).join('');

  const primary = mode === 'duel'
    ? `<button class="btn go" id="primary">Fight ${run.ghost.name} ▸</button>`
    : mode === 'view'
      ? `<button class="btn" id="primary">◂ Back to hunt</button>`
      : `<button class="btn primary" id="primary">Round ${run.round + 1} ▸</button>`;

  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      ${foeHtml}
      ${mode !== 'duel' ? `<div><h2>${run.name}'s gear</h2><div class="sub">Tap any item to equip, scroll or scrap it.</div></div>` : ''}
      ${mode === 'duel' ? tip('duel', 'Tap an item in your bag to see how swapping it changes your odds. Poison and burn ignore Def; heavy hits punch through it.') : ''}
      ${mode === 'hub' ? tip('hub', '<b>DPS</b> is damage per second. <b>EHP</b> is how much damage you can take, counting Def. Gold buys scrolls: tap any item to upgrade it.') : ''}
      <div class="paperdoll panel">
        <div class="col">${slotTile('hat', 'Hat')}${slotTile('top', 'Top')}${slotTile('gloves', 'Gloves')}${slotTile('shoes', 'Shoes')}</div>
        <div class="doll-stage ${pop ? 'pop' : ''}" data-scene="${mode === 'duel' ? 'duel' : 'slime'},${S},0.88">${heroImg(run.look, run.equip, S)}${pop ? '<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i><i class="spk s4"></i>' : ''}</div>
        <div class="col right">${slotTile('weapon', 'Weapon')}${slotTile('trinket1', 'Trinket')}${slotTile('trinket2', 'Trinket')}</div>
      </div>
      <div class="headline">
        <div class="stat-big panel"><span class="k">DPS ${prev ? deltaBadge(prev.dps, h.dps, (x) => x.toFixed(1)) : ''}</span><span class="v">${h.dps}</span></div>
        <div class="stat-big panel"><span class="k">EHP ${prev ? deltaBadge(prev.ehp, h.ehp, Math.round) : ''}</span><span class="v">${h.ehp}</span></div>
      </div>
      <div class="statrow panel">
        <span>HP <b>${me.maxHp}</b></span><span>Atk <b>${me.atk}</b></span><span>Def <b>${me.def}</b></span>
        <span>Crit <b>${fmtPct(me.crit)}</b></span><span>Haste <b>${fmtPct(me.haste)}</b></span>
        <span>Resist <b>${fmtPct(me.resist)}</b></span>${me.lifesteal ? `<span>Lifesteal <b>${fmtPct(me.lifesteal)}</b></span>` : ''}
        ${me.regen ? `<span>Regen <b>${me.regen}/s</b></span>` : ''}
      </div>
      <div class="sets">${setChips}</div>
      <div class="section-title" id="bag-title"><span>Bag</span><span class="num">${run.bag.length}/${BAG_SIZE}</span></div>
      <div class="bag panel">${bag}</div>
      <div class="grow"></div>
      <div class="actions sticky">${primary}</div>
    </section>`;
  mountScenes(app);
  bindTips(app);
  if (mode === 'duel') later(() => { const el = app.querySelector('#duel-odds'); if (el) el.innerHTML = oddsChip(run.duelOdds(), 'Your odds: '); });

  app.querySelectorAll('[data-slot]').forEach((el) => {
    const inst = run.equip[el.dataset.slot];
    if (inst) el.onclick = () => itemSheet(ctx, inst, { from: 'equip', slot: el.dataset.slot });
  });
  app.querySelectorAll('[data-bag]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.find(el.dataset.bag), { from: 'bag' });
  });
  app.querySelectorAll('[data-foe]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.ghost.equip[el.dataset.foe], { from: 'foe' });
  });
  app.querySelector('#primary').onclick = () => {
    if (mode === 'duel') ctx.duel();
    else if (mode === 'view') ctx.go('pick');
    else ctx.nextRound();
  };
  if (focus === 'bag') app.querySelector('#bag-title').scrollIntoView({ block: 'center' });
}

// ---------------------------------------------------------------- loot

export function lootScreen(app, ctx) {
  const { run } = ctx;
  const before = run.headline();
  const counts = setCounts(run.equip);
  const cards = run.loot.map((inst, i) => {
    const it = ITEMS[inst.item];
    const after = run.headline(run.withItem(inst));
    const fam = it.family ? ` · ${FAMILIES[it.family].name}` : '';
    const tags = [];
    if (after.dps > before.dps + 0.05) tags.push('<span class="tag up">▲ DPS</span>');
    if (after.ehp > before.ehp) tags.push('<span class="tag up">▲ EHP</span>');
    const cur = run.equip[run.slotFor(inst)];
    const sameFam = cur && ITEMS[cur.item].family === it.family;
    if (it.family && counts[it.family] === 1 && !sameFam) tags.push(`<span class="tag set">Completes ${FAMILIES[it.family].set.name}</span>`);
    if (!tags.length) tags.push('<span class="tag">For the bag</span>');
    return `
    <div class="lootcard panel deal lc-${inst.rarity}" data-loot="${i}" style="animation-delay:${i * 0.12}s">
      ${tile(inst, { size: 2.5 })}
      <div>
        <div class="tags">${tags.join('')}</div>
        <div class="nm rc-${inst.rarity}">${it.name}</div>
        <div class="meta">${RARITIES[inst.rarity].name} ${slotName(inst)}${fam}</div>
        <ul>${statLines(inst).map((l) => `<li>${l}</li>`).join('')}</ul>
        <div class="cmp">DPS ${delta(before.dps, after.dps)} EHP ${delta(before.ehp, after.ehp)}</div>
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${hud(run)}
    <section class="screen">
      <div><h2>Pick your drop</h2><div class="sub">${run.isDuel ? 'Duel spoils — every rarity bumped up a tier.' : 'Keep one. The other two stay behind.'}</div></div>
      ${tip('loot', 'Tap a drop to compare it with what you wear. Spare pieces can ride in your bag for later duels, or be scrapped for gold.')}
      ${cards}
      <div class="grow"></div>
    </section>`;
  bindTips(app);
  app.querySelectorAll('[data-loot]').forEach((el) => {
    el.onclick = () => itemSheet(ctx, run.loot[+el.dataset.loot], { from: 'loot' });
  });
}

// ---------------------------------------------------------------- end

export function endScreen(app, ctx) {
  const { run } = ctx;
  const S = dollScale();
  const h = run.headline();
  const title = run.crown ? 'Crowned!' : run.lives <= 0 ? 'Out of lives' : 'Run complete';
  const sub = run.crown
    ? `${run.name} won the final duel. The Crown is yours.`
    : run.lives <= 0 ? `The hunt ends at round ${run.round}.` : 'So close. The final duel got away.';
  app.innerHTML = `
    <section class="screen end">
      ${run.crown ? `<div>${glyph('crown', 8)}</div>` : ''}
      <div class="logo" style="font-size:40px">${title}</div>
      <div class="sub">${sub}</div>
      <div class="stage panel" data-scene="${run.crown ? 'boar' : 'duel'},${S},0.86">${heroImg(run.look, run.equip, S)}</div>
      <div class="nameplate">${run.name} · <span class="num">${run.record}</span></div>
      <div class="endstats panel">
        <div><span class="k">DPS</span><span class="v">${h.dps}</span></div>
        <div><span class="k">EHP</span><span class="v">${h.ehp}</span></div>
        <div><span class="k">DAMAGE</span><span class="v">${run.stats?.dealt ?? 0}</span></div>
        <div><span class="k">BEST HIT</span><span class="v">${run.stats?.bestHit ?? 0}</span></div>
        <div><span class="k">CRITS</span><span class="v">${run.stats?.crits ?? 0}</span></div>
        <div><span class="k">HEALED</span><span class="v">${run.stats?.healed ?? 0}</span></div>
      </div>
      ${ctx.best ? `<div class="sub num" style="font-size:11px">${bestLine(ctx.best)}</div>` : ''}
      <div class="history">${run.history.map((x) => `<span class="h ${x.result}">R${x.round} ${x.duel ? '⚔' : ''} ${x.label} · ${x.result}</span>`).join('')}</div>
      <div class="grow"></div>
      <div class="actions" style="width:100%"><button class="btn primary" id="again">New run ▸</button></div>
    </section>`;
  mountScenes(app);
  app.querySelector('#again').onclick = ctx.newRun;
}

// ---------------------------------------------------------------- item sheet

export function itemSheet(ctx, inst, where) {
  const { run } = ctx;
  const it = ITEMS[inst.item];
  const kind = slotKind(it.slot);
  const owned = where.from === 'bag' || where.from === 'equip';
  const fam = it.family ? FAMILIES[it.family] : null;
  const counts = setCounts(run.equip);
  const before = run.headline();

  // what the build looks like with/without this item
  let cmp = '';
  let targetSlots = [];
  if (where.from === 'loot' || where.from === 'bag' || where.from === 'foe') {
    if (kind === 'trinket' && run.equip.trinket1 && run.equip.trinket2) targetSlots = ['trinket1', 'trinket2'];
    else targetSlots = [run.slotFor(inst)];
    const after = run.headline(run.withItem(inst, targetSlots[0]));
    const cur = run.equip[targetSlots[0]];
    cmp = `<div class="cmpbox">
      <div><div class="k">DPS</div><div class="v">${delta(before.dps, after.dps)}</div></div>
      <div><div class="k">EHP</div><div class="v">${delta(before.ehp, after.ehp)}</div></div>
    </div>${cur ? `<div class="sub" style="margin-top:6px">Compared with your ${itemName(cur)}${targetSlots.length > 1 ? ' (trinket 1)' : ''}.</div>` : ''}`;
    if (where.from === 'bag' && duelPending(run)) {
      const a = run.duelOdds();
      const b = run.duelOdds(run.withItem(inst, targetSlots[0]));
      cmp += `<div class="duelcmp">vs ${run.ghost.name}: ${oddsChip(a)} → ${oddsChip(b)}</div>`;
    }
  } else if (where.from === 'equip') {
    const after = run.headline({ ...run.equip, [where.slot]: null });
    cmp = `<div class="cmpbox">
      <div><div class="k">DPS WITHOUT</div><div class="v">${delta(before.dps, after.dps)}</div></div>
      <div><div class="k">EHP WITHOUT</div><div class="v">${delta(before.ehp, after.ehp)}</div></div>
    </div>`;
  }

  const upg = `<span class="upg">${Array.from({ length: UPGRADE_SLOTS }, (_, i) => `<span class="${i < inst.upgrades.used ? 'used' : ''}"></span>`).join('')}</span>`;
  const setLine = fam
    ? `<div class="block sub">${glyph('plus', 1)} <b>${fam.set.name}</b> (2 pieces): ${fam.set.desc}. You wear ${counts[it.family] || 0}.</div>`
    : '';
  const weaponLine = it.slot === 'weapon' ? '' : '';

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
  }

  let scrollHtml = '';
  if (owned) {
    const ms = MAIN_STAT[kind];
    const left = UPGRADE_SLOTS - inst.upgrades.used;
    const amt = (b) => (ms.stat === 'haste' ? `${Math.round(b * ms.per * 100)}%` : b * ms.per);
    scrollHtml = `<div class="block"><div class="section-title"><span>Scrolls · ${ms.label}</span><span class="num">${left} slot${left === 1 ? '' : 's'} left</span></div>
      <div class="scrolls">${Object.entries(SCROLLS).map(([id, s]) => `
        <button class="btn small" data-scroll="${id}" ${left <= 0 || run.gold < s.cost ? 'disabled' : ''}>
          ${s.name.replace(' Scroll', '')}<small>${Math.round(s.chance * 100)}% · +${amt(s.bonus)} · ${s.cost}g</small>
        </button>`).join('')}</div></div>`;
  }

  const html = `
    <div class="top">
      ${tile(inst, { size: 3 })}
      <div>
        <div class="nm rc-${inst.rarity}">${it.name}${inst.glow ? ' ✦' : ''}</div>
        <div class="meta">${RARITIES[inst.rarity].name} ${slotName(inst)}${fam ? ` · ${fam.name} family` : ''} · R${inst.round}</div>
        <div class="meta">Upgrades ${upg} ${inst.upgrades.bonus ? `<b class="up-good">+${inst.upgrades.bonus}</b>` : ''}</div>
      </div>
    </div>
    <ul class="block">${statLines(inst).map((l) => `<li>${l}</li>`).join('')}</ul>
    ${weaponLine}
    ${setLine}
    ${it.flavor ? `<div class="flavor">“${it.flavor}”</div>` : ''}
    ${cmp}
    ${scrollHtml}
    ${acts.length ? `<div class="actions">${acts.join('')}</div>` : `<div class="actions"><button class="btn" data-act="close">Close</button></div>`}`;

  openSheet(html, (sheet) => {
    sheet.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.scroll) {
        const ok = run.scroll(inst.uid, b.dataset.scroll);
        if (ok === null) return;
        toast(ok ? `Scroll succeeded! ${itemName(inst)} +${inst.upgrades.bonus}` : 'The scroll fizzled… slot used.', ok ? 'good' : 'bad');
        ctx.refresh();
        itemSheet(ctx, inst, where);
        return;
      }
      const act = b.dataset.act;
      if (act === 'close') return closeSheet();
      ctx.prevHead = run.headline();
      ctx.popHero = act === 'equip';
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
  });
}

// Pick an owned item to scroll.
function scrollPicker(ctx) {
  const { run } = ctx;
  const owned = [...Object.entries(run.equip).filter(([, v]) => v).map(([s, v]) => ({ inst: v, where: { from: 'equip', slot: s } })),
    ...run.bag.map((v) => ({ inst: v, where: { from: 'bag' } }))];
  const html = `
    <h2>Scrolls</h2>
    <div class="sub" style="margin:6px 0 10px">Each item has 3 upgrade slots. A scroll uses a slot whether it works or not.
    Sure 100% +1 · Chancy 60% +3 · Long-shot 10% +8 and the item glows. You have <b style="color:var(--gold)">${run.gold}g</b>.</div>
    <div class="bag" style="padding:0">${owned.map((o, i) => tile(o.inst, { size: 2, attrs: `data-i="${i}"` })).join('')}</div>`;
  openSheet(html, (sheet) => {
    sheet.querySelectorAll('[data-i]').forEach((el) => {
      el.onclick = () => { const o = owned[+el.dataset.i]; itemSheet(ctx, o.inst, o.where); };
    });
  });
}

// Defer heavy work (odds) until after the browser paints the screen.
function later(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

// True in a duel round before the duel has been fought.
function duelPending(run) {
  return run.isDuel && run.ghost && !run.history.some((h) => h.round === run.round);
}

// ---------------------------------------------------------------- menu & help

export function menuSheet(ctx) {
  const html = `
    <h2>Menu</h2>
    <div class="menu-list">
      <button class="btn" data-m="help">How to play</button>
      <button class="btn" data-m="tips">Show tips again</button>
      ${ctx.run && !ctx.run.over ? '<button class="btn danger" data-m="abandon">Abandon run</button>' : ''}
      <button class="btn" data-m="close">Close</button>
    </div>`;
  openSheet(html, (sheet) => {
    sheet.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      if (m === 'help') helpSheet();
      else if (m === 'tips') { resetTips(); closeSheet(); ctx.refresh(); toast('Tips will show again'); }
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
      <p><b>Duels.</b> You see the rival's gear first. Swap items in from your bag to counter them; the odds update as you do.</p>
      <p><b>Sets.</b> Two pieces from the same monster family unlock a bonus.</p>
      <p><b>Scrolls.</b> Every item has 3 upgrade slots. Sure: 100%, +1. Chancy: 60%, +3. Long-shot: 10%, +8. A slot is used either way.</p>
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
