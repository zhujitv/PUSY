const { findProduct, products } = require("../../data/products");
const { addToCart, syncCartBadge } = require("../../utils/cart");

Page({
  data: {
    product: findProduct(),
    quantity: 1,
    related: []
  },

  onLoad(options) {
    const product = findProduct(options.id);
    const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);
    this.setData({ product, related });
    wx.setNavigationBarTitle({ title: product.name });
  },

  onShow() {
    syncCartBadge();
  },

  changeQuantity(event) {
    const delta = Number(event.currentTarget.dataset.delta || 0);
    this.setData({ quantity: Math.max(1, Math.min(20, this.data.quantity + delta)) });
  },

  add() {
    addToCart(this.data.product.id, this.data.quantity);
    wx.showToast({ title: "已加入购物袋", icon: "success" });
  },

  buyNow() {
    addToCart(this.data.product.id, this.data.quantity);
    wx.switchTab({ url: "/pages/cart/index" });
  },

  openRelated(event) {
    wx.redirectTo({ url: `/pages/product/index?id=${event.currentTarget.dataset.id}` });
  },

  shareProduct() {
    wx.showShareMenu({ menus: ["shareAppMessage", "shareTimeline"] });
  },

  onShareAppMessage() {
    return {
      title: `${this.data.product.name}｜PÚSY中国商城`,
      path: `/pages/product/index?id=${this.data.product.id}`,
      imageUrl: this.data.product.image
    };
  }
});
