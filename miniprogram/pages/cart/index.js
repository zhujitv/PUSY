const { getCartView, removeFromCart, syncCartBadge, updateQuantity } = require("../../utils/cart");

const FREE_SHIPPING_FEN = 19800;

Page({
  data: {
    cart: { items: [], count: 0, totalFen: 0, totalText: "¥0" },
    shippingText: "",
    progressWidth: 0
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cart = getCartView();
    const remainingFen = Math.max(0, FREE_SHIPPING_FEN - cart.totalFen);
    const shippingText = remainingFen > 0
      ? `实体商品再选 ¥${(remainingFen / 100).toFixed(0)} 即享标准快递免费`
      : "已享标准快递免费";
    const progressWidth = Math.min(100, Math.round((cart.totalFen / FREE_SHIPPING_FEN) * 100));
    this.setData({ cart, shippingText, progressWidth });
    syncCartBadge();
  },

  changeQuantity(event) {
    const { id, quantity } = event.currentTarget.dataset;
    updateQuantity(id, Number(quantity));
    this.refresh();
  },

  remove(event) {
    removeFromCart(event.currentTarget.dataset.id);
    this.refresh();
  },

  openProduct(event) {
    wx.navigateTo({ url: `/pages/product/index?id=${event.currentTarget.dataset.id}` });
  },

  browse() {
    wx.switchTab({ url: "/pages/category/index" });
  },

  checkout() {
    wx.showModal({
      title: "结算功能尚未开放",
      content: "当前为小程序第一阶段开发预览。接通统一订单接口、库存校验和微信支付后即可正式结算。",
      showCancel: false,
      confirmText: "知道了"
    });
  }
});
