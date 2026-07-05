const FX = require('../../utils/fx');
const BGM = require('../../utils/bgm');
const UNITS = require('../../utils/adunits');
const ADS = require('../../utils/ads');
Page({
  data: { bgmOn: false, bannerHome: UNITS.bannerHome, rewardOn: ADS.rewardEnabled() },
  onSupport() { FX.feedback('tap'); ADS.showReward(function () { wx.showToast({ title: '谢谢支持 ❤', icon: 'none' }); }); },
  onShareAppMessage() {
    return { title: '像素聚会助手 · 一部手机,聚会小游戏全搞定!', path: '/pages/home/home' };
  },
  onShow() { this.setData({ bgmOn: BGM.isOn() }); },
  toggleBgm() { FX.feedback('tap'); this.setData({ bgmOn: BGM.toggle() }); },
  goOnline() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/online/online' }); },
  goTexas()  { FX.feedback('tap'); wx.navigateTo({ url: '/pages/texas/texas' }); },
  goBJ()     { FX.feedback('tap'); wx.navigateTo({ url: '/pages/blackjack/blackjack' }); },
  goDice()   { FX.feedback('tap'); wx.navigateTo({ url: '/pages/dice/dice' }); },
  goSpy()    { FX.feedback('tap'); wx.navigateTo({ url: '/pages/undercover/undercover' }); },
  goBomb()   { FX.feedback('tap'); wx.navigateTo({ url: '/pages/bomb/bomb' }); },
  goSoccer() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/soccer/soccer' }); },
  goXJ()     { FX.feedback('tap'); wx.navigateTo({ url: '/pages/xiaojie/xiaojie' }); },
  goTruth()  { FX.feedback('tap'); wx.navigateTo({ url: '/pages/truth/truth' }); }
});
