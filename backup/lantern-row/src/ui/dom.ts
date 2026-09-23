export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node: HTMLElement) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mesos(v: number): string {
  return v.toLocaleString('en-US');
}

/** How the market talks about money: 60k, 1.2m. */
export function short(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000;
    return (Number.isInteger(m) ? m : Number(m.toFixed(1))) + 'm';
  }
  if (Math.abs(v) >= 1000) return Math.round(v / 1000) + 'k';
  return String(Math.round(v));
}

export function timestamp(): string {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}]`;
}
