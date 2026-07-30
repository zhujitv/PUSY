const { addressText, getAddress, syncMemberAddress } = require("../../utils/address");
const { formatMoney, getCartView } = require("../../utils/cart");
const { calculate, createOrder } = require("../../utils/orders");
const { currentSession, refreshAccount } = require("../../utils/session");
const config = require("../../config/index");

Page({
  data: {
    cart: { items: [], count: 0, totalFen: 0, totalText: "¥0" },
    address: null,
    addressText: "",
    delivery: "标准快递",
    deliveryOptions: ["标准快递", "顺丰速运", "门店自提"],
    shippingText: "¥46.80",
    discountText: "-¥0",
    totalText: "¥0",
    coupons: [],
    couponOptions: ["不使用优惠券"],
    couponIndex: 0,
    coupon: null,
    couponNote: config.previewMode ? "正式会员登录后可选择账户优惠券" : "暂无可用优惠券",
    previewMode: config.previewMode,
    busy: false,
  },

  onShow() {
    const cart = getCartView();
    const address = getAddress();
    this.setData({ cart, address, addressText: addressText(address) }, () => this.updateTotals());
    this.loadMemberData();
  },

  async loadMemberData() {
    try {
      const synced = await syncMemberAddress();
      if (synced) this.setData({ address: synced, addressText: addressText(synced) });
      const session = currentSession();
      if (config.previewMode || !session || session.preview) return;
      const account = await refreshAccount();
      const now = new Date().toISOString();
      const coupons = (account.coupons || []).filter((coupon) => coupon.status === "available" && (!coupon.starts_at || coupon.starts_at <= now) && (!coupon.ends_at || coupon.ends_at >= now));
      const couponOptions = ["不使用优惠券", ...coupons.map((coupon) => {
        const benefit = coupon.kind === "fixed" ? `减 ${formatMoney(Math.round(Number(coupon.value || 0) * 12))}` : `减 ${Number(coupon.value || 0)}%`;
        const condition = Number(coupon.minimum || 0) ? ` · 满 ${formatMoney(Math.round(Number(coupon.minimum) * 12))}` : " · 无门槛";
        return `${benefit}${condition}`;
      })];
      this.setData({ coupons, couponOptions, couponNote: coupons.length ? `${coupons.length} 张可用` : "暂无可用优惠券" });
    } catch {
      // Keep local address and checkout available when member refresh is temporarily unavailable.
    }
  },

  openAddress() {
    wx.navigateTo({ url: "/pages/address/index" });
  },

  chooseDelivery(event) {
    this.setData({ delivery: event.currentTarget.dataset.delivery }, () => this.updateTotals());
  },

  chooseCoupon(event) {
    const couponIndex = Number(event.detail.value || 0);
    const coupon = couponIndex > 0 ? this.data.coupons[couponIndex - 1] : null;
    this.setData({ couponIndex, coupon }, () => this.updateTotals());
  },

  updateTotals() {
    const totals = calculate(this.data.cart, this.data.delivery, this.data.coupon);
    const couponBelowMinimum = this.data.coupon && !totals.discountFen;
    const couponNote = couponBelowMinimum
      ? "当前商品金额未达到该优惠券使用条件"
      : this.data.coupon
        ? `已选择 ${this.data.coupon.code}`
        : this.data.coupons.length ? `${this.data.coupons.length} 张可用` : (config.previewMode ? "正式会员登录后可选择账户优惠券" : "暂无可用优惠券");
    this.setData({
      shippingText: totals.shippingFen ? formatMoney(totals.shippingFen) : "免费",
      discountText: totals.discountFen ? `-${formatMoney(totals.discountFen)}` : "-¥0",
      totalText: formatMoney(totals.totalFen),
      couponNote,
    });
  },

  async submit() {
    if (this.data.busy) return;
    if (!this.data.cart.items.length) { wx.showToast({ title: "购物袋是空的", icon: "none" }); return; }
    if (!this.data.address) { wx.showToast({ title: "请先填写收货地址", icon: "none" }); return; }
    this.setData({ busy: true });
    try {
      const order = await createOrder({ cart: this.data.cart, address: this.data.address, delivery: this.data.delivery, couponCode: this.data.coupon ? this.data.coupon.code : "", coupon: this.data.coupon });
      wx.redirectTo({ url: `/pages/order-result/index?id=${encodeURIComponent(order.id)}` });
    } catch (error) {
      wx.showToast({ title: error.message || "提交订单失败", icon: "none", duration: 2500 });
    } finally {
      this.setData({ busy: false });
    }
  },
});
