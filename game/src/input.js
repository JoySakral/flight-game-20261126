// input.js — keyboard + mouse steering. The stick is the arrow keys;
// W/S work the throttle; the mouse steers by dragging sideways.
// Every frame main.js reads `readControls()` for a fresh control vector.
export function createInput() {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, steer: 0 };
  let onKey = null;
  let onClick = null;

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(keyName(e));
    if (onKey) onKey(keyName(e), e);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousedown', (e) => { mouse.down = true; mouse.x = e.clientX; });
  window.addEventListener('mouseup', () => { mouse.down = false; mouse.steer = 0; });
  window.addEventListener('mousemove', (e) => {
    if (!mouse.down) return;
    mouse.steer = Math.max(-1, Math.min(1, (e.clientX - mouse.x) / 160));
  });
  // Mouse wheel nudges the throttle too, for pilots who fly one-handed.
  window.addEventListener('wheel', (e) => {
    mouse.wheel = (mouse.wheel || 0) + (e.deltaY < 0 ? 0.06 : -0.06);
  }, { passive: true });
  window.addEventListener('click', (e) => { if (onClick) onClick(e); });

  return {
    keys,
    mouse,
    onKeyDown(fn) { onKey = fn; },
    onClick(fn) { onClick = fn; },
    pressed(name) { return keys.has(name); },
  };
}

// Build the per-frame control vector from the current input state.
// `prev` keeps the throttle persistent (it stays where you leave it).
export function readControls(input, prev) {
  const ctl = { ...prev };
  // Pitch: ArrowUp noses down (stick forward), ArrowDown pulls up.
  let pitch = 0;
  if (input.pressed('ArrowUp')) pitch -= 1;
  if (input.pressed('ArrowDown')) pitch += 1;
  // Roll: arrows bank the wings; mouse drag steers too.
  let roll = 0;
  if (input.pressed('ArrowLeft')) roll -= 1;
  if (input.pressed('ArrowRight')) roll += 1;
  roll = Math.max(-1, Math.min(1, roll + input.mouse.steer));
  // Throttle: W/S nudge it up and down; it holds between presses.
  if (input.pressed('w')) ctl.throttle = Math.min(1, ctl.throttle + 0.9 * 0.016);
  if (input.pressed('s')) ctl.throttle = Math.max(0, ctl.throttle - 0.9 * 0.016);
  if (input.mouse.wheel) {
    ctl.throttle = Math.max(0, Math.min(1, ctl.throttle + input.mouse.wheel));
    input.mouse.wheel = 0;
  }
  ctl.pitch = pitch;
  ctl.roll = roll;
  ctl.brakes = input.pressed('b');
  return ctl;
}
