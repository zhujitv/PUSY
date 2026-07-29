const { categories, products } = require("../../data/products");
const { syncCartBadge } = require("../../utils/cart");

Page({
  data: {
    categories,
    activeCategory: "全部",
    query: "",
    visibleProducts: products,
    resultText: `${products.length}件商品`
  },

  onShow() {
    const storedCategory = wx.getStorageSync("pusy_active_category");
    if (storedCategory && categories.includes(storedCategory)) {
      this.setData({ activeCategory: storedCategory });
      wx.removeStorageSync("pusy_active_category");
    }
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

  applyFilters() {
    const category = this.data.activeCategory;
    const query = this.data.query.trim().toLowerCase();
    const visibleProducts = products.filter((product) => {
      const categoryMatches = category === "全部" || product.category === category;
      const queryMatches = !query || `${product.name} ${product.subtitle} ${product.category}`.toLowerCase().includes(query);
      return categoryMatches && queryMatches;
    });
    this.setData({ visibleProducts, resultText: `${visibleProducts.length}件商品` });
  }
});
