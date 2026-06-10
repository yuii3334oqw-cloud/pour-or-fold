/* 震动 + WebAudio 合成音效(微信内 iOS 也支持震动!) */
let actx = null, dead = false, soundOn = true;

function ac() {
  if (dead) return null;
  if (actx) return actx;
  try { actx = wx.createWebAudioContext ? wx.createWebAudioContext() : null; }
  catch (e) { actx = null; }
  if (!actx) dead = true;
  return actx;
}
function blip(freq, dur, type, vol, slideTo) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  } catch (e) {}
}
function pour(dur, vol) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(1300, t + dur * 0.6);
    f.frequency.linearRampToValueAtTime(400, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.03);
  } catch (e) {}
}
function sfx(name) {
  if (!soundOn) return;
  switch (name) {
    case 'tap': blip(640, 0.05, 'triangle', 0.05); break;
    case 'peek': blip(900, 0.06, 'sine', 0.05); break;
    case 'fold': blip(230, 0.2, 'sawtooth', 0.06, 90); break;
    case 'pour': pour(0.45, 0.12); break;
    case 'deal': blip(1500, 0.05, 'square', 0.03); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sine', 0.07), i * 95)); break;
  }
}
function buzz(name) {
  try {
    if (name === 'win') wx.vibrateLong();
    else wx.vibrateShort({ type: (name === 'tap' || name === 'peek') ? 'light' : 'medium' });
  } catch (e) {}
}
function feedback(name) { sfx(name); buzz(name); }
function setSound(on) { soundOn = on; }

module.exports = { sfx, buzz, feedback, setSound };
