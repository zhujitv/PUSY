const config = require("../config/index");

const CART_KEY = "pusy_cart_v1";
const NOTIFICATIONS_KEY = config.previewMode ? "pusy_notifications_preview_v1" : "pusy_notifications_v1";

function cartCount() {
  try {
    const cart = wx.getStorageSync(CART_KEY);
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => total + Math.max(0, Number(item && item.quantity) || 0), 0);
  } catch (error) {
    return 0;
  }
}

function notificationCount() {
  try {
    const snapshot = wx.getStorageSync(NOTIFICATIONS_KEY);
    const notifications = snapshot && Array.isArray(snapshot.notifications) ? snapshot.notifications : [];
    return notifications.filter((item) => !(item.read || item.read_at || item.readAt)).length;
  } catch (error) {
    return 0;
  }
}

Component({
  data: {
    selected: 0,
    items: [
      { pagePath: "/pages/home/index", text: "首页" },
      { pagePath: "/pages/category/index", text: "分类" },
      { pagePath: "/pages/cart/index", text: "购物袋" },
      { pagePath: "/pages/profile/index", text: "我的" },
    ],
    cartBadge: "",
    notificationBadge: "",
  },

  lifetimes: {
    attached() {
      this.refresh();
    },
  },

  pageLifetimes: {
    show() {
      this.refresh();
    },
  },

  methods: {
    refresh() {
      const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
      const route = pages.length ? `/${pages[pages.length - 1].route}` : "";
      const selected = this.data.items.findIndex((item) => item.pagePath === route);
      const cart = cartCount();
      const notifications = notificationCount();
      this.setData({
        selected: selected >= 0 ? selected : this.data.selected,
        cartBadge: cart > 0 ? String(Math.min(cart, 99)) : "",
        notificationBadge: notifications > 0 ? String(Math.min(notifications, 99)) : "",
      });
    },

    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.items[index];
      if (!item) return;
      this.setData({ selected: index });
      wx.switchTab({ url: item.pagePath });
    },
  },
});
