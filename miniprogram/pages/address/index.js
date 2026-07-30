const { emptyAddress, getAddress, saveMemberAddress, syncMemberAddress } = require("../../utils/address");
const config = require("../../config/index");

// saveMemberAddress 先复用 saveAddress 的本地校验，再为正式会员同步云端默认地址。

Page({
  data: { form: emptyAddress(), region: [], regionText: "", busy: false },

  onLoad() {
    const address = getAddress() || emptyAddress();
    const region = [address.province, address.city, address.district].filter(Boolean);
    this.setData({ form: address, region, regionText: region.join(" / ") });
    syncMemberAddress().then((synced) => {
      if (!synced) return;
      const nextRegion = [synced.province, synced.city, synced.district].filter(Boolean);
      this.setData({ form: synced, region: nextRegion, regionText: nextRegion.join(" / ") });
    }).catch(() => undefined);
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  chooseRegion(event) {
    const region = event.detail.value || [];
    this.setData({ region, regionText: region.join(" / "), "form.province": region[0] || "", "form.city": region[1] || "", "form.district": region[2] || "" });
  },

  async save() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await saveMemberAddress(this.data.form);
      wx.showToast({ title: config.previewMode ? "地址已保存" : "地址已保存并同步", icon: "success" });
      setTimeout(() => wx.navigateBack(), 350);
    } catch (error) {
      wx.showToast({ title: error.message || "请检查地址", icon: "none" });
    } finally {
      this.setData({ busy: false });
    }
  },
});
