const CLOUD_ENV = require('./utils/cloudenv');
App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    }
  },
  globalData: {}
});
