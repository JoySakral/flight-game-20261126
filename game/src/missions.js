// missions.js — the three sorties, their rings, scoring and timing.
// A ring is {x, y, z, r}: fly through the glowing hoop to score.
import { WORLD, canyonCentre, terrainHeight } from './terrain.js';

export const MISSIONS = [
  {
    id: 'ring-run', name: 'Ring Run', timeLimit: 180, fuel: 100,
    brief: 'Thread all 8 rings over the valley, then land back at Meadowfield.',
    rings: [
      { x: 0, y: 90, z: 420, r: 26 },
      { x: 180, y: 120, z: 700, r: 26 },
      { x: 380, y: 150, z: 1000, r: 24 },
      { x: 300, y: 110, z: 1350, r: 24 },
      { x: -60, y: 140, z: 1650, r: 24 },
      { x: -380, y: 170, z: 1900, r: 24 },
      { x: -320, y: 120, z: 1500, r: 22 },
      { x: -120, y: 90, z: 1050, r: 22 },
    ],
    landAt: WORLD.runway,
  },
  {
    id: 'island-hop', name: 'Island Hop', timeLimit: 240, fuel: 100,
    brief: 'Follow the rings across the lake and put her down on the far strip.',
    rings: [
      { x: 60, y: 100, z: 500, r: 26 },
      { x: 260, y: 130, z: 850, r: 26 },
      { x: 430, y: 140, z: 1150, r: 24 },
      { x: 300, y: 150, z: 1500, r: 24 },
      { x: 40, y: 140, z: 1850, r: 24 },
      { x: -260, y: 110, z: 2150, r: 24 },
    ],
    landAt: WORLD.farStrip,
  },
  {
    id: 'canyon-courier', name: 'Canyon Courier', timeLimit: 210, fuel: 62,
    brief: 'Low and fast through the canyon. Fuel is tight — fly clean.',
    rings: (() => {
      const rings = [];
      for (let i = 0; i < 7; i++) {
        const z = 500 + i * 260;
        rings.push({ x: canyonCentre(z), y: 95 + (i % 2) * 25, z, r: 22 });
      }
      return rings;
    })(),
    landAt: WORLD.farStrip,
  },
];

export function newRun(missionIndex) {
  const mission = MISSIONS[missionIndex] ?? MISSIONS[0];
  // Hoops sit clear of the hills: at least 55 m above the ground below.
  const rings = mission.rings.map((r) => ({
    ...r,
    y: Math.max(r.y, terrainHeight(r.x, r.z) + 55),
    passed: false,
  }));
  return {
    mission,
    missionIndex,
    rings,
    nextRing: 0,
    score: 0,
    timeLeft: mission.timeLimit,
    ringsHit: 0,
    landedOk: false,
    finished: false,
    result: null, // 'complete' | 'crashed' | 'timeout' | 'out-of-fuel'
  };
}

// Distance from the plane to the centre of the next ring, and whether
// the plane just crossed its plane inside the hoop.
export function checkRing(run, px, py, pz, prevZAlong) {
  const ring = run.rings[run.nextRing];
  if (!ring) return null;
  const dx = px - ring.x, dy = py - ring.y, dz = pz - ring.z;
  const dist = Math.hypot(dx, dy, dz);
  return { ring, dist, index: run.nextRing };
}

export function scoreRing(run, speed) {
  const ring = run.rings[run.nextRing];
  if (!ring) return 0;
  ring.passed = true;
  run.nextRing += 1;
  run.ringsHit += 1;
  // Faster, cleaner flying pays more; a perfect line is worth a bonus.
  const points = 100 + Math.round(speed * 0.6);
  run.score += points;
  return points;
}

export function landingBonus(run, speed) {
  const bonus = 250 + Math.max(0, Math.round(run.timeLeft)) * 2;
  run.score += bonus;
  run.landedOk = true;
  return bonus;
}

// True when the segment from prev to cur crosses the next ring's plane
// inside the hoop. Rings face the incoming pilot (plane perpendicular
// to the valley's +z course axis).
export function ringCrossed(run, prev, cur) {
  const ring = run.rings[run.nextRing];
  if (!ring) return false;
  const crossed = (prev.z - ring.z) * (cur.z - ring.z) <= 0 && cur.z !== prev.z;
  if (!crossed) return false;
  const t = (ring.z - prev.z) / (cur.z - prev.z);
  const ix = prev.x + (cur.x - prev.x) * t;
  const iy = prev.y + (cur.y - prev.y) * t;
  const d = Math.hypot(ix - ring.x, iy - ring.y);
  return d < ring.r;
}

export function missionProgress(run) {
  return `${run.ringsHit} / ${run.rings.length} rings`;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
