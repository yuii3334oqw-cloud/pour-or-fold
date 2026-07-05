/* 流量主广告封装 —— 未配置广告位 ID 或加载失败时【全部静默 no-op】,绝不抛错阻断游戏。
   状态存模块级变量(符合本项目「状态存 JS 变量、不落盘」的约定)。 */
const UNITS = require('./adunits');

/* ---------- 插屏(局间过场) ---------- */
let _inter = null;
let _interCount = 0;          // 频次计数:每 INTER_EVERY 次调用才真正弹一次
const INTER_EVERY = 3;

function _ensureInter() {
  if (_inter) return _inter;
  if (!UNITS.interstitial || !wx.createInterstitialAd) return null;
  _inter = wx.createInterstitialAd({ adUnitId: UNITS.interstitial });
  _inter.onError(function () {});   // 吞掉加载/展示错误
  return _inter;
}

// 在「一局结束→下一局」的过场调用。内部按频次节流,各处只管调。
function showInterstitial() {
  if (!UNITS.interstitial || !wx.createInterstitialAd) return;
  _interCount++;
  if (_interCount % INTER_EVERY !== 0) return;   // 未到频次,跳过
  const ad = _ensureInter();
  if (!ad) return;
  ad.show().catch(function () {});               // 未就绪时 reject,静默
}

/* ---------- 激励视频(自愿) ---------- */
let _reward = null;
let _rewardCb = null;

function _ensureReward() {
  if (_reward) return _reward;
  if (!UNITS.rewardSupport || !wx.createRewardedVideoAd) return null;
  _reward = wx.createRewardedVideoAd({ adUnitId: UNITS.rewardSupport });
  _reward.onError(function () {});
  _reward.onClose(function (res) {
    const ok = res && res.isEnded;               // 完整看完才算
    const cb = _rewardCb; _rewardCb = null;
    if (ok && cb) cb();
  });
  return _reward;
}

// 用户主动点击时调用。看完回调 onReward();未就绪则 toast 提示。
function showReward(onReward) {
  const ad = _ensureReward();
  if (!ad) { wx.showToast({ title: '广告未就绪', icon: 'none' }); return; }
  _rewardCb = onReward || null;
  ad.show().catch(function () {
    ad.load()
      .then(function () { return ad.show(); })
      .catch(function () { wx.showToast({ title: '广告未就绪', icon: 'none' }); });
  });
}

// 广告位是否已配置(供页面决定要不要显示「支持作者」入口)
function rewardEnabled() { return !!UNITS.rewardSupport; }

module.exports = { showInterstitial, showReward, rewardEnabled };
