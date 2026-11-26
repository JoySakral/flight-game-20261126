// aircraft.js — draws "Daisy", the little yellow courier plane, in the
// chase view: fuselage, wings, tail, canopy and a spinning prop, banked
// with the roll. Pure canvas paths, no image assets.
export function drawAircraft(ctx, W, H, plane, time, crashed) {
  const cx = W / 2, cy = H * 0.62;
  const scale = 1 + plane.speed / 900; // she looks a touch bigger, faster
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.9);
  ctx.scale(scale, scale);
  if (crashed) ctx.rotate(0.5);

  // Shadow under the plane on the ground far below is skipped; instead a
  // soft drop shadow grounds her on screen.
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;

  // Main wing (swept slightly back, cream with red tips).
  ctx.fillStyle = '#f7e8c8';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-34, -8); ctx.lineTo(34, -8); ctx.lineTo(150, 6);
  ctx.lineTo(138, 20); ctx.lineTo(-138, 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-122, 4); ctx.lineTo(-118, 18); ctx.lineTo(-138, 20); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(150, 6); ctx.lineTo(122, 4); ctx.lineTo(118, 18); ctx.lineTo(138, 20); ctx.closePath(); ctx.fill();

  // Tailplane.
  ctx.fillStyle = '#f7e8c8';
  ctx.beginPath();
  ctx.moveTo(-52, -52); ctx.lineTo(-16, -58); ctx.lineTo(16, -58); ctx.lineTo(52, -52);
  ctx.lineTo(46, -44); ctx.lineTo(-46, -44); ctx.closePath(); ctx.fill();

  // Fuselage: a warm yellow courier body, nose at the top of the screen.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#e8a91c'); body.addColorStop(0.5, '#ffd76a'); body.addColorStop(1, '#e8a91c');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.quadraticCurveTo(20, -96, 17, -40);
  ctx.quadraticCurveTo(15, 6, 8, 42);
  ctx.quadraticCurveTo(4, 62, 0, 62);
  ctx.quadraticCurveTo(-4, 62, -8, 42);
  ctx.quadraticCurveTo(-15, 6, -17, -40);
  ctx.quadraticCurveTo(-20, -96, 0, -118);
  ctx.closePath(); ctx.fill();

  // Tail fin.
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.moveTo(0, -62); ctx.lineTo(13, -96); ctx.lineTo(6, -52); ctx.closePath(); ctx.fill();

  // Canopy: the pilot's window, lit from the sun.
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.ellipse(0, -58, 9, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3, -64, 3, 8, 0.2, 0, Math.PI * 2); ctx.fill();

  // Registration stripe and the courier's daisy mark.
  ctx.fillStyle = '#2b6cb0';
  ctx.fillRect(-14, 8, 28, 5);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 30, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(0, 30, 3.5, 0, Math.PI * 2); ctx.fill();

  // Spinning prop disc at the nose.
  const spin = (time * 30) % (Math.PI * 2);
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(0, -116);
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(40,40,40,0.55)';
  ctx.fillRect(-3, -34, 6, 68);
  ctx.rotate(Math.PI / 2);
  ctx.fillRect(-3, -34, 6, 68);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(0, -116, 30, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.arc(0, -116, 7, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// Speed streaks that rush outward from the centre of the screen when
// she is really moving — the rush of the air past the canopy.
export function drawSpeedLines(ctx, W, H, speed, time) {
  if (speed < 120) return;
  const alpha = Math.min(0.45, (speed - 120) / 260);
  const cx = W / 2, cy = H / 2;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const ang = i * 0.53 + 0.4;
    const r0 = 240 + ((time * 520 + i * 97) % 420);
    const len = 26 + (speed - 120) * 0.22;
    const x1 = cx + Math.cos(ang) * r0, y1 = cy + Math.sin(ang) * r0;
    const x2 = cx + Math.cos(ang) * (r0 + len), y2 = cy + Math.sin(ang) * (r0 + len);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}
