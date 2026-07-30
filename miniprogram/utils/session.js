const config = require("../config/index");
const { request } = require("./request");

const SESSION_KEY = "pusy_member_session_v1";
const TOKEN_KEY = "pusy_member_token_v1";

function currentSession() {
  const session = wx.getStorageSync(SESSION_KEY);
  if (!session || !session.member) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    clearSession();
    return null;
  }
  return session;
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync("pusy_notifications_v1");
  wx.removeStorageSync("pusy_notifications_preview_v1");
}

function wxCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) { result.code ? resolve(result.code) : reject(new Error("微信登录初始化失败")); },
      fail() { reject(new Error("请在微信开发者工具中重试")); },
    });
  });
}

async function login() {
  if (config.previewMode) {
    const session = { preview: true, member: { id: 0, name: "预览会员", tier: "preview", pointsBalance: 0, lifetimePoints: 0 }, addresses: [], orders: [], orderItems: [], returns: [], refunds: [], shipments: [], shipmentEvents: [], pointsLedger: [], coupons: [], productAlerts: [] };
    wx.setStorageSync(SESSION_KEY, session);
    return session;
  }
  const code = await wxCode();
  const response = await request("/api/miniprogram/auth/wechat/login", { method: "POST", data: { code } });
  const session = { member: response.member, expiresAt: response.expiresAt, needsProfile: response.needsProfile };
  wx.setStorageSync(TOKEN_KEY, response.token);
  wx.setStorageSync(SESSION_KEY, session);
  return session;
}

async function refreshAccount() {
  const session = currentSession();
  if (!session || session.preview) return session;
  const account = await request("/api/miniprogram/account");
  const next = {
    ...session,
    member: account.member,
    profile: account.profile,
    addresses: account.addresses || [],
    orders: account.orders || [],
    orderItems: account.orderItems || [],
    returns: account.returns || [],
    refunds: account.refunds || [],
    shipments: account.shipments || [],
    shipmentEvents: account.shipmentEvents || [],
    pointsLedger: account.pointsLedger || [],
    coupons: account.coupons || [],
    productAlerts: account.productAlerts || [],
  };
  wx.setStorageSync(SESSION_KEY, next);
  return next;
}

module.exports = { clearSession, currentSession, login, refreshAccount };
