const FX = require('../../utils/fx');
const BGM = require('../../utils/bgm');
Page({
  data: { bgmOn: false },
  onShareAppMessage() {
    return { title: '像素聚会牌局 · 德州/21点/点球/小姐牌,一部手机全搞定!', path: '/pages/home/home' };
  },
onShow() { this.setData({ bgmOn: BGM.isOn() }); },
  toggleBgm() {
    FX.feedback('tap');
    this.setData({ bgmOn: BGM.toggle() });
  },
  goOnline() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/online/online' }); },
  goTexas() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/texas/texas' }); },
  goBJ() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/blackjack/blackjack' }); },
  goSoccer() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/soccer/soccer' }); },
  goXJ() { FX.feedback('tap'); wx.navigateTo({ url: '/pages/xiaojie/xiaojie' }); }
});
