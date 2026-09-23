import './ui/style.css';
import { assets, loadAssets, preloadSprites } from './assets/index';
import { makeAppearance, makeDistinctAppearances, type Wardrobe } from './core/appearance';
import { DAYS, endDay, newRun, TARGET, type Run } from './core/game';
import { item, SLOT_LABEL } from './core/items';
import { Rng } from './core/rng';
import { mesoWord } from './core/negotiate';
import { dumpAll, logDay } from './core/log';
import { Scene, type Actor } from './scene/scene';
import { WORLD, floorY, targets, type Target } from './scene/world';
import { initTooltip, hideTip } from './ui/tooltip';
import { InventoryPanel } from './ui/inventory';
import { ShopPanel } from './ui/shop';
import { LedgerPanel } from './ui/ledger';
import { TradeWindow } from './ui/trade';
import { el, mesos } from './ui/dom';

import { DummyWindow } from './ui/dummy';
import { Arena } from './ui/arena';
import { WagerWindow } from './ui/wager';

async function boot() {
  await loadAssets();
  const manifest = assets();
  const wardrobe: Wardrobe = manifest.pool as unknown as Wardrobe;
  await preloadSprites();

  initTooltip();

  const seed = new URLSearchParams(location.search).get('seed') ?? String(Date.now());
  const run: Run = newRun(seed, wardrobe);
  const lookRng = new Rng(seed + ':player');
  run.looks = [makeAppearance(lookRng, wardrobe)];
  run.looks[0].sitting = false;

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const scene = new Scene(canvas, run.looks[0], () => run.gear);
  scene.player.name = 'you';
  const hudDay = document.getElementById('hud-day')!;
  const hudMesos = document.getElementById('hud-mesos')!;
  const hudRecord = document.getElementById('hud-record')!;
  const hudHint = document.getElementById('hud-hint')!;
  const banner = document.getElementById('banner')!;

  const refresh = () => {
    hudDay.textContent = `DAY ${run.day} / ${DAYS}`;
    hudMesos.innerHTML = `<b>${mesos(run.mesos)}</b> MESOS`;
    hudRecord.textContent = `${run.wins}W ${run.losses}L`;
    inventory.render();
  };

  const inventory = new InventoryPanel(run, () => refresh());
  const shop = new ShopPanel(run, () => refresh());
  const dummy = new DummyWindow(run);
  const ledger = new LedgerPanel(run, () => startDay());
  const arena = new Arena();
  const wager = new WagerWindow(
    run, arena,
    () => inventory.open(),
    () => refresh(),
    () => { scene.frozen = anyOpen(); syncFloor(); refresh(); },
  );

  const trade = new TradeWindow(run, () => refresh(), () => {
    scene.frozen = false;
    syncFloor();
    refresh();
  });

  trade.onChallenge = (h) => {
    wager.open(h.name, h.look, h.trueValue, run.rng.derive(`wager${run.day}:${h.name}`));
    scene.frozen = true;
  };

  for (const win of [inventory.win, inventory.itemWin, shop.win, dummy.win, ledger.win, trade.win, trade.bagWin, wager.win]) {
    win.onClose = chain(win.onClose, () => { scene.frozen = anyOpen(); });
  }

  function chain(a: (() => void) | undefined, b: () => void) {
    return () => { a?.(); b(); };
  }

  function anyOpen(): boolean {
    return [inventory.win, shop.win, dummy.win, ledger.win, trade.win, wager.win].some((w) => w.isOpen)
      || arena.isOpen;
  }

  const SHOUTS = ['pm me', 'cheap!!', 'fast trade', 'need mesos', 'first come', 'wont last', 'srs buyers only', 'no lowballs'];

  /**
   * The floor advertises itself. Everyone padded their shop chat with rows of @
   * to push the real line up above the crowd, so this does too. §5
   */
  function bubbleFor(index: number): string[] {
    const h = run.hawkers[index];
    if (!h) return [];
    const rng = run.rng.derive(`bubble${run.day}:${index}`);
    const lines: string[] = [];
    lines.push(h.buyer
      ? `B> any ${SLOT_LABEL[h.wantSlot!].toLowerCase()}`
      : `S> ${item(h.give.id!).name}`);
    if (rng.chance(0.55)) lines.push(rng.pick(SHOUTS));
    const pad = rng.int(1, 3);
    for (let i = 0; i < pad; i++) lines.push('@'.repeat(rng.int(7, 16)));
    return lines;
  }

  function syncFloor() {
    const rng = run.rng.derive(`floor${run.day}`);
    scene.stallKeepers = run.stalls.map((stall, i): Actor => ({
      look: { ...stall.look, sitting: true },
      gear: stall.gear,
      x: WORLD.stalls[i] + 46, floor: 'upper', facing: -1,
      pose: 'sit', frame: 0, frameTime: 0,
    }));
    scene.npcs = run.hawkers.map((h, i): Actor => ({
      look: h.look,
      gear: h.gear,
      x: WORLD.hawkers[i], floor: 'lower', facing: 1,
      pose: h.look.sitting ? 'sit' : 'stand1', frame: 0, frameTime: 0,
      bubble: h.gone ? undefined : bubbleFor(i),
      name: h.name,
    }));
    scene.targets = targets(run.hawkers.map((h) => h.name), run.stalls.map((s) => s.name));
    void rng;
  }

  scene.onPrompt = (t: Target | null) => {
    hudHint.textContent = t ? `↑  ${t.label}` : '';
    hudHint.style.visibility = t ? 'visible' : 'hidden';
  };

  scene.onInteract = (t: Target) => {
    if (anyOpen()) return;
    switch (t.kind) {
      case 'stall':
        shop.open(run.stalls[t.index]);
        break;
      case 'dummy':
        dummy.open();
        break;
      case 'hawker': {
        const h = run.hawkers[t.index];
        if (!h || h.gone) return;
        trade.open(h, run.rng.derive(`haggle${run.day}:${t.index}:${Math.random()}`));
        break;
      }
      case 'door':
        finishDay();
        break;
    }
    scene.frozen = anyOpen();
  };

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === 'i' || e.key === 'I') {
      if (inventory.win.isOpen) inventory.win.close();
      else inventory.open();
      scene.frozen = anyOpen();
    }
    if (e.key === 'Escape') {
      for (const w of [inventory.win, inventory.itemWin, shop.win, dummy.win, trade.win, trade.bagWin]) w.close();
      hideTip();
      scene.frozen = false;
    }
    if (e.key === '`') dumpAll();
  });

  let dayStart = performance.now();
  let bankrollStart = run.mesos;

  function finishDay() {
    const entries = run.ledger;
    const from = bankrollStart;
    logDay({
      day: run.day,
      seconds: (performance.now() - dayStart) / 1000,
      bankrollStart: from,
      bankrollEnd: run.mesos,
      unsoldMarkups: run.stalls.flatMap((s) =>
        s.stock.filter((e) => !e.sold).map((e) => e.ask / item(e.itemId).price)),
    });
    const day = run.day;
    endDay(run);
    scene.frozen = true;
    ledger.show(day, entries, from, run.mesos);
  }

  function startDay() {
    if (run.over) return showEnding();
    dayStart = performance.now();
    bankrollStart = run.mesos;
    syncFloor();
    refresh();
    scene.frozen = false;
    showBanner(`DAY ${run.day}`);
  }

  function showEnding() {
    const text = run.over === 'won'
      ? `CASHED OUT ON DAY ${run.day}`
      : run.over === 'closed'
        ? 'THE MARKET IS CLOSED TO YOU'
        : run.over === 'busted'
          ? `BUSTED · PEAK ${mesoWord(run.peak)}`
          : `TWELVE DAYS · ${mesoWord(run.mesos)} OF ${mesoWord(TARGET)}`;
    banner.textContent = text;
    banner.classList.add('on');
    scene.frozen = true;
    dumpAll();
  }

  function showBanner(text: string) {
    banner.textContent = text;
    banner.classList.add('on');
    setTimeout(() => banner.classList.remove('on'), 1300);
  }

  syncFloor();
  refresh();
  showBanner('DAY 1');

  if (import.meta.env.DEV) {
    // A handle for the screenshot harness. Development only.
    (window as unknown as Record<string, unknown>).__lr = {
      run, scene, trade, shop, inventory, dummy, ledger, wager, arena,
      // Mutates in place, the way equipping does — never swap the object out.
      wear: (gear: Record<string, number>) => {
        for (const k of Object.keys(run.gear)) delete (run.gear as Record<string, number>)[k];
        Object.assign(run.gear, gear);
        refresh();
      },
      haggle: (i: number) => trade.open(run.hawkers[i], run.rng.derive('dev' + i)),
      challenge: (i: number) => {
        const h = run.hawkers[i];
        wager.open(h.name, h.look, h.trueValue, run.rng.derive('devw' + i));
      },
      fight: () => arena.open(
        { name: 'you', look: run.looks[0], gear: run.gear, record: '0W 0L' },
        { name: 'T3hPwnerer', look: run.hawkers[1].look, gear: { weapon: 7, cape: 24, ring: 27, helm: 10, body: 13 }, record: '4W 2L' },
        run.rng.derive('devfight'),
      ),
    };
  }

  let last = performance.now();
  function frame(now: number) {
    const dtMs = Math.min(64, now - last);
    last = now;
    scene.frozen = anyOpen();
    scene.update(dtMs / 1000);
    scene.draw();
    trade.step(dtMs);
    wager.step(dtMs / 1000);
    arena.step(Math.min(0.05, dtMs / 1000));
    dummy.step(dtMs / 1000, scene);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  void makeDistinctAppearances;
  void el;
  void floorY;
}

boot();
