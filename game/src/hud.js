// hud.js — the glass: airspeed, altitude, heading tape, fuel, throttle,
// score, timer, ring counter and the artificial horizon. All canvas,
// all lit like flown instruments.
import { headingDegrees, altitudeAboveGround } from './flight.js';
import { formatTime } from './missions.js';

const FONT = 'Arial, sans-serif';

function tape(ctx, x, y, w, h, value, step, unit, format) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.5)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const mid = y + h / 2;
  const pxPerUnit = h / (step * 6);
  const base = Math.floor(value / step) * step;
  ctx.fillStyle = '#9fd0ff';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  for (let v = base - step * 3; v <= base + step * 3; v += step) {
    const yy = mid - (v - value) * pxPerUnit;
    ctx.fillRect(x + w - 14, yy, 14, 1);
    ctx.fillText(format(v), x + 5, yy + 4);
  }
  // Centre readout.
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(x, mid - 11, w, 22);
  ctx.fillStyle = '#0b1524';
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(format(value) + unit, x + w / 2, mid + 5);
  ctx.restore();
}

export function drawHud(ctx, W, H, plane, run, state, message) {
  const alt = altitudeAboveGround(plane);
  const hdg = headingDegrees(plane);

  // Left tape: airspeed (knots). Right tape: altitude (feet-ish metres).
  tape(ctx, 16, H * 0.28, 74, 220, plane.speed, 20, ' kt', (v) => String(Math.round(v)));
  tape(ctx, W - 90, H * 0.28, 74, 220, alt, 50, ' m', (v) => String(Math.round(v)));

  // Top centre: compass tape.
  drawCompass(ctx, W, H, hdg);

  // Top left: score, rings, timer.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
  roundRect(ctx, 16, 14, 250, 74, 10); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`SCORE ${run.score}`, 28, 42);
  ctx.fillStyle = '#eaf2ff';
  ctx.font = `15px ${FONT}`;
  ctx.fillText(`Rings ${run.ringsHit} / ${run.rings.length}`, 28, 64);
  ctx.fillStyle = run.timeLeft < 30 ? '#ff7a6a' : '#9fd0ff';
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(`⏱ ${formatTime(run.timeLeft)}`, 170, 64);

  // Top right: mission name + fuel gauge.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
  roundRect(ctx, W - 266, 14, 250, 74, 10); ctx.fill();
  ctx.fillStyle = '#eaf2ff';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(run.mission.name.toUpperCase(), W - 28, 40);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#bcd8ff';
  ctx.fillText(run.mission.id === 'canyon-courier' ? 'LOW & FAST — WATCH FUEL' : 'FLY THE RINGS, LAND HER HOME', W - 28, 60);
  drawFuel(ctx, W - 246, 70, 150, plane.fuel);

  // Bottom left: throttle bar.
  drawThrottle(ctx, 16, H - 66, plane.throttle, plane.gearDown);

  // Bottom right: artificial horizon + vertical speed.
  drawHorizon(ctx, W - 116, H - 116, 84, plane);
  ctx.fillStyle = '#eaf2ff';
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  const vs = plane.verticalSpeed;
  ctx.fillText(`V/S ${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, W - 74, H - 16);

  // Centre message (ring scored, warnings).
  if (message) {
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,20,38,0.6)';
    const tw = ctx.measureText(message).width;
    roundRect(ctx, W / 2 - tw / 2 - 16, H * 0.2 - 24, tw + 32, 44, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(message, W / 2, H * 0.2 + 6);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCompass(ctx, W, H, hdg) {
  const w = 340, h = 34, x = W / 2 - w / 2, y = 14;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.5)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const pxPerDeg = w / 120;
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  for (let d = Math.floor((hdg - 60) / 10) * 10; d <= hdg + 60; d += 10) {
    const dd = ((d % 360) + 360) % 360;
    const xx = W / 2 + (dd - hdg) * pxPerDeg;
    // Wrap: the tape is short, so only draw ticks near the centre.
    if (Math.abs(xx - W / 2) > w / 2) continue;
    ctx.fillStyle = '#9fd0ff';
    ctx.fillRect(xx, y + h - 8, 1, 8);
    if (dd % 30 === 0) {
      ctx.fillStyle = '#fff';
      ctx.fillText(labels[dd] ?? String(dd).padStart(3, '0'), xx, y + 15);
    }
  }
  // Centre caret + digital heading, drawn after the clip is released
  // so the label below the tape is visible.
  ctx.restore();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.moveTo(W / 2 - 6, y + 2); ctx.lineTo(W / 2 + 6, y + 2); ctx.lineTo(W / 2, y + 10); ctx.closePath(); ctx.fill();
  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${String(Math.round(hdg)).padStart(3, '0')}°`, W / 2, y + h + 16);
}

function drawFuel(ctx, x, y, w, fuel) {
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, x, y, w, 10, 5); ctx.fill();
  const col = fuel > 30 ? '#7ed67e' : fuel > 12 ? '#ffd76a' : '#ff7a6a';
  ctx.fillStyle = col;
  roundRect(ctx, x, y, Math.max(6, w * (fuel / 100)), 10, 5); ctx.fill();
  // Label sits to the right of the bar so it never overlaps the panel text.
  ctx.fillStyle = '#eaf2ff';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`FUEL ${Math.round(fuel)}%`, x + w + 8, y + 10);
}

function drawThrottle(ctx, x, y, throttle, gearDown) {
  ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
  roundRect(ctx, x, y, 190, 52, 10); ctx.fill();
  ctx.fillStyle = '#9fd0ff';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('THR', x + 10, y + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, x + 48, y + 8, 130, 12, 6); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, x + 48, y + 8, Math.max(4, 130 * throttle), 12, 6); ctx.fill();
  ctx.fillStyle = '#eaf2ff';
  ctx.fillText(gearDown ? 'GEAR ▼ DOWN' : 'GEAR ▲ UP', x + 10, y + 40);
}

// Artificial horizon: a little round gauge that rolls and pitches.
function drawHorizon(ctx, cx, cy, r, plane) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll);
  ctx.translate(0, plane.pitch * r * 1.4);
  ctx.fillStyle = '#5aa9e6';
  ctx.fillRect(-r, -r * 2, r * 2, r * 2);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-r, 0, r * 2, r * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-r, -1.5, r * 2, 3);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx - r * 0.15, cy);
  ctx.moveTo(cx + r * 0.15, cy); ctx.lineTo(cx + r * 0.55, cy);
  ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(140,200,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
