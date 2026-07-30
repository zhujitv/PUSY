const { memberBenefits, toggleProductAlert } = require("../../utils/member");

Page({
  data: { loggedIn: false, loading: true, preview: false, member: {}, tier: {}, coupons: [], pointsLedger: [], productAlerts: [] },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const benefits = await memberBenefits();
      if (!benefits) { this.setData({ loggedIn: false, loading: false }); return; }
      this.setData({ loggedIn: true, loading: false, ...benefits });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "读取会员权益失败", icon: "none" });
    }
  },

  openProfile() { wx.navigateBack(); },

  async removeAlert(event) {
    const alert = this.data.productAlerts[Number(event.currentTarget.dataset.index)];
    if (!alert) return;
    const product = { id: alert.productId, name: alert.productName, image: alert.image, priceText: alert.priceText || "" };
    const alertType = alert.alertType;
    try {
      await toggleProductAlert(product, alertType);
      await this.load();
      wx.showToast({ title: "已关闭提醒", icon: "none" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  openProduct(event) { wx.navigateTo({ url: `/pages/product/index?id=${event.currentTarget.dataset.id}` }); },
});
