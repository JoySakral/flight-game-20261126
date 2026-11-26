// audio.js — all sound is synthesized with WebAudio: an engine hum
// whose pitch follows the throttle, wind that rises with speed, a
// chime for rings, a thud for landings and a crunch for crashes.
// No audio files, no network.
export function createAudio() {
  let ctx = null, engine = null, engineGain = null, wind = null, windGain = null;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: two detuned saws through a low-pass filter.
      engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 55;
      const engine2 = ctx.createOscillator(); engine2.type = 'sawtooth'; engine2.frequency.value = 58;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engine.connect(filter); engine2.connect(filter);
      filter.connect(engineGain); engineGain.connect(master);
      engine.start(); engine2.start();
      // Wind: looped filtered noise.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
      const windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 700;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
      wind.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when);
    o.stop(ctx.currentTime + when + dur + 0.05);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    mute() { if (ctx) ctx.suspend(); },
    unmute() { if (ctx) ctx.resume(); },
    setFlight(throttle, speed, flying) {
      if (!ctx || !engineGain) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(flying ? 0.05 + throttle * 0.09 : throttle * 0.05, t, 0.1);
      engine.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.15, t, 0.1);
      windGain.gain.setTargetAtTime(flying ? Math.min(0.16, speed / 1200) : 0, t, 0.15);
    },
    ring() { tone(880, 0.18, 'sine', 0.25); tone(1318, 0.3, 'sine', 0.2, 0.09); },
    land() { tone(180, 0.25, 'triangle', 0.3); tone(90, 0.35, 'sine', 0.3, 0.05); },
    crash() {
      tone(70, 0.5, 'sawtooth', 0.35);
      tone(45, 0.7, 'square', 0.25, 0.08);
    },
    click() { tone(660, 0.08, 'sine', 0.15); },
  };
}
