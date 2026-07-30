const { refreshCatalog, snapshot } = require("../../utils/catalog");
const { syncCartBadge } = require("../../utils/cart");

const initialCatalog = snapshot("preview");

Page({
  data: {
    categories: initialCatalog.categories,
    activeCategory: "全部",
    query: "",
    visibleProducts: initialCatalog.products,
    resultText: `${initialCatalog.products.length}件商品`,
    dataStatus: "开发预览",
  },

  onLoad() {
    this.catalogProducts = initialCatalog.products;
    this.loadProducts();
  },

  onShow() {
    const storedCategory = wx.getStorageSync("pusy_active_category");
    this.pendingCategory = storedCategory || this.pendingCategory;
    if (storedCategory && this.data.categories.includes(storedCategory)) {
      this.setData({ activeCategory: storedCategory });
    }
    if (storedCategory) wx.removeStorageSync("pusy_active_category");
    this.applyFilters();
    syncCartBadge();
  },

  chooseCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.category }, () => this.applyFilters());
  },

  updateQuery(event) {
    this.setData({ query: event.detail.value }, () => this.applyFilters());
  },

  clearQuery() {
    this.setData({ query: "" }, () => this.applyFilters());
  },

  async loadProducts() {
    const catalog = await refreshCatalog();
    this.catalogProducts = catalog.products;
    const requestedCategory = this.pendingCategory || this.data.activeCategory;
    const activeCategory = catalog.categories.includes(requestedCategory) ? requestedCategory : "全部";
    this.pendingCategory = "";
    this.setData({
      categories: catalog.categories,
      activeCategory,
      dataStatus: catalog.source === "api" ? "实时库存" : catalog.source === "cache" ? "缓存数据" : "开发预览",
    }, () => this.applyFilters());
  },

  applyFilters() {
    const category = this.data.activeCategory;
    const query = this.data.query.trim().toLowerCase();
    const visibleProducts = (this.catalogProducts || initialCatalog.products).filter((product) => {
      const categoryMatches = category === "全部" || product.category === category;
      const queryMatches = !query || `${product.name} ${product.subtitle} ${product.category}`.toLowerCase().includes(query);
      return categoryMatches && queryMatches;
    });
    this.setData({ visibleProducts, resultText: `${visibleProducts.length}件商品` });
  }
});
