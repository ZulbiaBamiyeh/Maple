import { el } from './dom';

export interface Win {
  root: HTMLElement;
  body: HTMLElement;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  onClose?: () => void;
}

let topZ = 40;

/** A classic window frame: title bar with a small-caps label and the ✕. §4.5 */
export function makeWindow(title: string, opts: { x?: number; y?: number; width?: number } = {}): Win {
  const root = el('div', 'win');
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

  const win: Win = {
    root, body,
    get isOpen() { return root.classList.contains('open'); },
    open() {
      root.classList.add('open');
      root.style.zIndex = String(++topZ);
    },
    close() {
      root.classList.remove('open');
      win.onClose?.();
    },
  };

  x.addEventListener('click', () => win.close());
  root.addEventListener('pointerdown', () => { root.style.zIndex = String(++topZ); });

  // Drag by the title bar, clamped so a window can never be lost off-screen.
  let dragging = false;
  let ox = 0, oy = 0;
  bar.addEventListener('pointerdown', (e) => {
    dragging = true;
    ox = e.clientX - root.offsetLeft;
    oy = e.clientY - root.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    root.style.left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - ox)) + 'px';
    root.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - oy)) + 'px';
  });
  bar.addEventListener('pointerup', () => { dragging = false; });

  return win;
}

export function setTitle(win: Win, title: string) {
  (win.root.querySelector('.win-title') as HTMLElement).textContent = title;
}
