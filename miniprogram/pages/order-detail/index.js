const { cancelMemberOrder, countdownText, orderDetail } = require("../../utils/orders");

Page({
  data: { order: null, loading: true, refreshing: false, cancelling: false, paymentCountdown: "", paymentExpired: false },

  async onLoad(options) {
    this.orderId = decodeURIComponent(options.id || "");
    await this.loadOrder();
  },

  onUnload() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },

  async loadOrder() {
    const order = await orderDetail(this.orderId);
    this.setData({ order, loading: false, refreshing: false });
    this.startCountdown();
  },

  startCountdown() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    const update = () => {
      const order = this.data.order;
      const active = order && ["待付款", "开发预览"].includes(order.status) && order.reservationExpiresAt;
      const paymentCountdown = active ? countdownText(order.reservationExpiresAt) : "";
      this.setData({ paymentCountdown, paymentExpired: paymentCountdown === "支付时限已结束" });
      if (!active || this.data.paymentExpired) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
    };
    update();
    if (!this.data.paymentExpired && this.data.paymentCountdown) this.countdownTimer = setInterval(update, 1000);
  },

  async refreshDetail() {
    if (this.data.refreshing) return;
    this.setData({ refreshing: true });
    await this.loadOrder();
    wx.showToast({ title: "订单状态已刷新", icon: "none" });
  },

  confirmCancel() {
    return new Promise((resolve) => wx.showModal({
      title: "确认取消订单？",
      content: this.data.order.preview ? "这只会修改开发者工具中的本地预览订单。" : "未付款订单会释放库存和优惠券；已付款未发货订单将发起原路退款。",
      confirmText: "确认取消",
      confirmColor: "#c62f72",
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    }));
  },

  async cancelOrder() {
    if (this.data.cancelling || !this.data.order || !await this.confirmCancel()) return;
    this.setData({ cancelling: true });
    try {
      const result = await cancelMemberOrder(this.data.order.id);
      await this.loadOrder();
      wx.showToast({ title: result.outcome === "refund_started" ? "退款申请已发起" : "订单已取消", icon: "none", duration: 2200 });
    } catch (error) {
      wx.showToast({ title: error.message || "取消订单失败", icon: "none", duration: 2500 });
    } finally {
      this.setData({ cancelling: false });
    }
  },

  openAfterSale() {
    if (!this.data.order) return;
    wx.navigateTo({ url: `/pages/after-sale/index?orderId=${encodeURIComponent(this.data.order.id)}` });
  },

  copyTracking() {
    const shipment = this.data.order && this.data.order.shipment;
    if (shipment && shipment.tracking_number) wx.setClipboardData({ data: shipment.tracking_number });
  },

  browse() { wx.switchTab({ url: "/pages/category/index" }); },
});
