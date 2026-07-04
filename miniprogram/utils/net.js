/* 调用云函数 room 的封装,永远 resolve({ok,...}) */
function call(action, data) {
  return new Promise((resolve) => {
    if (!wx.cloud) { resolve({ ok: false, err: '未开通云开发' }); return; }
    wx.cloud.callFunction({ name: 'room', data: Object.assign({ action }, data || {}) })
    .then(res => { const r = res.result || { ok: false, err: '空结果' }; if (!r.ok && r.err) { try { wx.showToast({ title: r.err, icon: 'none' }); } catch (e) {} } resolve(r); })
      .catch(e => resolve({ ok: false, err: (e && e.errMsg) || '网络错误' }));
  });
}
function nick() {
  return wx.getStorageSync('pof_nick') || '';
}
function saveNick(n) { try { wx.setStorageSync('pof_nick', n); } catch (e) {} }
module.exports = { call, nick, saveNick };
