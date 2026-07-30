const { getCartView, removeFromCart, syncCartBadge, updateQuantity } = require("../../utils/cart");
const { refreshCatalog } = require("../../utils/catalog");

const FREE_SHIPPING_FEN = 60000;

Page({
  data: {
    cart: { items: [], count: 0, totalFen: 0, totalText: "¥0" },
    shippingText: "",
    progressWidth: 0
  },

  onShow() {
    this.refresh();
    refreshCatalog().then(() => this.refresh());
  },

  refresh() {
    const cart = getCartView();
    const remainingFen = Math.max(0, FREE_SHIPPING_FEN - cart.totalFen);
    const shippingText = remainingFen > 0
      ? `再选 ¥${(remainingFen / 100).toFixed(0)} 即享免费配送`
      : "已享免费配送";
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
    if (!this.data.cart.items.length) return;
    wx.navigateTo({ url: "/pages/checkout/index" });
  }
});
