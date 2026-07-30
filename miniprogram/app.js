const { syncCartBadge } = require("./utils/cart");
const { syncNotificationBadge } = require("./utils/notifications");
const config = require("./config/index");

App({
  globalData: {
    apiBaseUrl: config.apiBaseUrl,
    previewMode: config.previewMode,
  },

  onLaunch() {
    syncCartBadge();
    syncNotificationBadge().catch(() => undefined);
  },
});
