// Per-device storage: the run in progress, best records, seen tips, settings.
// Storage can be missing or throw (private windows, blocked site data), so
// every call is guarded and the game works without it.

const KEY = 'gearfall.v1.'; // the old working title; kept so existing saves still load

export function load(name, fallback = null) {
  try {
    const raw = localStorage.getItem(KEY + name);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(name, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(KEY + name);
    else localStorage.setItem(KEY + name, JSON.stringify(value));
  } catch {
    // storage unavailable: nothing to do
  }
}

const seen = new Set(load('tips', []));
export function tipSeen(key) { return seen.has(key); }
export function markTip(key) {
  seen.add(key);
  save('tips', [...seen]);
}
export function resetTips() {
  seen.clear();
  save('tips', []);
}
