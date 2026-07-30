const { orderHistory } = require("../../utils/orders");

Page({
  data: {
    allOrders: [],
    orders: [],
    loading: true,
    activeTab: "all",
    tabs: [
      { key: "all", label: "全部" },
      { key: "payment", label: "待付款" },
      { key: "processing", label: "处理中" },
      { key: "shipping", label: "物流" },
      { key: "service", label: "售后" },
    ],
  },
  async onShow() {
    this.setData({ loading: true });
    const allOrders = await orderHistory();
    this.setData({ allOrders, loading: false }, () => this.filterOrders());
  },
  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key }, () => this.filterOrders());
  },
  filterOrders() {
    const key = this.data.activeTab;
    const statuses = {
      payment: ["待付款", "支付失败"],
      processing: ["待处理", "已确认", "配货中", "部分退款"],
      shipping: ["已发货", "已完成"],
      service: ["退款中", "已退款", "已取消", "已取消（预览）"],
    };
    const orders = key === "all" ? this.data.allOrders : this.data.allOrders.filter((order) => {
      if (key === "service" && ((order.returns || []).length || (order.refunds || []).length)) return true;
      return (statuses[key] || []).includes(order.status);
    });
    this.setData({ orders });
  },
  openOrder(event) {
    const id = event.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/order-detail/index?id=${encodeURIComponent(id)}` });
  },
  openAfterSale(event) {
    wx.navigateTo({ url: `/pages/after-sale/index?orderId=${encodeURIComponent(event.currentTarget.dataset.id)}` });
  },
  browse() { wx.switchTab({ url: "/pages/category/index" }); },
});
