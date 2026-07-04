const CLOUD_ENV = require('./utils/cloudenv');
const FONT_PIXELIFY = require('./utils/font-pixelify');
const FONT_GRIFFY = require('./utils/font-griffy');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    }
    this.loadFonts();
  },
  // 网页版同款可爱字体:base64 内嵌,无需网络/云存储,真机与工具都可用
  loadFonts() {
    const load = (family, b64) => {
      wx.loadFontFace({
        global: true,
        family,
        source: 'url("data:font/ttf;base64,' + b64 + '")',
        scopes: ['webview'],
        success: () => console.log('[font] loaded:', family),
        fail: (e) => console.warn('[font] load fail:', family, e)
      });
    };
    load('Pixelify Sans', FONT_PIXELIFY);
    load('Griffy', FONT_GRIFFY);
  },
  globalData: {}
});
