const { syncCartBadge } = require("./utils/cart");

App({
  globalData: {
    apiBaseUrl: "",
    previewMode: true,
  },

  onLaunch() {
    syncCartBadge();
  },
});
