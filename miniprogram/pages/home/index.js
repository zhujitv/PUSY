const { refreshCatalog, snapshot } = require("../../utils/catalog");
const { syncCartBadge } = require("../../utils/cart");

const initialCatalog = snapshot("preview");

function productSections(catalog) {
  return {
    categories: catalog.categories.filter((category) => category !== "全部"),
    featured: catalog.products.slice(0, 6),
    newArrivals: catalog.products.filter((product) => product.badge === "新品").slice(0, 4),
    dataStatus: catalog.source === "api" ? "实时商品" : catalog.source === "cache" ? "缓存商品" : "开发预览",
  };
}

Page({
  data: {
    ...productSections(initialCatalog),
    banners: [
      { image: "/assets/hero.jpg", kicker: "PÚSY SUMMER", title: "礼物飞进\n你的订单", action: "探索夏日精选" },
      { image: "/assets/secret-box.jpg", kicker: "PÚSY 神秘礼盒", title: "装下这个夏天\n需要的一切", action: "发现礼盒" }
    ]
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    syncCartBadge();
  },

  async loadProducts() {
    const catalog = await refreshCatalog();
    this.setData(productSections(catalog));
  },

  openCategory(event) {
    const category = event.currentTarget.dataset.category;
    wx.setStorageSync("pusy_active_category", category);
    wx.switchTab({ url: "/pages/category/index" });
  },

  openAll() {
    wx.setStorageSync("pusy_active_category", "全部");
    wx.switchTab({ url: "/pages/category/index" });
  },

  openBanner(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    if (index === 1) {
      wx.navigateTo({ url: "/pages/product/index?id=flower-kit" });
      return;
    }
    this.openAll();
  }
});
