const { addToCart } = require("../../utils/cart");

Component({
  properties: {
    product: { type: Object, value: {} },
    variant: { type: String, value: "compact" }
  },

  methods: {
    openProduct() {
      wx.navigateTo({ url: `/pages/product/index?id=${this.data.product.id}` });
    },

    add() {
      if (this.data.product.purchasable === false) {
        wx.showToast({ title: "商品暂时缺货", icon: "none" });
        return;
      }
      addToCart(this.data.product.id, 1);
      wx.showToast({ title: "已加入购物袋", icon: "success" });
      this.triggerEvent("cartchange");
    }
  }
});
