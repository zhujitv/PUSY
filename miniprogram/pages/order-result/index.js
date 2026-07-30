const { findLocalOrder } = require("../../utils/orders");

Page({
  data: { order: null },
  onLoad(options) { this.setData({ order: findLocalOrder(decodeURIComponent(options.id || "")) }); },
  browse() { wx.switchTab({ url: "/pages/category/index" }); },
  openOrders() { wx.redirectTo({ url: "/pages/orders/index" }); },
});
