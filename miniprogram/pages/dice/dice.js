const FX = require('../../utils/fx');
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const ROWS = { 3: [3], 5: [2, 3], 6: [3, 3] };
const ADJ = { 1: [2, 3], 2: [4, 1], 3: [1, 5], 4: [6, 2], 5: [3, 6], 6: [2, 4] };

Page({
  data: { n: 5, rolled: false, rolling: false, opened: false },

  onLoad() { this.dice = []; this.anim = { mode: 'idle', start: 0 }; },
  onReady() { this.initCanvas(); this.startShake(); },
  onShow() { this.startShake(); },
  onHide() { this.stopShake(); },
  onUnload() { this.stopShake(); this._dead = true; },

  initCanvas() {
    wx.createSelectorQuery().select('#dc').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const node = res[0].node;
      const dpr = (wx.getSystemInfoSync() || {}).pixelRatio || 2;
      this.W = res[0].width; this.H = res[0].height;
      node.width = this.W * dpr; node.height = this.H * dpr;
      this.cv = node; this.ctx = node.getContext('2d');
      this.ctx.scale(dpr, dpr);
      this.u = Math.max(2, Math.min(this.W / 92, this.H / 150));
      const loop = () => { if (this._dead) return; this.draw(); this.cv.requestAnimationFrame(loop); };
      this.cv.requestAnimationFrame(loop);
    });
  },

  poly(p) { const c = this.ctx; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); c.fill(); },
  polyS(p) { const c = this.ctx; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); c.stroke(); },
  cham(x, y, w, h, ch, color) {
    const c = this.ctx; c.fillStyle = color; c.beginPath();
    c.moveTo(x + ch, y); c.lineTo(x + w - ch, y); c.lineTo(x + w, y + ch);
    c.lineTo(x + w, y + h - ch); c.lineTo(x + w - ch, y + h); c.lineTo(x + ch, y + h);
    c.lineTo(x, y + h - ch); c.lineTo(x, y + ch); c.closePath(); c.fill();
  },

  draw() {
    const c = this.ctx; if (!c) return;
    const W = this.W, H = this.H, u = this.u, now = Date.now();
    const cx = Math.round(W / 2), ty = Math.round(H - 24 * u);
    c.clearRect(0, 0, W, H);
    const A = this.anim, LIFT = 78 * u;
    let lift = 0, sx = 0, sy = 0, rot = 0, squash = 1;
    if (A.mode === 'shake') {
      const e = now - A.start;
      sx = Math.sin(e / 26) * 3 * u; sy = Math.sin(e / 21) * 1.5 * u; rot = Math.sin(e / 33) * 0.05;
    } else if (A.mode === 'lift') {
      const p = Math.min(1, (now - A.start) / 300); const q = 1 - Math.pow(1 - p, 3);
      lift = LIFT * (q + 0.05 * Math.sin(p * Math.PI));
      if (p >= 1) { A.mode = 'open'; A.start = now; }
    } else if (A.mode === 'open') {
      lift = LIFT + Math.sin(now / 520) * 1.4 * u;
    } else if (A.mode === 'drop') {
      const p = Math.min(1, (now - A.start) / 200); lift = LIFT * (1 - p * p);
      if (p >= 1) { A.mode = 'land'; A.start = now; }
    } else if (A.mode === 'land') {
      const p = Math.min(1, (now - A.start) / 130); squash = 1 - 0.08 * Math.sin(p * Math.PI);
      if (p >= 1) A.mode = 'idle';
    } else { sy = Math.sin(now / 640) * 1.3 * u; }
    this.drawTray(cx, ty);
    if (this.dice.length && A.mode !== 'shake') this.drawDice(cx, ty);
    this.drawCup(cx, ty, lift, sx, sy, rot, squash, now);
  },

  drawTray(cx, ty) {
    const c = this.ctx, u = this.u, w = 82 * u, h = 15 * u, x = cx - w / 2;
    this.cham(x - 2 * u, ty - 3 * u, w + 4 * u, h + 5 * u, 7 * u, '#05080c');
    this.cham(x, ty - u, w, h, 6 * u, '#222c37');
    this.cham(x + 3 * u, ty - u, w - 6 * u, 4 * u, 2 * u, '#38454f');
    c.fillStyle = 'rgba(0,0,0,0.5)'; this.cham(x + 5 * u, ty + 5 * u, w - 10 * u, 5 * u, 2 * u, 'rgba(0,0,0,0.45)');
  },

  drawDice(cx, ty) {
    const u = this.u, R = 8 * u, SP = 2 * R + 5 * u;
    const rows = ROWS[this.data.n] || [2, 3];
    let idx = 0;
    for (let r = 0; r < rows.length; r++) {
      const len = rows[r];
      const rowW = (len - 1) * SP;
      const ay = ty - 1 * u - (rows.length - 1 - r) * (R * 0.82);
      for (let k = 0; k < len; k++) {
        const d = this.dice[idx++]; if (!d) return;
        this.drawIsoDie(cx - rowW / 2 + k * SP, ay, R, d.v);
      }
    }
  },

  facePips(o, ex, ey, val) {
    const c = this.ctx, u = this.u, on = PIPS[val], cs = [0.26, 0.5, 0.74];
    const col = (val === 1 || val === 4) ? '#c0392b' : '#16110b', ps = u * 1.35;
    for (let i = 0; i < 9; i++) {
      if (on.indexOf(i) < 0) continue;
      const gx = cs[i % 3], gy = cs[Math.floor(i / 3)];
      const px = o[0] + gx * ex[0] + gy * ey[0], py = o[1] + gx * ex[1] + gy * ey[1];
      c.fillStyle = col; c.beginPath();
      c.moveTo(px, py - ps); c.lineTo(px + ps, py); c.lineTo(px, py + ps); c.lineTo(px - ps, py); c.closePath(); c.fill();
    }
  },

  drawIsoDie(ax, ay, R, val) {
    const c = this.ctx, u = this.u, hh = R / 2, SH = R * 0.62;
    const N = [ax, ay - hh], E = [ax + R, ay], S = [ax, ay + hh], Wv = [ax - R, ay];
    c.fillStyle = 'rgba(0,0,0,0.30)';
    this.poly([[ax - R * 0.9, ay + SH + 2 * u], [ax, ay + SH + 2 * u + hh * 0.9], [ax + R * 0.9, ay + SH + 2 * u], [ax, ay + SH + 2 * u - hh * 0.9]]);
    c.fillStyle = '#cdc4aa'; this.poly([Wv, S, [S[0], S[1] + SH], [Wv[0], Wv[1] + SH]]);
    c.fillStyle = '#aca388'; this.poly([S, E, [E[0], E[1] + SH], [S[0], S[1] + SH]]);
    c.fillStyle = '#f6efdb'; this.poly([N, E, S, Wv]);
    c.fillStyle = '#fffdf4';
    this.poly([N, [ax + R * 0.55, ay - hh * 0.45], [ax, ay - hh * 0.05], [ax - R * 0.55, ay - hh * 0.45]]);
    const lv = ADJ[val][0], rv = ADJ[val][1];
    this.facePips(N, [E[0] - N[0], E[1] - N[1]], [Wv[0] - N[0], Wv[1] - N[1]], val);
    this.facePips(Wv, [S[0] - Wv[0], S[1] - Wv[1]], [0, SH], lv);
    this.facePips(S, [E[0] - S[0], E[1] - S[1]], [0, SH], rv);
    c.strokeStyle = '#16110b'; c.lineWidth = Math.max(1.4, u * 0.7); c.lineJoin = 'round';
    this.polyS([N, E, S, Wv]);
    this.polyS([Wv, S, [S[0], S[1] + SH], [Wv[0], Wv[1] + SH]]);
    this.polyS([S, E, [E[0], E[1] + SH], [S[0], S[1] + SH]]);
    c.fillStyle = '#ffffff'; c.fillRect(ax - R * 0.34, ay - hh * 0.42, u * 1.2, u * 1.2);
  },

  drawCup(cx, ty, lift, sx, sy, rot, squash, now) {
    const c = this.ctx, u = this.u;
    const shw = (48 - 18 * (lift / (78 * u))) * u;
    c.fillStyle = 'rgba(0,0,0,0.30)';
    this.cham(cx - shw / 2, ty - 2 * u, shw, 3.5 * u, 1.5 * u, 'rgba(0,0,0,0.30)');
    c.save();
    c.translate(cx + sx, ty + sy - lift);
    if (rot) c.rotate(rot);
    c.scale(1, squash);
    const CW = 60 * u, CH = 62 * u, top = -CH;
    const bands = [[0, 0.2, '#f0c25a'], [0.2, 0.46, '#e0ad4a'], [0.46, 0.74, '#c1892f'], [0.74, 1.01, '#9c6c22']];
    const Rr = 28 * u, step = Math.max(2, Math.round(u));
    for (let yy = 0; yy < CH; yy += step) {
      let hw = CW / 2;
      if (yy < Rr) { const t = (Rr - yy) / Rr; hw = (CW / 2) * Math.sqrt(Math.max(0, 1 - t * t)); }
      c.fillStyle = '#2a1c0a'; c.fillRect(-hw - 1.5 * u, top + yy, hw * 2 + 3 * u, Math.min(step, CH - yy) + 1);
    }
    for (let yy = 0; yy < CH; yy += step) {
      let hw = CW / 2;
      if (yy < Rr) { const t = (Rr - yy) / Rr; hw = (CW / 2) * Math.sqrt(Math.max(0, 1 - t * t)); }
      const f = yy / CH; let col = '#9c6c22';
      for (let b = 0; b < bands.length; b++) { if (f >= bands[b][0] && f < bands[b][1]) { col = bands[b][2]; break; } }
      c.fillStyle = col; c.fillRect(-hw, top + yy, hw * 2, Math.min(step, CH - yy) + 1);
    }
    this.cham(-CW / 2 - 2 * u, -8 * u, CW + 4 * u, 8 * u, 2 * u, '#2a1c0a');
    this.cham(-CW / 2 - 0.5 * u, -6.5 * u, CW + u, 4.5 * u, 1.5 * u, '#8a5e1d');
    this.cham(-CW / 2 + 8 * u, top + 10 * u, 4.5 * u, 16 * u, 2 * u, 'rgba(255,255,255,0.42)');
    const dy0 = top + CH * 0.44, dw = [1, 3, 5, 3, 1];
    c.fillStyle = '#6f4f16';
    for (let i = 0; i < 5; i++) c.fillRect(-dw[i] * u / 2, dy0 + (i - 2) * u, dw[i] * u, u);
    const tt = (now % 3200) / 3200;
    if (tt < 0.06) {
      c.fillStyle = '#fff7df';
      c.fillRect(CW / 2 - 13 * u, top + 7 * u, 1.5 * u, 4.5 * u);
      c.fillRect(CW / 2 - 14.5 * u, top + 8.5 * u, 4.5 * u, 1.5 * u);
    }
    c.restore();
  },

  roll() {
    if (this.data.rolling) return;
    FX.feedback('pour');
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    this.anim = { mode: 'shake', start: Date.now() };
    this.setData({ rolling: true, opened: false });
    setTimeout(() => {
      const dice = [];
      for (let i = 0; i < this.data.n; i++) { const v = 1 + Math.floor(Math.random() * 6); dice.push({ v, red: (v === 1 || v === 4) }); }
      this.dice = dice;
      this.anim = { mode: 'land', start: Date.now() };
      try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
      FX.feedback('deal');
      this.setData({ rolling: false, rolled: true, opened: false });
    }, 900);
  },
  toggle() {
    if (!this.dice.length || this.data.rolling) return;
    const opening = !this.data.opened;
    FX.feedback(opening ? 'peek' : 'fold');
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    this.anim = { mode: opening ? 'lift' : 'drop', start: Date.now() };
    this.setData({ opened: opening });
  },
  tapRoll() { this.roll(); },
  setN(e) {
    const n = Number(e.currentTarget.dataset.n);
    if (n === this.data.n || this.data.rolling) return;
    FX.feedback('tap'); this.dice = []; this.anim = { mode: 'idle', start: 0 };
    this.setData({ n, rolled: false, opened: false });
  },
  startShake() {
    if (this._on) return; this._on = true; this._last = 0;
    try {
      wx.startAccelerometer({ interval: 'game' });
      this._cb = (e) => {
        const m = Math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z); const now = Date.now();
        if (m > 2.4 && !this.data.rolling && now - this._last > 1500) { this._last = now; this.roll(); }
      };
      wx.onAccelerometerChange(this._cb);
    } catch (err) {}
  },
  stopShake() { this._on = false; try { if (this._cb) wx.offAccelerometerChange(this._cb); wx.stopAccelerometer(); } catch (e) {} }
});
