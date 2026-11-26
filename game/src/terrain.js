// terrain.js — the Green Valley: a seeded heightfield, a lake, the two
// airstrips and the drifting clouds. Everything is deterministic so a
// screenshot and a replay always show the same valley.
export const WORLD = {
  runway: { x: 0, z: 0, length: 420, width: 26, heading: 0 }, // Meadowfield strip, along +z
  farStrip: { x: -260, z: 2350, length: 380, width: 24, heading: 0.35 },
  lake: { x: 420, z: 1150, rx: 260, rz: 200 },
  bounds: 3200,
};

function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295);
}

function smoothNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function fbm(x, z) {
  return smoothNoise(x * 0.004, z * 0.004) * 0.62
    + smoothNoise(x * 0.011 + 31, z * 0.011 + 17) * 0.27
    + smoothNoise(x * 0.03 + 7, z * 0.03 + 47) * 0.11;
}

// Distance from a point to the centre line of a strip (for flattening).
function stripDistance(x, z, strip) {
  const dx = x - strip.x, dz = z - strip.z;
  const c = Math.cos(strip.heading), s = Math.sin(strip.heading);
  const along = dx * s + dz * c;          // along the strip
  const across = dx * c - dz * s;         // across the strip
  const da = Math.max(0, Math.abs(along) - strip.length / 2);
  const dc = Math.max(0, Math.abs(across) - strip.width / 2 - 14);
  return Math.hypot(da, dc);
}

export function terrainHeight(x, z) {
  // Rolling valley floor with rising ridges to the east and west.
  const ridge = Math.pow(Math.abs(x) / 1500, 2.2) * 260;
  const hills = fbm(x, z) * 150;
  let h = ridge + hills - 40;
  // Carve the lake basin.
  const lx = (x - WORLD.lake.x) / WORLD.lake.rx;
  const lz = (z - WORLD.lake.z) / WORLD.lake.rz;
  const lakeD = lx * lx + lz * lz;
  if (lakeD < 1.4) h = Math.min(h, -6 + lakeD * 22);
  // Flatten both airstrips and their approaches.
  const d1 = stripDistance(x, z, WORLD.runway);
  const d2 = stripDistance(x, z, WORLD.farStrip);
  const flat = Math.min(d1, d2);
  const t = Math.min(1, flat / 130);
  return h * (t * t * (3 - 2 * t));
}

export function onRunway(x, z, strip) {
  const dx = x - strip.x, dz = z - strip.z;
  const c = Math.cos(strip.heading), s = Math.sin(strip.heading);
  const along = dx * s + dz * c;
  const across = dx * c - dz * s;
  return Math.abs(along) <= strip.length / 2 && Math.abs(across) <= strip.width / 2;
}

export function inLake(x, z) {
  const lx = (x - WORLD.lake.x) / WORLD.lake.rx;
  const lz = (z - WORLD.lake.z) / WORLD.lake.rz;
  return lx * lx + lz * lz < 1;
}

// ---- Clouds: fixed puffs that drift slowly with the wind. ----
export const CLOUDS = [];
{
  let seed = 1234567;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 46; i++) {
    CLOUDS.push({
      x: (rnd() - 0.5) * 5200,
      y: 260 + rnd() * 260,
      z: -600 + rnd() * 3600,
      r: 60 + rnd() * 130,
      speed: 2 + rnd() * 3,
    });
  }
}

export function updateClouds(dt) {
  for (const c of CLOUDS) {
    c.x += c.speed * dt;
    if (c.x > 2700) c.x = -2700;
  }
}

// The canyon for mission 3: a winding low slot between two ridge walls.
export function canyonCentre(z) {
  return Math.sin(z * 0.0016) * 260;
}

export function canyonHalfWidth(z) {
  return 90 + Math.sin(z * 0.0021 + 2) * 22;
}
export function groundColour(x, z, h) {
  const n = smoothNoise(x * 0.02 + 3, z * 0.02 + 9);
  if (inLake(x, z)) return '#3f7fb8';
  if (h > 150) return '#8d8a86';            // high rock
  if (h > 105) return '#7d8f6a';            // high scrub
  if (n > 0.72) return '#4d7a45';           // pine forest
  if (n > 0.55) return '#b3a05a';           // wheat field
  if (n > 0.38) return '#79a854';           // meadow
  return '#6f9e4e';                         // pasture
}
