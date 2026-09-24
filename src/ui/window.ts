import { el } from './dom';

export interface Win {
  root: HTMLElement;
  body: HTMLElement;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  onClose?: () => void;
}

/**
 * Where a window docks on a phone. The desktop layout places windows at fixed
 * pixel positions laid out for a wide screen; a phone has no room for that, so
 * each window names a side instead, or sits just right of a partner window.
 */
export type Dock = 'left' | 'right' | 'center' | { after: Win };

let topZ = 40;
const EDGE = 6;

/** Short screens (a phone on its side) and narrow ones get the docked layout. */
const compactQuery = window.matchMedia('(max-height: 540px), (max-width: 600px)');
export function isCompact(): boolean { return compactQuery.matches; }

/** The notch and home-bar insets, read once from CSS. */
let safeProbe: HTMLElement | null = null;
function safeArea() {
  if (!safeProbe) {
    safeProbe = el('div');
    safeProbe.id = 'safe-probe';
    document.body.append(safeProbe);
  }
  const cs = getComputedStyle(safeProbe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

const all: { win: Win; place: (reset: boolean) => void }[] = [];

/** A classic window frame: title bar with a small-caps label and the ✕. §4.5 */
export function makeWindow(
  title: string,
  opts: { x?: number; y?: number; width?: number; dock?: Dock; cls?: string } = {},
): Win {
  const root = el('div', 'win' + (opts.cls ? ' ' + opts.cls : ''));
  const bar = el('div', 'win-bar');
  const label = el('div', 'win-title', title);
  const x = el('div', 'win-x', '✕');
  bar.append(label, x);
  const body = el('div', 'win-body');
  root.append(bar, body);
  if (opts.width) root.style.width = opts.width + 'px';
  root.style.left = (opts.x ?? 120) + 'px';
  root.style.top = (opts.y ?? 90) + 'px';
  document.getElementById('stage')!.append(root);

  let scale = 1;

  /**
   * Keeps the whole window on screen: shrinks it if it cannot fit, docks it on
   * a phone, and pulls it back inside the edges (and clear of the notch).
   */
  function place(reset: boolean) {
    if (!win.isOpen) return;
    root.style.transform = '';
    const w = root.offsetWidth, h = root.offsetHeight;
    const s = safeArea();
    const availW = window.innerWidth - s.left - s.right - EDGE * 2;
    const availH = window.innerHeight - s.top - s.bottom - EDGE * 2;
    scale = Math.min(1, availW / w, availH / h);
    root.style.transform = scale < 1 ? `scale(${scale})` : '';
    const sw = w * scale, sh = h * scale;
    const minX = s.left + EDGE, maxX = window.innerWidth - s.right - EDGE - sw;
    const minY = s.top + EDGE, maxY = window.innerHeight - s.bottom - EDGE - sh;

    let left = root.offsetLeft, top = root.offsetTop;
    if (reset && isCompact()) {
      const dock = opts.dock ?? 'center';
      if (dock === 'left') left = minX;
      else if (dock === 'right') left = maxX;
      else if (dock === 'center') left = (minX + maxX) / 2;
      else {
        const partner = dock.after.root;
        const pw = partner.getBoundingClientRect().width;
        left = partner.offsetLeft + pw + EDGE;
      }
      top = dock === 'center' ? (minY + maxY) / 2 : minY;
    }
    root.style.left = Math.round(Math.max(minX, Math.min(maxX, left))) + 'px';
    root.style.top = Math.round(Math.max(minY, Math.min(maxY, top))) + 'px';
  }

  const win: Win = {
    root, body,
    get isOpen() { return root.classList.contains('open'); },
    open() {
      const was = win.isOpen;
      root.classList.add('open');
      root.style.zIndex = String(++topZ);
      place(!was);
    },
    close() {
      root.classList.remove('open');
      win.onClose?.();
    },
  };
  all.push({ win, place });

  x.addEventListener('click', () => win.close());
  root.addEventListener('pointerdown', () => { root.style.zIndex = String(++topZ); });

  // Drag by the title bar, clamped so a window can never be lost off-screen.
  let dragging = false;
  let ox = 0, oy = 0;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target === x) return;
    dragging = true;
    ox = e.clientX - root.offsetLeft;
    oy = e.clientY - root.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const sw = root.offsetWidth * scale;
    root.style.left = Math.max(80 - sw, Math.min(window.innerWidth - 80, e.clientX - ox)) + 'px';
    root.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - oy)) + 'px';
  });
  const stop = () => { dragging = false; };
  bar.addEventListener('pointerup', stop);
  bar.addEventListener('pointercancel', stop);

  return win;
}

/**
 * Refit open windows when the screen changes shape — but not while someone is
 * typing, because a phone's keyboard squeezes the viewport and the window
 * would shrink to nothing under their thumbs.
 */
function refit(reset: boolean) {
  if ((document.activeElement as HTMLElement | null)?.tagName === 'INPUT') return;
  for (const { place } of all) place(reset);
}
window.addEventListener('resize', () => refit(false));
window.addEventListener('orientationchange', () => setTimeout(() => refit(true), 250));
compactQuery.addEventListener('change', () => refit(true));

export function setTitle(win: Win, title: string) {
  (win.root.querySelector('.win-title') as HTMLElement).textContent = title;
}
