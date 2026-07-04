const FX = require('../../utils/fx');
const BGM = require('../../utils/bgm');
Page({
  data: { bgmOn: false },
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
