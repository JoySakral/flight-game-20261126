// shots.js — deterministic screenshot states for the maker's camera.
// ?shot=start  menu over Meadowfield at dawn (the cover)
// ?shot=play   mid-flight, chasing the first ring over the wheat fields
// ?shot=ring   right on the second ring, low over the lake approach
// ?shot=land   final approach to the far strip, gear down, HUD lit
// With no ?shot the game opens on the menu as normal.
import { WORLD } from './terrain.js';

function placePlane(game, x, y, z, heading, speed, throttle) {
  const p = game.plane;
  p.x = x; p.y = y; p.z = z;
  p.heading = heading; p.speed = speed; p.throttle = throttle;
  p.pitch = 0.05; p.roll = -0.12;
  p.onGround = false;
  p.verticalSpeed = 0;
  game.ctl.throttle = throttle;
}

export function applyShot(game, startMission) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  const menuEl = document.getElementById('menu');
  if (shot === 'start' || shot === 'menu') {
    // Menu state, plane parked on the strip, camera already looking
    // down the runway: the cover shot.
    game.plane.x = WORLD.runway.x;
    game.plane.y = 2;
    game.plane.z = WORLD.runway.z - 120;
    game.plane.heading = 0;
    game.plane.speed = 0;
    game.time = 6; // a little morning light on the fields
    return;
  }
  if (shot === 'play') {
    startMission(0);
    placePlane(game, 120, 130, 560, 0.25, 135, 0.72);
    game.run.score = 120;
    game.run.ringsHit = 1;
    game.run.rings[0].passed = true;
    game.run.nextRing = 1;
    game.time = 42;
    game.run.timeLeft = 138;
    return;
  }
  if (shot === 'ring') {
    startMission(0);
    placePlane(game, 330, 148, 930, -0.12, 150, 0.8);
    game.run.score = 265;
    game.run.ringsHit = 2;
    game.run.rings[0].passed = true;
    game.run.rings[1].passed = true;
    game.run.nextRing = 2;
    game.time = 71;
    game.run.timeLeft = 109;
    return;
  }
  if (shot === 'land') {
    startMission(1);
    const strip = WORLD.farStrip;
    // Final approach: on the strip's extended centre line, 620 m out.
    const ax = strip.x - Math.sin(strip.heading) * 620;
    const az = strip.z - Math.cos(strip.heading) * 620;
    placePlane(game, ax, 95, az, strip.heading, 88, 0.35);
    game.plane.gearDown = true;
    game.run.score = 740;
    game.run.ringsHit = 6;
    game.run.rings.forEach((r) => { r.passed = true; });
    game.run.nextRing = 6;
    game.time = 150;
    game.run.timeLeft = 90;
    return;
  }
  void menuEl;
}
