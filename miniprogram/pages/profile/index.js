const { getCartView, syncCartBadge } = require("../../utils/cart");

Page({
  data: {
    loggedIn: false,
    loginStatus: "尚未登录",
    cartCount: 0,
    services: [
      { key: "orders", label: "我的订单", caption: "查看支付、配送与售后状态" },
      { key: "address", label: "收货地址", caption: "管理联系人与常用地址" },
      { key: "favorites", label: "我的收藏", caption: "保存喜欢的商品" },
      { key: "support", label: "客户服务", caption: "配送、退换货与常见问题" }
    ]
  },

  onShow() {
    const cart = getCartView();
    this.setData({ cartCount: cart.count });
    syncCartBadge();
  },

  login() {
    wx.login({
      success: ({ code }) => {
        if (!code) {
          wx.showToast({ title: "微信登录初始化失败", icon: "none" });
          return;
        }
        this.setData({ loggedIn: true, loginStatus: "微信登录流程已就绪" });
        wx.showModal({
          title: "开发预览",
          content: "已取得临时登录凭证。正式环境会把凭证发送至阿里云统一API，换取openid并关联会员账户。",
          showCancel: false,
          confirmText: "知道了"
        });
      },
      fail: () => wx.showToast({ title: "请在微信开发者工具中重试", icon: "none" })
    });
  },

  openService(event) {
    const key = event.currentTarget.dataset.key;
    const messages = {
      orders: "接通会员与订单API后开放",
      address: "接通会员地址API后开放",
      favorites: "收藏功能将在下一阶段完成",
      support: "正式上线前将接入客服会话"
    };
    wx.showToast({ title: messages[key] || "功能开发中", icon: "none" });
  },

  openCart() {
    wx.switchTab({ url: "/pages/cart/index" });
  }
});
