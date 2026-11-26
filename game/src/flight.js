// flight.js — the courier plane's flight model: throttle, lift, stall,
// banked turns, ground effect and landing. Speeds in knots-ish units,
// distances in metres, angles in radians.
import { terrainHeight, onRunway, WORLD } from './terrain.js';

export const PLANE = {
  minFlySpeed: 52,     // below this she stalls
  maxSpeed: 215,       // flat out, full throttle, level
  cruiseSpeed: 130,
  climbRate: 9,        // m/s at full power, nose up
  turnRate: 0.55,      // rad/s at full bank
  accel: 26,           // speed gained per second at full throttle
  drag: 0.14,          // per-second drag factor
  fuelBurn: 0.55,      // fuel units per second at full throttle
};

export function newPlane() {
  return {
    x: WORLD.runway.x, y: 2, z: WORLD.runway.z - WORLD.runway.length / 2 + 30,
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0, fuel: 100, damage: 0,
    gearDown: true, brakes: false, onGround: true,
    verticalSpeed: 0, stalled: false,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// One physics step. `ctl` is {pitch, roll, throttle, brakes} in [-1, 1]
// (throttle 0..1). Returns an event string: 'takeoff' | 'stall' | null.
export function stepFlight(p, ctl, dt) {
  const wasGround = p.onGround;
  p.throttle = clamp(ctl.throttle, 0, 1);
  p.brakes = !!ctl.brakes;

  // Throttle changes speed; drag grows with speed squared.
  const thrust = p.throttle * PLANE.accel;
  const drag = PLANE.drag * (p.speed / 100) * (p.speed / 100) * 26;
  let accel = thrust - drag;
  if (p.onGround && p.brakes) accel -= 34;
  if (p.onGround && p.speed < 4 && p.throttle < 0.15) accel = Math.min(accel, 0);
  p.speed = Math.max(0, p.speed + accel * dt);
  if (p.speed > PLANE.maxSpeed) p.speed = PLANE.maxSpeed;

  // Fuel burns with throttle; empty tanks mean a glider.
  if (p.throttle > 0 && p.fuel > 0) {
    p.fuel = Math.max(0, p.fuel - PLANE.fuelBurn * (0.25 + p.throttle) * dt);
    if (p.fuel === 0) p.throttle = 0;
  }

  // Attitude follows the stick, damped so the plane feels weighty.
  const targetRoll = ctl.roll * 0.9;
  const targetPitch = ctl.pitch * 0.42;
  p.roll = lerp(p.roll, targetRoll, Math.min(1, dt * 3.2));
  p.pitch = lerp(p.pitch, targetPitch, Math.min(1, dt * 2.6));

  // Banked turn: heading changes with roll, faster when fast.
  const turnAuthority = clamp(p.speed / PLANE.cruiseSpeed, 0.25, 1.15);
  p.heading += -Math.sin(p.roll) * PLANE.turnRate * turnAuthority * dt;

  // Lift: enough speed and she flies; too slow and she sinks.
  const flying = p.speed >= PLANE.minFlySpeed;
  p.stalled = !flying && !p.onGround && p.y > terrainHeight(p.x, p.z) + 3;
  const lift = flying ? Math.sin(p.pitch) * PLANE.climbRate * (p.speed / PLANE.cruiseSpeed) : 0;
  const sink = flying ? -1.2 : -9.5;
  p.verticalSpeed = lift + sink;
  if (p.onGround) p.verticalSpeed = 0;

  // Move along the nose direction. On the ground she stays planted
  // until she has rotation speed; then the nose lifts and she flies.
  const ch = Math.cos(p.heading), sh = Math.sin(p.heading);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const fx = sh * cp, fy = sp, fz = ch * cp;
  const canRotate = p.speed >= PLANE.minFlySpeed;
  p.x += fx * p.speed * dt;
  if (!p.onGround || canRotate) p.y += fy * p.speed * dt + p.verticalSpeed * dt * 0.4;
  p.z += fz * p.speed * dt;

  // Stay inside the valley.
  const B = WORLD.bounds;
  if (Math.abs(p.x) > B || p.z < -900 || p.z > 3400) {
    p.heading += Math.PI; // bounce the nose back into the valley
  }

  // Ground contact.
  const ground = terrainHeight(p.x, p.z);
  const gearClearance = 2.2;
  if (p.y <= ground + gearClearance) {
    p.y = ground + gearClearance;
    if (!wasGround) return landOrCrash(p, ground);
    p.onGround = true;
    p.pitch = 0;
  } else {
    p.onGround = false;
  }
  return wasGround && !p.onGround ? 'takeoff' : null;
}

// Called the moment wheels (or belly) touch. Decides a good landing
// from a crash, and applies damage.
function landOrCrash(p, ground) {
  p.onGround = true;
  const strip = onRunway(p.x, p.z, WORLD.runway) ? WORLD.runway
    : onRunway(p.x, p.z, WORLD.farStrip) ? WORLD.farStrip : null;
  const descent = -p.verticalSpeed;
  const aligned = strip ? Math.abs(angleDiff(p.heading, strip.heading)) < 0.5 : false;
  const gentle = descent < 6 && p.speed < 120 && Math.abs(p.roll) < 0.45;
  if (strip && aligned && gentle && p.gearDown) {
    p.pitch = 0;
    p.speed = Math.max(0, p.speed - 12);
    return 'landed';
  }
  // Anything else is a crash, harder the faster and steeper it was.
  const severity = clamp((p.speed / 120) + descent / 8, 0.35, 1);
  p.damage = Math.min(100, p.damage + Math.round(35 + 65 * severity));
  p.speed = 0;
  return p.damage >= 100 ? 'crashed' : 'bounced';
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function altitudeAboveGround(p) {
  return Math.max(0, p.y - terrainHeight(p.x, p.z));
}

export function headingDegrees(p) {
  let d = (p.heading * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}
