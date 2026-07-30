const { favoriteProducts } = require("../../utils/favorites");
const { refreshCatalog, snapshot } = require("../../utils/catalog");
const { syncCartBadge } = require("../../utils/cart");

Page({
  data: { products: [], loading: true, dataStatus: "开发预览" },

  onShow() {
    syncCartBadge();
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true });
    const catalog = await refreshCatalog().catch(() => snapshot("preview"));
    this.setData({
      products: favoriteProducts(catalog.products),
      dataStatus: catalog.source === "api" ? "实时商品" : catalog.source === "cache" ? "缓存商品" : "开发预览",
      loading: false,
    });
  },

  browse() { wx.switchTab({ url: "/pages/category/index" }); },
});
