const { createReturnRequest, returnReasons, returnTypes } = require("../../utils/service");
const config = require("../../config/index");

Page({
  data: {
    form: { orderId: "", requestType: returnTypes[0].value, reason: returnReasons[0], details: "" },
    returnTypeLabels: returnTypes.map((item) => item.label),
    typeIndex: 0,
    reasons: returnReasons,
    reasonIndex: 0,
    previewMode: config.previewMode,
    busy: false,
    result: null,
  },

  onLoad(options) { if (options.orderId) this.setData({ "form.orderId": decodeURIComponent(options.orderId) }); },
  updateField(event) { this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value }); },
  chooseType(event) { const typeIndex = Number(event.detail.value || 0); this.setData({ typeIndex, "form.requestType": returnTypes[typeIndex].value }); },
  chooseReason(event) { const reasonIndex = Number(event.detail.value || 0); this.setData({ reasonIndex, "form.reason": returnReasons[reasonIndex] }); },

  async submit() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const result = await createReturnRequest(this.data.form);
      this.setData({ result });
    } catch (error) {
      wx.showToast({ title: error.message || "提交失败", icon: "none", duration: 2500 });
    } finally {
      this.setData({ busy: false });
    }
  },

  openOrders() { wx.redirectTo({ url: "/pages/orders/index" }); },
});
