const {
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  syncNotificationBadge,
} = require("../../utils/notifications");

const typeLabels = {
  order: "订单",
  logistics: "物流",
  service: "售后",
  benefit: "权益",
  product: "商品",
  system: "系统",
};
const tabPages = new Set(["/pages/home/index", "/pages/category/index", "/pages/cart/index", "/pages/profile/index"]);

Page({
  data: {
    loading: true,
    activeFilter: "all",
    notifications: [],
    visibleNotifications: [],
    unreadCount: 0,
  },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const result = await refreshNotifications();
      this.applyResult(result);
      await syncNotificationBadge(result.unreadCount);
      if (result.error) wx.showToast({ title: "当前显示最近缓存消息", icon: "none" });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "读取消息失败", icon: "none" });
    }
  },

  applyResult(result) {
    const notifications = (result.notifications || []).map((item) => ({ ...item, typeLabel: typeLabels[item.type] || "系统" }));
    const visibleNotifications = this.data.activeFilter === "unread" ? notifications.filter((item) => !item.read) : notifications;
    this.setData({ loading: false, notifications, visibleNotifications, unreadCount: result.unreadCount || 0 });
  },

  selectFilter(event) {
    const activeFilter = event.currentTarget.dataset.filter === "unread" ? "unread" : "all";
    this.setData({ activeFilter }, () => this.applyResult({ notifications: this.data.notifications, unreadCount: this.data.unreadCount }));
  },

  async markAll() {
    if (!this.data.unreadCount) return;
    try {
      const result = await markAllNotificationsRead();
      this.applyResult(result);
      await syncNotificationBadge(0);
      wx.showToast({ title: "已全部标为已读", icon: "none" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async openNotification(event) {
    const item = this.data.notifications.find((entry) => entry.id === event.currentTarget.dataset.id);
    if (!item) return;
    try {
      if (!item.read) {
        const result = await markNotificationRead(item.id);
        this.applyResult(result);
        await syncNotificationBadge(result.unreadCount);
      }
      if (item.link && tabPages.has(item.link.split("?")[0])) wx.switchTab({ url: item.link.split("?")[0] });
      else if (item.link) wx.navigateTo({ url: item.link });
      else wx.showModal({ title: item.title, content: item.body, showCancel: false, confirmText: "知道了" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },
});
