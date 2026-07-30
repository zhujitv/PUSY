const config = require("../config/index");
const { addressText } = require("./address");
const { formatMoney, saveCart } = require("./cart");
const { findProduct } = require("./catalog");
const { request } = require("./request");
const { currentSession, refreshAccount } = require("./session");

const ORDER_KEY = "pusy_orders_v1";
const FREE_SHIPPING_FEN = 60000;
const deliveryFees = { "标准快递": 4680, "顺丰速运": 7080, "门店自提": 0 };

function getLocalOrders() {
  const stored = wx.getStorageSync(ORDER_KEY);
  return Array.isArray(stored) ? stored : [];
}

function saveOrder(order) {
  const orders = [order, ...getLocalOrders().filter((item) => item.id !== order.id)].slice(0, 30);
  wx.setStorageSync(ORDER_KEY, orders);
  return order;
}

function couponDiscountFen(coupon, merchandiseFen) {
  if (!coupon || coupon.status !== "available") return 0;
  const minimumFen = Math.max(0, Math.round(Number(coupon.minimum || 0) * 12));
  if (merchandiseFen < minimumFen) return 0;
  const raw = coupon.kind === "fixed"
    ? Math.round(Number(coupon.value || 0) * 12)
    : Math.round(merchandiseFen * Number(coupon.value || 0) / 100);
  return Math.min(merchandiseFen, Math.max(0, raw));
}

function calculate(cart, delivery, coupon = null) {
  const shippingFen = delivery === "门店自提" || cart.totalFen >= FREE_SHIPPING_FEN ? 0 : (deliveryFees[delivery] || deliveryFees["标准快递"]);
  const discountFen = couponDiscountFen(coupon, cart.totalFen);
  return { shippingFen, discountFen, totalFen: Math.max(0, cart.totalFen + shippingFen - discountFen) };
}

async function createOrder({ cart, address, delivery, couponCode = "", coupon = null }) {
  const totals = calculate(cart, delivery, coupon);
  const items = cart.items.map((item) => ({ slug: item.productId, quantity: item.quantity }));
  if (config.previewMode) {
    const order = saveOrder({
      id: `PREVIEW-${Date.now()}`,
      preview: true,
      status: "开发预览",
      createdAt: new Date().toISOString(),
      reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      totalFen: totals.totalFen,
      totalText: formatMoney(totals.totalFen),
      delivery,
      address: addressText(address),
      customer: address.recipient,
      items: cart.items,
      couponCode: null,
      discountFen: 0,
      discountText: formatMoney(0),
      shipment: null,
      shipmentEvents: [],
      returns: [],
      refunds: [],
    });
    saveCart([]);
    return order;
  }
  if (!currentSession()) throw new Error("请先登录微信会员再提交订单");
  const response = await request("/api/orders", {
    method: "POST",
    data: {
      customer: address.recipient,
      email: address.email,
      phone: address.phone,
      address: addressText(address),
      delivery,
      payment: "微信支付",
      couponCode: couponCode || undefined,
      items,
    },
  });
  const order = saveOrder({
    id: response.orderId,
    preview: false,
    status: "待付款",
    createdAt: new Date().toISOString(),
    totalFen: Math.round(Number(response.total || 0) * 12),
    totalText: formatMoney(Math.round(Number(response.total || 0) * 12)),
    delivery,
    address: addressText(address),
    customer: address.recipient,
    couponCode: response.couponCode || null,
    discountFen: Math.round(Number(response.discount || 0) * 12),
    discountText: formatMoney(Math.round(Number(response.discount || 0) * 12)),
    paymentToken: response.paymentToken,
    reservationExpiresAt: response.reservationExpiresAt,
    items: cart.items,
    shipment: null,
    shipmentEvents: [],
    returns: [],
    refunds: [],
  });
  saveCart([]);
  refreshAccount().catch(() => undefined);
  return order;
}

function composeRemoteOrder(order, account) {
  const items = (account.orderItems || []).filter((item) => item.order_id === order.id).map((item) => {
    const product = findProduct(item.product_slug);
    const subtotalFen = Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0) * 12);
    return {
      productId: item.product_slug,
      name: item.product_name,
      quantity: Number(item.quantity || 0),
      unitPriceText: formatMoney(Math.round(Number(item.unit_price || 0) * 12)),
      subtotalText: formatMoney(subtotalFen),
      image: product.image,
    };
  });
  const shipment = (account.shipments || []).find((item) => item.order_id === order.id) || null;
  const shipmentEvents = shipment
    ? (account.shipmentEvents || []).filter((item) => item.shipment_id === shipment.id).map((item) => ({ ...item, timeText: String(item.event_time || "").replace("T", " ").slice(0, 16) }))
    : [];
  const refunds = (account.refunds || []).filter((item) => item.order_id === order.id).map((item) => ({
    ...item,
    amountText: formatMoney(Math.round(Number(item.amount_fen || 0))),
    statusText: ({ pending: "等待退款", processing: "退款处理中", succeeded: "退款成功", failed: "退款失败" })[item.status] || item.status,
    timeText: String(item.updated_at || item.created_at || "").replace("T", " ").slice(0, 16),
  }));
  const closedStatuses = ["退款中", "已取消", "已退款", "已发货", "已完成"];
  const afterSaleBlockedStatuses = ["待付款", "支付失败", "已取消", "已退款"];
  return {
    id: order.id,
    preview: false,
    status: order.status,
    createdAt: order.created_at,
    customer: order.customer,
    phone: order.phone,
    email: order.email,
    address: order.address,
    delivery: order.delivery,
    payment: order.payment,
    reservationExpiresAt: order.reservation_expires_at,
    cancelReason: order.cancel_reason,
    couponCode: order.coupon_code,
    discountFen: Math.round(Number(order.discount || 0) * 12),
    discountText: formatMoney(Math.round(Number(order.discount || 0) * 12)),
    totalFen: Math.round(Number(order.total || 0) * 12),
    totalText: formatMoney(Math.round(Number(order.total || 0) * 12)),
    items,
    shipment,
    shipmentEvents,
    returns: (account.returns || []).filter((item) => item.order_id === order.id),
    refunds,
    canCancel: !closedStatuses.includes(order.status),
    canAfterSale: !afterSaleBlockedStatuses.includes(order.status),
  };
}

function findLocalOrder(id) {
  return getLocalOrders().find((order) => order.id === id) || null;
}

function localOrderView(order) {
  if (!order) return null;
  const cancelled = order.status === "已取消（预览）";
  return { shipment: null, shipmentEvents: [], returns: [], refunds: [], items: [], canCancel: !cancelled, canAfterSale: !cancelled, ...order };
}

async function orderHistory() {
  const local = getLocalOrders().map(localOrderView);
  const session = currentSession();
  if (!session || session.preview) return local;
  try {
    const account = await refreshAccount();
    const remote = (account.orders || []).map((order) => composeRemoteOrder(order, account));
    return [...remote, ...local.filter((item) => !remote.some((remoteOrder) => remoteOrder.id === item.id))];
  } catch {
    return local;
  }
}

async function orderDetail(id) {
  const local = findLocalOrder(id);
  const session = currentSession();
  const normalizedLocal = localOrderView(local);
  if (!session || session.preview || config.previewMode) return normalizedLocal;
  try {
    const account = await refreshAccount();
    const remote = (account.orders || []).find((order) => order.id === id);
    return remote ? composeRemoteOrder(remote, account) : normalizedLocal;
  } catch {
    return normalizedLocal;
  }
}

async function cancelMemberOrder(id, reason = "小程序会员申请取消") {
  const local = findLocalOrder(id);
  if (config.previewMode || (local && local.preview)) {
    if (!local) throw new Error("没有找到这笔预览订单");
    const cancelled = { ...local, status: "已取消（预览）", cancelledAt: new Date().toISOString(), cancelReason: reason, canCancel: false, canAfterSale: false };
    saveOrder(cancelled);
    return { order: cancelled, outcome: "preview_cancelled" };
  }
  if (!currentSession()) throw new Error("请先登录微信会员");
  const response = await request("/api/miniprogram/orders", { method: "POST", data: { action: "cancel", orderId: id, reason } });
  await refreshAccount();
  return response;
}

function countdownText(expiresAt, now = Date.now()) {
  const remaining = new Date(expiresAt || "").getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "支付时限已结束";
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

module.exports = { calculate, cancelMemberOrder, countdownText, couponDiscountFen, createOrder, findLocalOrder, orderDetail, orderHistory };
