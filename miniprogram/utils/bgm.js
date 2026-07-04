/* 8-bit 合成 BGM:WebAudio 循环音序,无音频文件(与 fx.js 同思路) */
let actx = null, dead = false, playing = false, timer = null, step = 0;

const BPM = 96;
const STEP_S = 60 / BPM / 2; // 八分音符

// Am - F - C - G 走向,16 步循环
const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98];
const LEAD = [
  440, 0, 523.25, 440, 659.25, 0, 587.33, 523.25,
  349.23, 0, 440, 349.23, 392, 440, 493.88, 392
];

function ac() {
  if (dead) return null;
  if (actx) return actx;
  try { actx = wx.createWebAudioContext ? wx.createWebAudioContext() : null; }
  catch (e) { actx = null; }
  if (!actx) dead = true;
  return actx;
}

function note(c, freq, t, dur, type, vol) {
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}

function tick() {
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.06;
  if (step % 2 === 0) note(c, BASS[(step / 2) % 8], t, STEP_S * 1.6, 'square', 0.02);
  const l = LEAD[step % 16];
  if (l) note(c, l, t, STEP_S * 0.85, 'triangle', 0.035);
  step = (step + 1) % 16;
}

function start() {
  if (playing) return;
  const c = ac(); if (!c) return;
  playing = true; step = 0;
  tick();
  timer = setInterval(tick, STEP_S * 1000);
}

function stop() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
}

function toggle() {
  if (playing) stop(); else start();
  try { wx.setStorageSync('bgmOn', playing); } catch (e) {}
  return playing;
}

function isOn() { return playing; }

module.exports = { start, stop, toggle, isOn };
