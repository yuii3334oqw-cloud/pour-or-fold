const CLOUD_ENV = require('./utils/cloudenv');
const FONT_PIXELIFY = require('./utils/font-pixelify');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    }
    this.loadFonts();
  },
  // 网页版同款像素字体:base64 内嵌,无需网络/云存储
  loadFonts() {
    wx.loadFontFace({
      global: true,
      family: 'Pixelify Sans',
      source: 'url("data:font/ttf;base64,' + FONT_PIXELIFY + '")',
      scopes: ['webview'],
      success: () => console.log('[font] loaded: Pixelify Sans'),
      fail: (e) => console.warn('[font] load fail:', e)
    });
  },
  globalData: {}
});
