import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function GET(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    const db = await getStoreDb();
    const notifications = await db.prepare("SELECT id, notification_type, title, body, link, read_at, created_at FROM member_notifications WHERE member_id = ? AND created_at::timestamp <= CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 100").bind(viewer.memberId).all<Record<string, unknown>>();
    const unread = await db.prepare("SELECT COUNT(*) AS count FROM member_notifications WHERE member_id = ? AND read_at IS NULL AND created_at::timestamp <= CURRENT_TIMESTAMP").bind(viewer.memberId).first<{ count: number | string }>();
    const items = notifications.results.map((item) => ({ ...item, read: Boolean(item.read_at) }));
    return Response.json({ notifications: items, unreadCount: Number(unread?.count || 0) }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return safeServerError("读取消息中心失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-notifications", 60, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = await getStoreDb();
    if (action === "read-all") {
      await db.prepare("UPDATE member_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE member_id = ? AND created_at::timestamp <= CURRENT_TIMESTAMP").bind(viewer.memberId).run();
    } else if (action === "read") {
      const id = String(payload.id ?? "").trim().slice(0, 80);
      if (!id) return Response.json({ error: "消息参数无效" }, { status: 400 });
      const result = await db.prepare("UPDATE member_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND member_id = ? AND created_at::timestamp <= CURRENT_TIMESTAMP").bind(id, viewer.memberId).run();
      if (!result.meta.changes) return Response.json({ error: "未找到这条消息" }, { status: 404 });
    } else return Response.json({ error: "消息操作无效" }, { status: 400 });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return safeServerError("更新消息状态失败，请稍后再试");
  }
}
