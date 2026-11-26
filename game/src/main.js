// main.js — Sky Courier: boots the game, runs the loop, owns the
// menu / flying / paused / finished states and wires every module.
import { newPlane, stepFlight, altitudeAboveGround } from './flight.js';
import { newRun, scoreRing, landingBonus, ringCrossed, checkRing, formatTime } from './missions.js';
import { makeCamera, updateCamera, drawSky, drawTerrain, drawRings, drawClouds, project } from './render.js';
import { drawAircraft, drawSpeedLines } from './aircraft.js';
import { drawHud } from './hud.js';
import { createInput, readControls } from './input.js';
import { createAudio } from './audio.js';
import { updateClouds, WORLD } from './terrain.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const audio = createAudio();
const input = createInput();
const cam = makeCamera();

const game = {
  state: 'menu', // menu | flying | paused | over
  plane: newPlane(),
  run: newRun(0),
  ctl: { pitch: 0, roll: 0, throttle: 0, brakes: false },
  time: 0,
  message: '',
  messageUntil: 0,
  banner: '',
  bannerUntil: 0,
  prevPos: { x: 0, y: 0, z: 0 },
  flash: 0,
};

const menuEl = document.getElementById('menu');
const bannerEl = document.getElementById('banner');
const endEl = document.getElementById('endcard');

function showMessage(text, seconds = 2) {
  game.message = text;
  game.messageUntil = game.time + seconds;
}

function showBanner(text, seconds = 2.4) {
  game.banner = text;
  game.bannerUntil = game.time + seconds;
  bannerEl.textContent = text;
  bannerEl.classList.remove('hidden');
}

function startMission(index) {
  audio.unlock();
  audio.click();
  game.run = newRun(index);
  game.plane = newPlane();
  game.plane.fuel = game.run.mission.fuel;
  game.ctl = { pitch: 0, roll: 0, throttle: 0, brakes: false };
  game.state = 'flying';
  menuEl.classList.add('hidden');
  endEl.classList.add('hidden');
  showBanner(`${game.run.mission.name} — GO!`, 2.4);
  showMessage(game.run.mission.brief, 5);
}

function endRun(result, title, detail) {
  game.state = 'over';
  game.run.finished = true;
  game.run.result = result;
  endEl.innerHTML = `<h2>${title}</h2><p>${detail}</p>` +
    `<p class="stats">Score ${game.run.score} &middot; Rings ${game.run.ringsHit} / ${game.run.rings.length} &middot; Time ${formatTime(game.run.mission.timeLimit - game.run.timeLeft)}</p>` +
    `<button id="again">FLY AGAIN</button>`;
  endEl.classList.remove('hidden');
  document.getElementById('again').addEventListener('click', () => startMission(game.run.missionIndex));
}

function update(dt) {
  game.time += dt;
  updateClouds(dt);
  if (game.state !== 'flying') return;

  const p = game.plane;
  game.prevPos = { x: p.x, y: p.y, z: p.z };
  game.ctl = readControls(input, game.ctl);
  const event = stepFlight(p, game.ctl, dt);
  audio.setFlight(p.throttle, p.speed, !p.onGround);

  // Rings: crossing the next hoop scores.
  if (ringCrossed(game.run, game.prevPos, p)) {
    const pts = scoreRing(game.run, p.speed);
    showMessage(`RING ${game.run.ringsHit}! +${pts}`, 1.6);
    audio.ring();
    game.flash = 0.25;
  }

  // Landing: wheels down on the mission's strip, slow and level.
  if (event === 'landed') {
    const strip = game.run.mission.landAt;
    const onTarget = Math.hypot(p.x - strip.x, p.z - strip.z) < strip.length;
    if (onTarget && game.run.ringsHit === game.run.rings.length) {
      const bonus = landingBonus(game.run, p.speed);
      audio.land();
      endRun('complete', 'MISSION COMPLETE!', `Daisy is home safe. Landing bonus +${bonus}. The valley thanks you, courier.`);
      return;
    }
    if (onTarget) {
      showMessage('LANDED — but rings remain. Take off and finish the course!', 3);
    } else {
      showMessage('LANDED — wrong strip! Take off and find the right one.', 3);
    }
    audio.land();
  }
  if (event === 'bounced') {
    showMessage(`HARD LANDING! Damage ${p.damage}%`, 2.5);
    audio.crash();
  }
  if (event === 'crashed' || p.damage >= 100) {
    audio.crash();
    endRun('crashed', 'CRASHED!', `Daisy is in the meadow, wings folded. Damage ${p.damage}%. The courier shakes it off — fly again?`);
    return;
  }
  if (event === 'takeoff') showMessage('AIRBORNE!', 1.4);

  // Clock and fuel.
  game.run.timeLeft -= dt;
  if (game.run.timeLeft <= 0) {
    endRun('timeout', "TIME'S UP!", `The sun set on the valley with ${game.run.ringsHit} of ${game.run.rings.length} rings flown. Score ${game.run.score}.`);
    return;
  }
  if (p.fuel <= 0 && !p.onGround) {
    showMessage('OUT OF FUEL — GLIDING!', 2);
  }
  if (game.flash > 0) game.flash -= dt;
}

function draw() {
  const p = game.plane;
  updateCamera(cam, p, W, H);
  drawSky(ctx, cam, p, W, H);
  drawClouds(ctx, cam);
  drawTerrain(ctx, cam, p);
  drawRings(ctx, cam, game.run, game.time);
  drawSpeedLines(ctx, W, H, p.speed, game.time);
  const crashed = game.state === 'over' && game.run.result === 'crashed';
  drawAircraft(ctx, W, H, p, game.time, crashed);
  if (game.state === 'flying' || game.state === 'paused' || game.state === 'over') {
    drawHud(ctx, W, H, p, game.run, game.state, game.time < game.messageUntil ? game.message : '');
  }
  // Next-ring direction arrow: a chevron at the screen edge pointing
  // toward the hoop when it is off-screen or far away.
  if (game.state === 'flying' && game.run.nextRing < game.run.rings.length) {
    const ring = game.run.rings[game.run.nextRing];
    const sp = project(cam, ring.x, ring.y, ring.z);
    const info = checkRing(game.run, p.x, p.y, p.z);
    if (sp && (sp.x < 40 || sp.x > W - 40 || sp.y < 60 || sp.y > H - 60 || sp.d < 0)) {
      drawOffscreenArrow(ctx, W, H, sp);
    } else if (sp && info) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(info.dist)} m to RING ${info.index + 1}`, W / 2, 96);
    }
  }
  // Ring-pass flash.
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(120, 240, 255, ${game.flash * 1.2})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.state === 'paused') {
    ctx.fillStyle = 'rgba(8,20,38,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '700 34px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P to fly on', W / 2, H / 2);
  }
}

function drawOffscreenArrow(ctx, W, H, sp) {
  const cx = Math.max(60, Math.min(W - 60, sp.x));
  const cy = Math.max(110, Math.min(H - 90, sp.y));
  const ang = Math.atan2(sp.y - cy, sp.x - cx);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = '#50e6ff';
  ctx.shadowColor = '#33d5ff'; ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-12, -12); ctx.lineTo(-6, 0); ctx.lineTo(-12, 12);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  if (game.time > game.bannerUntil && !bannerEl.classList.contains('hidden')) {
    bannerEl.classList.add('hidden');
  }
  requestAnimationFrame(loop);
}

// ---- Wiring: menu buttons, keys, pause, restart. ----
document.querySelectorAll('.mission').forEach((btn) => {
  btn.addEventListener('click', () => startMission(Number(btn.dataset.mission)));
});

input.onKeyDown((key) => {
  if (key === '1' || key === '2' || key === '3') {
    if (game.state === 'menu') startMission(Number(key) - 1);
    return;
  }
  if (key === 'Enter' && game.state === 'menu') { startMission(0); return; }
  if (key === 'p' || key === 'P') {
    if (game.state === 'flying') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'flying';
    return;
  }
  if (key === 'r' || key === 'R') {
    if (game.state === 'flying' || game.state === 'over') startMission(game.run.missionIndex);
    return;
  }
  if (key === 'g' || key === 'G') {
    game.plane.gearDown = !game.plane.gearDown;
    showMessage(game.plane.gearDown ? 'GEAR DOWN' : 'GEAR UP', 1.2);
  }
  if (key === ' ') audio.unlock();
});

// Deterministic screenshot states (?shot=start|play|ring|land) and a
// test handle so the maker can drive the game from the browser console.
applyShot(game, startMission);
window.__game = game;
window.__startMission = startMission;

requestAnimationFrame(loop);
