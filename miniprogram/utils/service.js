const config = require("../config/index");
const { request } = require("./request");
const { currentSession } = require("./session");

const SUPPORT_KEY = "pusy_support_tickets_v1";
const RETURN_KEY = "pusy_return_requests_v1";
const supportCategories = ["订单咨询", "商品咨询", "配送问题", "支付问题", "售后问题", "会员与账号", "其他问题"];
const contactPreferences = ["微信", "电话或短信", "电子邮箱"];
const returnTypes = [
  { value: "refund", label: "退货退款" },
  { value: "exchange", label: "换货" },
  { value: "reship", label: "漏发 / 错发补寄" },
];
const returnReasons = ["商品破损或存在质量问题", "收到错误商品", "商品与预期不符", "其他原因"];

function listStored(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function saveStored(key, item) {
  const items = [item, ...listStored(key).filter((stored) => stored.id !== item.id)].slice(0, 20);
  wx.setStorageSync(key, items);
  return item;
}

function requireSession() {
  if (!currentSession()) throw new Error("请先登录微信会员");
}

function supportPayload(input) {
  const payload = {
    name: String(input.name || "").trim().slice(0, 60),
    phone: String(input.phone || "").replace(/\s|-/g, ""),
    wechat: String(input.wechat || "").trim().slice(0, 60),
    email: String(input.email || "").trim().toLowerCase().slice(0, 160),
    category: String(input.category || "").trim(),
    contactPreference: String(input.contactPreference || "").trim(),
    orderId: String(input.orderId || "").trim().toUpperCase().slice(0, 64),
    message: String(input.message || "").trim().slice(0, 4000),
  };
  if (!payload.name || !supportCategories.includes(payload.category) || !contactPreferences.includes(payload.contactPreference) || payload.message.length < 10) throw new Error("请完整填写姓名、问题类型和至少 10 个字的问题说明");
  if (!/^1[3-9]\d{9}$/.test(payload.phone)) throw new Error("请输入有效的中国大陆手机号码");
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error("电子邮箱格式不正确");
  if (payload.contactPreference === "微信" && !payload.wechat) throw new Error("选择微信联系时请填写微信号");
  if (payload.contactPreference === "电子邮箱" && !payload.email) throw new Error("选择电子邮箱联系时请填写邮箱");
  return payload;
}

async function createSupportTicket(input) {
  const payload = supportPayload(input);
  if (config.previewMode) return saveStored(SUPPORT_KEY, {
    ...payload,
    id: `PREVIEW-CS-${Date.now()}`,
    preview: true,
    status: "本地预览",
    createdAt: new Date().toISOString(),
  });
  requireSession();
  return request("/api/miniprogram/support", { method: "POST", data: payload });
}

function returnPayload(input) {
  const payload = {
    orderId: String(input.orderId || "").trim().toUpperCase().slice(0, 64),
    requestType: String(input.requestType || "refund"),
    reason: String(input.reason || "").trim().slice(0, 120),
    details: String(input.details || "").trim().slice(0, 1000),
  };
  if (!payload.orderId || !returnTypes.some((item) => item.value === payload.requestType) || !returnReasons.includes(payload.reason)) throw new Error("请选择订单、售后类型和申请原因");
  return payload;
}

async function createReturnRequest(input) {
  const payload = returnPayload(input);
  if (config.previewMode) return saveStored(RETURN_KEY, {
    ...payload,
    id: `PREVIEW-RET-${Date.now()}`,
    preview: true,
    status: "本地预览",
    createdAt: new Date().toISOString(),
  });
  requireSession();
  return request("/api/miniprogram/returns", { method: "POST", data: payload });
}

function supportHistory() { return listStored(SUPPORT_KEY); }
function returnHistory() { return listStored(RETURN_KEY); }

module.exports = { contactPreferences, createReturnRequest, createSupportTicket, returnHistory, returnReasons, returnTypes, supportCategories, supportHistory };
