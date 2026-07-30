const config = require("../config/index");
const { request } = require("./request");
const { currentSession } = require("./session");
const { refreshCustomTabBar } = require("./tab-bar");

const NOTIFICATIONS_KEY = config.previewMode ? "pusy_notifications_preview_v1" : "pusy_notifications_v1";

function recentIso(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function previewSeed() {
  return [
    {
      id: "PREVIEW-MSG-ORDER",
      notification_type: "order",
      title: "订单已创建",
      body: "预览订单 PUSY-PREVIEW-001 已进入待付款状态，付款倒计时和订单操作会在订单详情中显示。",
      link: "/pages/orders/index",
      read_at: "",
      created_at: recentIso(8),
    },
    {
      id: "PREVIEW-MSG-LOGISTICS",
      notification_type: "logistics",
      title: "包裹运输中",
      body: "你的包裹已完成揽收。正式接入后，最新物流节点会自动同步到这里。",
      link: "/pages/orders/index",
      read_at: "",
      created_at: recentIso(45),
    },
    {
      id: "PREVIEW-MSG-COUPON",
      notification_type: "benefit",
      title: "专属优惠券已到账",
      body: "会员专属优惠已放入权益中心，可在结算时查看使用条件和有效期。",
      link: "/pages/benefits/index",
      read_at: "",
      created_at: recentIso(180),
    },
    {
      id: "PREVIEW-MSG-PRODUCT",
      notification_type: "product",
      title: "关注的商品已补货",
      body: "你开启补货提醒的商品现在可以购买了，库存变化较快，建议及时查看。",
      link: "/pages/category/index",
      read_at: recentIso(90),
      created_at: recentIso(1440),
    },
    {
      id: "PREVIEW-MSG-SERVICE",
      notification_type: "service",
      title: "售后进度已更新",
      body: "售后申请的处理进度、退款结果和客服补充说明会统一记录在消息中心。",
      link: "/pages/orders/index",
      read_at: recentIso(1400),
      created_at: recentIso(2880),
    },
  ];
}

function storedNotifications() {
  try {
    const stored = wx.getStorageSync(NOTIFICATIONS_KEY);
    return stored && Array.isArray(stored.notifications) ? stored.notifications : [];
  } catch (error) {
    return [];
  }
}

function saveNotifications(notifications) {
  const snapshot = { notifications, savedAt: Date.now() };
  wx.setStorageSync(NOTIFICATIONS_KEY, snapshot);
  return notifications;
}

function previewNotifications() {
  const existing = storedNotifications();
  return existing.length ? existing : saveNotifications(previewSeed());
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}.${day} ${hour}:${minute}`;
}

function notificationView(item) {
  const readAt = item.read_at || item.readAt || "";
  return {
    id: String(item.id || ""),
    type: String(item.notification_type || item.type || "system"),
    title: String(item.title || "消息通知"),
    body: String(item.body || ""),
    link: String(item.link || ""),
    read: Boolean(item.read || readAt),
    readAt,
    createdAt: item.created_at || item.createdAt || "",
    timeText: formatTime(item.created_at || item.createdAt),
  };
}

function summary(notifications) {
  const items = notifications.map(notificationView);
  return { notifications: items, unreadCount: items.filter((item) => !item.read).length };
}

async function refreshNotifications() {
  if (config.previewMode) return summary(previewNotifications());
  if (!currentSession()) return summary([]);
  try {
    const response = await request("/api/miniprogram/notifications");
    const result = summary(saveNotifications(Array.isArray(response.notifications) ? response.notifications : []));
    const serverUnread = Number(response.unreadCount);
    return { ...result, unreadCount: Number.isFinite(serverUnread) ? Math.max(0, serverUnread) : result.unreadCount };
  } catch (error) {
    const cached = storedNotifications();
    if (cached.length) return { ...summary(cached), error: error.message, source: "cache" };
    throw error;
  }
}

async function markNotificationRead(id) {
  if (!id) return refreshNotifications();
  if (config.previewMode) {
    const notifications = previewNotifications().map((item) => item.id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item);
    return summary(saveNotifications(notifications));
  }
  await request("/api/miniprogram/notifications", { method: "POST", data: { action: "read", id } });
  return refreshNotifications();
}

async function markAllNotificationsRead() {
  if (config.previewMode) {
    const readAt = new Date().toISOString();
    return summary(saveNotifications(previewNotifications().map((item) => ({ ...item, read_at: item.read_at || readAt }))));
  }
  if (!currentSession()) return summary([]);
  await request("/api/miniprogram/notifications", { method: "POST", data: { action: "read-all" } });
  return refreshNotifications();
}

async function syncNotificationBadge(unreadCount) {
  let count = unreadCount;
  if (typeof count !== "number") count = (await refreshNotifications()).unreadCount;
  try {
    if (count > 0) wx.setTabBarBadge({ index: 3, text: String(Math.min(count, 99)) });
    else wx.removeTabBarBadge({ index: 3 });
  } catch (error) {
    // Tab bar may not be ready during the earliest launch phase.
  }
  refreshCustomTabBar();
  return count;
}

module.exports = {
  markAllNotificationsRead,
  markNotificationRead,
  notificationView,
  refreshNotifications,
  syncNotificationBadge,
};
