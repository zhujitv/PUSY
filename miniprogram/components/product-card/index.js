const { addToCart } = require("../../utils/cart");

Component({
  properties: {
    product: { type: Object, value: {} }
  },

  methods: {
    openProduct() {
      wx.navigateTo({ url: `/pages/product/index?id=${this.data.product.id}` });
    },

    add() {
      addToCart(this.data.product.id, 1);
      wx.showToast({ title: "已加入购物袋", icon: "success" });
      this.triggerEvent("cartchange");
    }
  }
});
