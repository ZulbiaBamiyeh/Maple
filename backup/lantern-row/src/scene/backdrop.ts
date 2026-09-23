/**
 * The hall: brick, bunting, lantern light, a numbered upper walkway where the
 * portals used to be, and the lower floor where the people are. Painted once
 * into an offscreen canvas and blitted, because none of it moves. §5
 */
import { WORLD } from './world';

function brick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const bw = 34, bh = 17;
  ctx.fillStyle = '#6a5050';
  ctx.fillRect(x, y, w, h);
  for (let row = 0, j = y; j < y + h; row++, j += bh) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let i = x - bw; i < x + w; i += bw) {
      const shade = 0.82 + ((i * 7 + j * 13) % 11) / 40;
      ctx.fillStyle = `rgb(${Math.round(132 * shade)}, ${Math.round(96 * shade)}, ${Math.round(86 * shade)})`;
      ctx.fillRect(i + offset + 1, j + 1, bw - 2, bh - 2);
    }
  }
  ctx.fillStyle = 'rgba(20, 12, 14, 0.35)';
  ctx.fillRect(x, y, w, 3);
}

function plank(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#9c6f3f');
  grad.addColorStop(0.35, '#7d5730');
  grad.addColorStop(1, '#4e3520');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(40, 24, 12, 0.5)';
  ctx.lineWidth = 1;
  for (let i = x; i < x + w; i += 46) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, y);
    ctx.lineTo(i + 0.5, y + h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 220, 170, 0.22)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x, y + h - 3, w, 3);
}

function bunting(ctx: CanvasRenderingContext2D, y: number) {
  const colours = ['#d24b4b', '#e8a33d', '#48a05a', '#3f7ad6', '#b060c0'];
  ctx.strokeStyle = '#2d2118';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += 8) {
    const sag = Math.sin((x / WORLD.width) * Math.PI * 7) * 9 + 12;
    if (x === 0) ctx.moveTo(x, y + sag);
    else ctx.lineTo(x, y + sag);
  }
  ctx.stroke();
  for (let i = 0, x = 14; x < WORLD.width; i++, x += 38) {
    const sag = Math.sin((x / WORLD.width) * Math.PI * 7) * 9 + 12;
    ctx.fillStyle = colours[i % colours.length];
    ctx.beginPath();
    ctx.moveTo(x - 11, y + sag);
    ctx.lineTo(x + 11, y + sag);
    ctx.lineTo(x, y + sag + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x - 11, y + sag);
    ctx.lineTo(x - 2, y + sag);
    ctx.lineTo(x - 6, y + sag + 10);
    ctx.closePath();
    ctx.fill();
  }
}

function lantern(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x, y - 12);
  ctx.stroke();
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 96);
  glow.addColorStop(0, 'rgba(255, 205, 120, 0.55)');
  glow.addColorStop(0.45, 'rgba(255, 180, 85, 0.22)');
  glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - 11, y - 13, 22, 5);
  ctx.fillStyle = '#e8b34a';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 8);
  ctx.lineTo(x + 10, y - 8);
  ctx.lineTo(x + 7, y + 12);
  ctx.lineTo(x - 7, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff0c0';
  ctx.fillRect(x - 6, y - 6, 5, 15);
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - 8, y + 12, 16, 4);
}

function awning(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hue: string) {
  const stripes = 8;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? hue : '#f3ece0';
    ctx.beginPath();
    ctx.moveTo(x + i * sw, y);
    ctx.lineTo(x + (i + 1) * sw, y);
    ctx.lineTo(x + (i + 1) * sw + 7, y + 26);
    ctx.lineTo(x + i * sw + 7, y + 26);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x, y - 3, w, 4);
  // scalloped edge
  for (let i = 0; i <= stripes; i++) {
    ctx.fillStyle = i % 2 ? hue : '#f3ece0';
    ctx.beginPath();
    ctx.arc(x + 7 + i * sw, y + 26, sw / 2, 0, Math.PI);
    ctx.fill();
  }
}

function stallFront(ctx: CanvasRenderingContext2D, x: number, floorTop: number, index: number) {
  const hues = ['#c9524f', '#4f79c9', '#4f9f5c'];
  const w = 128, h = 96;
  const left = x - w / 2;
  const top = floorTop - h;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(left + 6, floorTop - 6, w, 8);

  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = '#83603b';
  ctx.fillRect(left + 4, top + 4, w - 8, h - 8);
  ctx.fillStyle = 'rgba(30, 18, 8, 0.35)';
  ctx.fillRect(left + 4, top + h - 30, w - 8, 26);

  awning(ctx, left - 6, top - 20, w + 12, hues[index % hues.length]);

  // hanging sign: FM 1, FM 2, FM 3, right where the numbered portals sat
  const sx = x, sy = top - 60;
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 22, sy); ctx.lineTo(sx - 22, sy + 14);
  ctx.moveTo(sx + 22, sy); ctx.lineTo(sx + 22, sy + 14);
  ctx.stroke();
  ctx.fillStyle = '#2f2418';
  ctx.fillRect(sx - 34, sy + 14, 68, 28);
  ctx.fillStyle = '#c8a45c';
  ctx.fillRect(sx - 31, sy + 17, 62, 22);
  ctx.fillStyle = '#2f2418';
  ctx.font = '13px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FM ${index + 1}`, sx, sy + 29);
}

function door(ctx: CanvasRenderingContext2D, x: number, floorTop: number) {
  const w = 74, h = 104;
  const left = x - w / 2, top = floorTop - h;
  ctx.fillStyle = '#241a12';
  ctx.fillRect(left - 5, top - 6, w + 10, h + 6);
  const g = ctx.createLinearGradient(left, 0, left + w, 0);
  g.addColorStop(0, '#8a5f34');
  g.addColorStop(0.5, '#a97a45');
  g.addColorStop(1, '#754d28');
  ctx.fillStyle = g;
  ctx.fillRect(left, top, w, h);
  ctx.strokeStyle = '#3a2715';
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 8.5, top + 10.5, w - 17, h - 22);
  ctx.fillStyle = '#e8c463';
  ctx.beginPath();
  ctx.arc(left + w - 15, top + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(left - 6, top - 28, w + 12, 22);
  ctx.fillStyle = '#ffd866';
  ctx.font = '12px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HOME', x, top - 16);
}

function ladder(ctx: CanvasRenderingContext2D) {
  const x = WORLD.ladderX;
  ctx.fillStyle = '#7a5430';
  ctx.fillRect(x - 15, WORLD.ladderTop - 14, 5, WORLD.ladderBottom - WORLD.ladderTop + 14);
  ctx.fillRect(x + 10, WORLD.ladderTop - 14, 5, WORLD.ladderBottom - WORLD.ladderTop + 14);
  ctx.fillStyle = '#9a6c3e';
  for (let y = WORLD.ladderTop - 8; y < WORLD.ladderBottom; y += 18) {
    ctx.fillRect(x - 15, y, 30, 5);
  }
}

/** Straw body, cross-beam arms, a sandbag head and a target nailed to its chest. */
function dummy(ctx: CanvasRenderingContext2D, x: number, floorTop: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(x, floorTop - 2, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // base and post
  ctx.fillStyle = '#5a3d22';
  ctx.fillRect(x - 22, floorTop - 12, 44, 12);
  ctx.fillStyle = '#7a5430';
  ctx.fillRect(x - 20, floorTop - 14, 40, 4);
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(x - 6, floorTop - 96, 12, 84);

  // straw body
  ctx.fillStyle = '#c9a352';
  ctx.beginPath();
  ctx.ellipse(x, floorTop - 66, 24, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dfbc6b';
  ctx.beginPath();
  ctx.ellipse(x - 6, floorTop - 72, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6b2c';
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 6, floorTop - 92);
    ctx.lineTo(x + i * 7, floorTop - 40);
    ctx.stroke();
  }
  // binding ropes
  ctx.strokeStyle = '#4a3218';
  ctx.lineWidth = 3;
  for (const y of [floorTop - 80, floorTop - 56]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 23, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // cross-beam arms
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(x - 42, floorTop - 84, 84, 9);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x - 42, floorTop - 84, 84, 3);

  // sandbag head
  ctx.fillStyle = '#d8c9a2';
  ctx.beginPath();
  ctx.ellipse(x, floorTop - 106, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3218';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, floorTop - 96, 12, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // target
  const rings = [['#efe9d6', 15], ['#d2453f', 11], ['#efe9d6', 7], ['#d2453f', 3]] as const;
  for (const [c, r] of rings) {
    ctx.fillStyle = c as string;
    ctx.beginPath();
    ctx.arc(x + 2, floorTop - 64, r as number, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#4a3a24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 2, floorTop - 64, 15, 0, Math.PI * 2);
  ctx.stroke();
}

export function paintBackdrop(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = WORLD.width;
  c.height = WORLD.height;
  const ctx = c.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, '#3f3038');
  sky.addColorStop(0.38, '#59413b');
  sky.addColorStop(1, '#33262a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  brick(ctx, 0, WORLD.upperFloor + 12, WORLD.width, WORLD.lowerFloor - WORLD.upperFloor - 12);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.upperFloor - 190);

  bunting(ctx, 26);
  bunting(ctx, 74);

  for (let x = 220; x < WORLD.width; x += 420) lantern(ctx, x, WORLD.upperFloor + 92);
  for (let x = 150; x < WORLD.width; x += 330) lantern(ctx, x, 132);

  plank(ctx, 0, WORLD.upperFloor, WORLD.width, 14);
  WORLD.stalls.forEach((x, i) => stallFront(ctx, x, WORLD.upperFloor, i));
  dummy(ctx, WORLD.dummyX, WORLD.upperFloor);
  door(ctx, WORLD.doorX, WORLD.upperFloor);
  ladder(ctx);

  plank(ctx, 0, WORLD.lowerFloor, WORLD.width, 20);
  ctx.fillStyle = 'rgba(26, 16, 18, 0.62)';
  ctx.fillRect(0, WORLD.lowerFloor + 20, WORLD.width, WORLD.height - WORLD.lowerFloor - 20);

  // a warm wash, so the whole hall reads as lantern-lit rather than merely dark
  const warm = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  warm.addColorStop(0, 'rgba(255, 170, 90, 0.10)');
  warm.addColorStop(0.55, 'rgba(255, 150, 70, 0.06)');
  warm.addColorStop(1, 'rgba(120, 60, 40, 0.10)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // side walls, so the hall reads as indoors
  ctx.fillStyle = '#1a1418';
  ctx.fillRect(0, 0, WORLD.leftWall - 12, WORLD.height);
  ctx.fillRect(WORLD.rightWall + 12, 0, WORLD.width, WORLD.height);

  return c;
}
