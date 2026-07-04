const CLOUD_ENV = require('./utils/cloudenv');
const FONT_PIXELIFY = require('./utils/font-pixelify');
const FONT_PIXELCN = require('./utils/font-pixelcn');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    }
    this.loadFonts();
  },
  // 像素字体:Pixelify Sans(英数) + 缝合怪 Fusion Pixel(中文,已裁剪子集),base64 内嵌
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
    load('Fusion Pixel', FONT_PIXELCN);
  },
  globalData: {}
});
