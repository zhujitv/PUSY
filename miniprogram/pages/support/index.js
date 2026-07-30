const { getAddress } = require("../../utils/address");
const { contactPreferences, createSupportTicket, supportCategories, supportHistory } = require("../../utils/service");
const config = require("../../config/index");

function initialForm() {
  const address = getAddress() || {};
  return { name: address.recipient || "", phone: address.phone || "", email: address.email || "", wechat: "", category: supportCategories[0], contactPreference: contactPreferences[0], orderId: "", message: "" };
}

Page({
  data: {
    form: initialForm(),
    categories: supportCategories,
    categoryIndex: 0,
    contactPreferences,
    contactIndex: 0,
    tickets: [],
    previewMode: config.previewMode,
    busy: false,
  },

  onShow() { this.setData({ tickets: supportHistory() }); },

  updateField(event) { this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value }); },
  chooseCategory(event) { const categoryIndex = Number(event.detail.value || 0); this.setData({ categoryIndex, "form.category": supportCategories[categoryIndex] }); },
  chooseContact(event) { const contactIndex = Number(event.detail.value || 0); this.setData({ contactIndex, "form.contactPreference": contactPreferences[contactIndex] }); },

  async submit() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const ticket = await createSupportTicket(this.data.form);
      this.setData({ tickets: supportHistory(), "form.message": "" });
      wx.showModal({ title: this.data.previewMode ? "预览工单已生成" : "客服工单已提交", content: `${ticket.id} · ${ticket.status || "已提交"}${this.data.previewMode ? "\n仅保存在开发者工具本地。" : ""}`, showCancel: false, confirmText: "知道了" });
    } catch (error) {
      wx.showToast({ title: error.message || "提交失败", icon: "none", duration: 2500 });
    } finally {
      this.setData({ busy: false });
    }
  },
});
