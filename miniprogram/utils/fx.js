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
function blip(freq, dur, type, vol, slideTo, delay) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
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
// 带通噪声扫频:空气划过/倒酒/洗牌的质感
 function swish(dur, vol, f0, f1, delay) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.linearRampToValueAtTime(f1, t + dur * 0.6);
    f.frequency.linearRampToValueAtTime(Math.max(120, f0 * 0.8), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.03);
  } catch (e) {}
}
function sfx(name) {
  if (!soundOn) return;
  switch (name) {
    case 'tap':   blip(620, 0.04, 'triangle', 0.05); blip(930, 0.05, 'triangle', 0.04, null, 0.045); break;
    case 'peek':  swish(0.07, 0.06, 1400, 500); blip(760, 0.08, 'sine', 0.05, 1300, 0.03); break;
    case 'fold':  blip(230, 0.2, 'sawtooth', 0.06, 90); swish(0.16, 0.05, 900, 260, 0.02); break;
    case 'pour':  swish(0.45, 0.12, 500, 1300); break;
    case 'deal':  swish(0.09, 0.09, 1800, 600);
                  blip(1500, 0.04, 'square', 0.03);
                  blip(1200, 0.04, 'square', 0.03, null, 0.055);
                  blip(1700, 0.05, 'square', 0.035, null, 0.11); break;
    case 'chip':  blip(2100, 0.03, 'square', 0.045); blip(1400, 0.04, 'square', 0.04, null, 0.05); break;
    case 'win':   [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 0.22, 'sine', 0.07, null, i * 0.09));
                  swish(0.5, 0.04, 800, 2400, 0.1); break;
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
