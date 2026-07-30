const { getCartView, syncCartBadge } = require("../../utils/cart");
const { currentSession, login, refreshAccount } = require("../../utils/session");
const { refreshNotifications, syncNotificationBadge } = require("../../utils/notifications");

Page({
  data: {
    loggedIn: false,
    loginStatus: "尚未登录",
    memberName: "",
    memberSummary: "",
    loginBusy: false,
    cartCount: 0,
    notificationUnread: 0,
    services: [
      { key: "notifications", label: "消息中心", caption: "订单、物流、退款与优惠提醒" },
      { key: "orders", label: "我的订单", caption: "查看支付、配送与售后状态" },
      { key: "address", label: "收货地址", caption: "管理联系人与常用地址" },
      { key: "favorites", label: "我的收藏", caption: "保存喜欢的商品" },
      { key: "benefits", label: "会员权益", caption: "等级、积分、优惠券与商品提醒" },
      { key: "support", label: "客户服务", caption: "配送、退换货与常见问题" }
    ]
  },

  onShow() {
    const cart = getCartView();
    const session = currentSession();
    this.setData({ cartCount: cart.count, loggedIn: Boolean(session), memberName: session && session.member ? session.member.name : "", memberSummary: this.memberSummary(session), loginStatus: session ? (session.preview ? "本地预览会员" : "微信会员已登录") : "尚未登录" });
    syncCartBadge();
    refreshNotifications().then((result) => {
      this.setData({ notificationUnread: result.unreadCount });
      return syncNotificationBadge(result.unreadCount);
    }).catch(() => undefined);
    if (session && !session.preview) refreshAccount().then((next) => this.setData({ memberName: next.member.name, memberSummary: this.memberSummary(next) })).catch(() => undefined);
  },

  memberSummary(session) {
    if (!session || !session.member || session.preview) return "";
    return `${session.member.tier || "会员"} · ${session.member.pointsBalance || 0} 积分`;
  },

  async login() {
    if (this.data.loginBusy || this.data.loggedIn) return;
    this.setData({ loginBusy: true });
    try {
      const session = await login();
      this.setData({ loggedIn: true, memberName: session.member.name, memberSummary: this.memberSummary(session), loginStatus: session.preview ? "本地预览会员" : "微信会员已登录" });
      wx.showModal({
        title: session.preview ? "预览身份已建立" : "登录成功",
        content: session.preview ? "当前身份仅保存在开发者工具本地，不会生成或伪造 OpenID。认证完成并配置 AppID 后可切换为真实微信登录。" : "会员身份已与 PUSY.CN 后台连接。",
        showCancel: false,
        confirmText: "知道了"
      });
    } catch (error) {
      wx.showToast({ title: error.message || "登录失败", icon: "none" });
    } finally {
      this.setData({ loginBusy: false });
    }
  },

  openService(event) {
    const key = event.currentTarget.dataset.key;
    if (key === "notifications") { wx.navigateTo({ url: "/pages/notifications/index" }); return; }
    if (key === "orders") { wx.navigateTo({ url: "/pages/orders/index" }); return; }
    if (key === "address") { wx.navigateTo({ url: "/pages/address/index" }); return; }
    if (key === "favorites") { wx.navigateTo({ url: "/pages/favorites/index" }); return; }
    if (key === "benefits") { wx.navigateTo({ url: "/pages/benefits/index" }); return; }
    if (key === "support") { wx.navigateTo({ url: "/pages/support/index" }); return; }
    wx.showToast({ title: "功能开发中", icon: "none" });
  },

  openCart() {
    wx.switchTab({ url: "/pages/cart/index" });
  }
});
