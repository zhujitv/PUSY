const { findProduct, refreshCatalog, snapshot } = require("../../utils/catalog");
const { addToCart, syncCartBadge } = require("../../utils/cart");
const { isFavorite, toggleFavorite } = require("../../utils/favorites");
const { productAlertState, toggleProductAlert } = require("../../utils/member");

const initialCatalog = snapshot("preview");

Page({
  data: {
    product: findProduct(),
    quantity: 1,
    related: [],
    dataStatus: "开发预览",
    favorite: false,
    alerts: { restock: false, priceDrop: false },
  },

  onLoad(options) {
    this.productId = options.id;
    this.renderProduct(initialCatalog);
    this.loadProduct();
  },

  onShow() {
    syncCartBadge();
    if (this.productId) this.setData({ favorite: isFavorite(this.productId) });
    if (this.productId) this.setData({ alerts: productAlertState(this.productId) });
  },

  async loadProduct() {
    const catalog = await refreshCatalog();
    this.renderProduct(catalog);
  },

  renderProduct(catalog) {
    const product = catalog.products.find((item) => item.id === this.productId) || findProduct(this.productId);
    const related = catalog.products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);
    this.setData({ product, related, dataStatus: catalog.source === "api" ? "实时库存" : catalog.source === "cache" ? "缓存数据" : "开发预览" });
    wx.setNavigationBarTitle({ title: product.name });
  },

  changeQuantity(event) {
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const maximum = this.data.product.inventoryVerified ? Math.max(1, Number(this.data.product.stock || 1)) : 20;
    this.setData({ quantity: Math.max(1, Math.min(maximum, this.data.quantity + delta)) });
  },

  add() {
    if (this.data.product.purchasable === false) {
      wx.showToast({ title: "商品暂时缺货", icon: "none" });
      return;
    }
    addToCart(this.data.product.id, this.data.quantity);
    wx.showToast({ title: "已加入购物袋", icon: "success" });
  },

  buyNow() {
    if (this.data.product.purchasable === false) {
      wx.showToast({ title: "商品暂时缺货", icon: "none" });
      return;
    }
    addToCart(this.data.product.id, this.data.quantity);
    wx.switchTab({ url: "/pages/cart/index" });
  },

  openRelated(event) {
    wx.redirectTo({ url: `/pages/product/index?id=${event.currentTarget.dataset.id}` });
  },

  toggleFavorite() {
    const favorite = toggleFavorite(this.data.product.id);
    this.setData({ favorite });
    wx.showToast({ title: favorite ? "已加入收藏" : "已取消收藏", icon: "none" });
  },

  async toggleAlert(event) {
    const alertType = event.currentTarget.dataset.type;
    try {
      const active = await toggleProductAlert(this.data.product, alertType);
      this.setData({ alerts: productAlertState(this.data.product.id) });
      wx.showToast({ title: active ? "提醒已开启" : "提醒已关闭", icon: "none" });
    } catch (error) {
      wx.showToast({ title: error.message || "设置提醒失败", icon: "none" });
    }
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
