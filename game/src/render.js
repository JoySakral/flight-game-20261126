// render.js — the chase camera and the valley drawn on canvas 2D.
// A small software 3D projector: world points -> screen points, with
// painter's-algorithm terrain quads, fog and a gradient sky.
import { terrainHeight, groundColour, onRunway, WORLD, CLOUDS } from './terrain.js';

const TAU = Math.PI * 2;

export function makeCamera() {
  return { pos: { x: 0, y: 0, z: 0 }, fwd: { x: 0, y: 0, z: 1 }, right: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 }, f: 900 };
}

// Chase camera: behind and above the plane, looking at a point ahead.
export function updateCamera(cam, plane, W, H) {
  const ch = Math.cos(plane.heading), sh = Math.sin(plane.heading);
  const back = 15, above = 4.5;
  cam.pos.x = plane.x - sh * back;
  cam.pos.y = plane.y + above;
  cam.pos.z = plane.z - ch * back;
  // Look slightly ahead of the nose, with a touch of pitch.
  const lookX = plane.x + sh * 40;
  const lookY = plane.y + Math.sin(plane.pitch) * 30 + 2;
  const lookZ = plane.z + ch * 40;
  let fx = lookX - cam.pos.x, fy = lookY - cam.pos.y, fz = lookZ - cam.pos.z;
  const fl = Math.hypot(fx, fy, fz);
  cam.fwd = { x: fx / fl, y: fy / fl, z: fz / fl };
  // Right = fwd x world-up, up = right x fwd, then roll the pair a
  // little with the plane so banking reads on screen.
  let rx = cam.fwd.z, rz = -cam.fwd.x;
  const rl = Math.hypot(rx, rz) || 1;
  const r0 = { x: rx / rl, y: 0, z: rz / rl };
  // Up = fwd x right (right-handed): keeps the sky on top of the screen.
  const ux = cam.fwd.y * r0.z - cam.fwd.z * r0.y;
  const uy = cam.fwd.z * r0.x - cam.fwd.x * r0.z;
  const uz = cam.fwd.x * r0.y - cam.fwd.y * r0.x;
  const a = plane.roll * 0.35, ca = Math.cos(a), sa = Math.sin(a);
  cam.right = { x: r0.x * ca + ux * sa, y: r0.y * ca + uy * sa, z: r0.z * ca + uz * sa };
  cam.up = { x: ux * ca - r0.x * sa, y: uy * ca - r0.y * sa, z: uz * ca - r0.z * sa };
  cam.f = H * 1.05;
  cam.W = W; cam.H = H;
}

export function project(cam, x, y, z) {
  const dx = x - cam.pos.x, dy = y - cam.pos.y, dz = z - cam.pos.z;
  const cz = dx * cam.fwd.x + dy * cam.fwd.y + dz * cam.fwd.z;
  if (cz < 2) return null;
  const cx = dx * cam.right.x + dy * cam.right.y + dz * cam.right.z;
  const cy = dx * cam.up.x + dy * cam.up.y + dz * cam.up.z;
  return {
    x: cam.W / 2 + (cx / cz) * cam.f,
    y: cam.H / 2 - (cy / cz) * cam.f,
    d: cz,
  };
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function drawSky(ctx, cam, plane, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const horizon = H * 0.55 - plane.pitch * 260;
  g.addColorStop(0, '#2f6fc4');
  g.addColorStop(0.45, '#7fb4e8');
  g.addColorStop(0.62, '#cfe6f7');
  g.addColorStop(1, '#8fae7a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sun with a soft halo, fixed in the west.
  const sun = project(cam, cam.pos.x - 2600, cam.pos.y + 900, cam.pos.z + 1800);
  if (sun) {
    const halo = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 120);
    halo.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
    halo.addColorStop(0.25, 'rgba(255, 230, 150, 0.55)');
    halo.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sun.x, sun.y, 120, 0, TAU); ctx.fill();
  }
  return horizon;
}

// ---- Terrain: a grid of quads ahead of the plane, far to near. ----
export function drawTerrain(ctx, cam, plane) {
  const ROWS = 26, COLS = 22, FAR = 900, NEAR = -12; // start just ahead
  // of the camera (behind the plane) so the ground fills the screen bottom
  const ch = Math.cos(plane.heading), sh = Math.sin(plane.heading);
  const pts = [];
  for (let i = 0; i <= ROWS; i++) {
    const dist = NEAR + (FAR - NEAR) * Math.pow(i / ROWS, 1.5);
    const row = [];
    const halfW = 60 + dist * 0.55;
    for (let j = 0; j <= COLS; j++) {
      const lat = -halfW + (2 * halfW * j) / COLS;
      const wx = plane.x + sh * dist + ch * lat;
      const wz = plane.z + ch * dist - sh * lat;
      const wy = terrainHeight(wx, wz);
      row.push({ s: project(cam, wx, wy, wz), wx, wz, h: wy, dist });
    }
    pts.push(row);
  }
  // Far rows first so near quads paint over them.
  for (let i = ROWS; i >= 1; i--) {
    for (let j = 0; j < COLS; j++) {
      const a = pts[i - 1][j], b = pts[i - 1][j + 1];
      const c = pts[i][j + 1], d = pts[i][j];
      if (!a.s || !b.s || !c.s || !d.s) continue;
      const mx = (a.wx + c.wx) / 2, mz = (a.wz + c.wz) / 2;
      const h = (a.h + c.h) / 2;
      let col = groundColour(mx, mz, h);
      // Runway asphalt where the strip lies.
      if (onRunway(mx, mz, WORLD.runway) || onRunway(mx, mz, WORLD.farStrip)) {
        col = '#3a3f46';
      }
      // Fog: fade far quads toward the sky haze.
      const fog = Math.min(0.75, a.dist / 1200);
      ctx.fillStyle = fog > 0 ? mixColour(col, '#bcd6ee', fog) : col;
      ctx.beginPath();
      ctx.moveTo(a.s.x, a.s.y); ctx.lineTo(b.s.x, b.s.y);
      ctx.lineTo(c.s.x, c.s.y); ctx.lineTo(d.s.x, d.s.y);
      ctx.closePath(); ctx.fill();
    }
  }
  drawRunwayMarks(ctx, cam, plane);
}

function mixColour(hex, fogHex, t) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(fogHex.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

// Centre-line dashes and threshold bars on both strips.
function drawRunwayMarks(ctx, cam, plane) {
  for (const strip of [WORLD.runway, WORLD.farStrip]) {
    const c = Math.cos(strip.heading), s = Math.sin(strip.heading);
    for (let k = -9; k <= 9; k++) {
      const along = k * 22;
      const wx = strip.x + s * along, wz = strip.z + c * along;
      const p1 = project(cam, wx - c * 1.2, 0.4, wz + s * 1.2);
      const p2 = project(cam, wx + c * 1.2, 0.4, wz - s * 1.2);
      const p3 = project(cam, wx + c * 1.2, 0.4, wz - s * 1.2 + c * 9);
      const p4 = project(cam, wx - c * 1.2, 0.4, wz + s * 1.2 + c * 9);
      if (!p1 || !p2 || !p3 || !p4) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath(); ctx.fill();
    }
  }
}

// ---- Rings: glowing hoops, the next one brightest, with a light pillar. ----
export function drawRings(ctx, cam, run, time) {
  run.rings.forEach((ring, i) => {
    const p = project(cam, ring.x, ring.y, ring.z);
    if (!p) return;
    const rPx = (ring.r / p.d) * cam.f;
    if (rPx < 2 || rPx > 2600) return;
    const isNext = i === run.nextRing;
    const isDone = ring.passed;
    const pulse = 0.75 + 0.25 * Math.sin(time * 4);
    ctx.save();
    ctx.lineWidth = Math.max(2, rPx * 0.09);
    if (isDone) {
      ctx.strokeStyle = 'rgba(90, 220, 130, 0.5)';
    } else if (isNext) {
      ctx.strokeStyle = `rgba(80, 230, 255, ${0.55 + 0.45 * pulse})`;
      ctx.shadowColor = '#33d5ff'; ctx.shadowBlur = 26;
    } else {
      ctx.strokeStyle = 'rgba(255, 190, 80, 0.55)';
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, rPx, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, rPx * 0.03);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(p.x, p.y, rPx * 0.82, 0, TAU); ctx.stroke();
    // Number tag above the next ring.
    if (isNext) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.max(13, Math.min(30, rPx * 0.28))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${i + 1}`, p.x, p.y - rPx - 12);
    }
    ctx.restore();
  });
}

// ---- Clouds: soft white puffs, nearer ones bigger and lower. ----
export function drawClouds(ctx, cam) {
  ctx.save();
  for (const c of CLOUDS) {
    const p = project(cam, c.x, c.y, c.z);
    if (!p) continue;
    const r = (c.r / p.d) * cam.f;
    if (r < 3 || r > 900) continue;
    const alpha = Math.max(0.12, Math.min(0.85, 320 / p.d));
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, TAU);
    ctx.ellipse(p.x - r * 0.5, p.y + r * 0.08, r * 0.6, r * 0.3, 0, 0, TAU);
    ctx.ellipse(p.x + r * 0.5, p.y + r * 0.06, r * 0.65, r * 0.32, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
