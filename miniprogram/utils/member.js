const config = require("../config/index");
const { request } = require("./request");
const { currentSession, refreshAccount } = require("./session");

const ALERT_KEY = "pusy_product_alerts_v1";
const tierRules = [
  { key: "bronze", name: "新星会员", minimum: 0, next: 500, benefit: "消费积分与会员活动" },
  { key: "silver", name: "银卡会员", minimum: 500, next: 2000, benefit: "会员活动与补货优先提醒" },
  { key: "gold", name: "金卡会员", minimum: 2000, next: 5000, benefit: "专属优惠券与新品优先体验" },
  { key: "diamond", name: "钻石会员", minimum: 5000, next: 5000, benefit: "最高等级专属权益" },
];

function storedAlerts() {
  const value = wx.getStorageSync(ALERT_KEY);
  return Array.isArray(value) ? value : [];
}

function saveAlerts(alerts) {
  const next = alerts.slice(0, 100);
  wx.setStorageSync(ALERT_KEY, next);
  return next;
}

function alertKey(productId, alertType) { return `${productId}:${alertType}`; }

function productAlertState(productId) {
  const alerts = config.previewMode ? storedAlerts() : ((currentSession() || {}).productAlerts || []);
  return {
    restock: alerts.some((item) => (item.productId || item.product_slug) === productId && item.alertType !== "price_drop" && item.alert_type !== "price_drop"),
    priceDrop: alerts.some((item) => (item.productId || item.product_slug) === productId && (item.alertType === "price_drop" || item.alert_type === "price_drop")),
  };
}

async function toggleProductAlert(product, alertType) {
  const validType = alertType === "price_drop" ? "price_drop" : "restock";
  const current = productAlertState(product.id);
  const active = validType === "price_drop" ? !current.priceDrop : !current.restock;
  if (config.previewMode) {
    const key = alertKey(product.id, validType);
    const alerts = storedAlerts().filter((item) => item.key !== key);
    if (active) alerts.unshift({ key, productId: product.id, productName: product.name, image: product.image, priceText: product.priceText, alertType: validType, createdAt: new Date().toISOString() });
    saveAlerts(alerts);
    return active;
  }
  if (!currentSession()) throw new Error("请先登录微信会员");
  await request("/api/miniprogram/product-alerts", { method: "POST", data: { productId: product.id, alertType: validType, action: active ? "subscribe" : "remove" } });
  await refreshAccount();
  return active;
}

function tierView(member) {
  if (!member || member.tier === "preview") return { key: "preview", name: "预览会员", benefit: "认证后开始累计真实积分", progress: 0, remaining: 0, nextName: "新星会员" };
  const points = Math.max(0, Number(member.lifetimePoints || member.pointsBalance || 0));
  const rule = tierRules.find((item) => item.key === member.tier) || tierRules[0];
  const index = tierRules.indexOf(rule);
  const next = tierRules[Math.min(index + 1, tierRules.length - 1)];
  const span = Math.max(1, rule.next - rule.minimum);
  return { ...rule, progress: rule.key === "diamond" ? 100 : Math.min(100, Math.round((points - rule.minimum) / span * 100)), remaining: Math.max(0, rule.next - points), nextName: next.name };
}

function couponView(coupon) {
  const fixed = coupon.kind === "fixed";
  return {
    ...coupon,
    benefit: fixed ? `减 ¥${(Number(coupon.value || 0) * 0.12).toFixed(2)}` : `减 ${Number(coupon.value || 0)}%`,
    condition: Number(coupon.minimum || 0) ? `满 ¥${(Number(coupon.minimum) * 0.12).toFixed(2)} 可用` : "无门槛",
    endsText: coupon.ends_at ? `有效期至 ${String(coupon.ends_at).slice(0, 10)}` : "长期有效",
  };
}

async function memberBenefits() {
  const session = currentSession();
  if (!session) return null;
  const account = session.preview ? session : await refreshAccount();
  const productAlerts = (session.preview ? storedAlerts() : (account.productAlerts || [])).map((item) => {
    const productId = item.productId || item.product_slug;
    const alertType = item.alertType || item.alert_type;
    const image = item.image && !/^https?:\/\//.test(item.image) ? `${String(config.apiBaseUrl || "").replace(/\/$/, "")}${item.image.startsWith("/") ? item.image : `/${item.image}`}` : item.image;
    return { ...item, key: item.key || alertKey(productId, alertType), productId, productName: item.productName || item.product_name, alertType, image, priceText: item.priceText || (item.price ? `¥${(Number(item.price) * 0.12).toFixed(2)}` : "") };
  });
  return {
    member: account.member,
    tier: tierView(account.member),
    coupons: (account.coupons || []).map(couponView),
    pointsLedger: account.pointsLedger || [],
    productAlerts,
    preview: Boolean(session.preview),
  };
}

module.exports = { memberBenefits, productAlertState, tierView, toggleProductAlert };
