const NET = require('../../utils/net');
const FX = require('../../utils/fx');

Page({
  data: { nick: '', game: 'texas', code: '', busy: false },
  onLoad(q) {
    let nk = NET.nick();
    if (!nk) nk = '玩家' + Math.floor(100 + Math.random() * 900);
    this.setData({ nick: nk });
    if (q && q.code) this.setData({ code: String(q.code).replace(/\D/g, '').slice(0, 4) });
  },
  onNick(e) { this.setData({ nick: e.detail.value }); },
  onCode(e) { this.setData({ code: e.detail.value.replace(/\D/g, '').slice(0, 4) }); },
  pick(e) { FX.feedback('tap'); this.setData({ game: e.currentTarget.dataset.g }); },
  finalNick() { const n = (this.data.nick || '').trim() || '玩家'; NET.saveNick(n); return n; },
  async create() {
    if (this.data.busy) return;
    this.setData({ busy: true }); FX.feedback('deal');
    const r = await NET.call('create', { game: this.data.game, name: this.finalNick() });
    this.setData({ busy: false });
    if (!r.ok) { wx.showToast({ title: r.err || '创建失败', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/room/room?roomId=' + r.roomId });
  },
  async join() {
    if (this.data.busy) return;
    if (this.data.code.length !== 4) { wx.showToast({ title: '请输入 4 位房号', icon: 'none' }); return; }
    this.setData({ busy: true }); FX.feedback('tap');
    const r = await NET.call('join', { roomId: this.data.code, name: this.finalNick() });
    this.setData({ busy: false });
    if (!r.ok) { wx.showToast({ title: r.err || '加入失败', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/room/room?roomId=' + this.data.code });
  }
});
