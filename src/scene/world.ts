/** Geometry of the hall. Modelled on the Free Market Entrance. §5 */
export const WORLD = {
  width: 2040,
  height: 640,
  lowerFloor: 588,
  upperFloor: 322,
  ladderX: 96,
  ladderTop: 322,
  ladderBottom: 588,
  stalls: [420, 800, 1180],
  dummyX: 1520,
  doorX: 1852,
  hawkers: [430, 790, 1150, 1510],
  leftWall: 44,
  rightWall: 1990,
};

export type Floor = 'lower' | 'upper';

export function floorY(floor: Floor): number {
  return floor === 'upper' ? WORLD.upperFloor : WORLD.lowerFloor;
}

export interface Target {
  kind: 'stall' | 'dummy' | 'door' | 'hawker' | 'board';
  index: number;
  x: number;
  floor: Floor;
  label: string;
}

export function targets(hawkerNames: string[], stallNames: string[]): Target[] {
  const list: Target[] = [];
  WORLD.stalls.forEach((x, i) => list.push({
    kind: 'stall', index: i, x, floor: 'upper', label: stallNames[i] ?? `FM ${i + 1}`,
  }));
  list.push({ kind: 'dummy', index: 0, x: WORLD.dummyX, floor: 'upper', label: 'Training Dummy' });
  list.push({ kind: 'door', index: 0, x: WORLD.doorX, floor: 'upper', label: 'HOME' });
  WORLD.hawkers.forEach((x, i) => list.push({
    kind: 'hawker', index: i, x, floor: 'lower', label: hawkerNames[i] ?? '',
  }));
  return list;
}

export function nearest(list: Target[], x: number, floor: Floor, range = 68): Target | null {
  let best: Target | null = null;
  let bestD = range;
  for (const t of list) {
    if (t.floor !== floor) continue;
    const d = Math.abs(t.x - x);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}
