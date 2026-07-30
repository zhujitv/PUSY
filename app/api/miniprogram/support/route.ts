import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";
import { createWebsiteSupportThread } from "../../../../lib/support/service";

const categories = ["订单咨询", "商品咨询", "配送问题", "支付问题", "售后问题", "会员与账号", "其他问题"];
const contactPreferences = ["微信", "电话或短信", "电子邮箱"];

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-support", 8, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const name = String(payload.name ?? "").trim().slice(0, 60);
    const phone = String(payload.phone ?? "").replace(/\s|-/g, "");
    const wechat = String(payload.wechat ?? "").trim().slice(0, 60);
    const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
    const category = String(payload.category ?? "").trim();
    const contactPreference = String(payload.contactPreference ?? "").trim();
    const submittedOrderId = String(payload.orderId ?? "").trim().toUpperCase().slice(0, 64);
    const message = String(payload.message ?? "").trim().slice(0, 4000);
    if (!name || !categories.includes(category) || !contactPreferences.includes(contactPreference) || message.length < 10) return Response.json({ error: "请完整填写姓名、问题类型和问题说明" }, { status: 400 });
    if (!/^1[3-9]\d{9}$/.test(phone)) return Response.json({ error: "请输入有效的中国大陆手机号码" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "电子邮箱格式不正确" }, { status: 400 });
    if (contactPreference === "微信" && !wechat) return Response.json({ error: "选择微信联系时请填写微信号" }, { status: 400 });
    if (contactPreference === "电子邮箱" && !email) return Response.json({ error: "选择电子邮箱联系时请填写邮箱" }, { status: 400 });
    const db = await getStoreDb();
    const order = submittedOrderId
      ? await db.prepare("SELECT id FROM orders WHERE upper(id) = ? AND member_id = ? LIMIT 1").bind(submittedOrderId, viewer.memberId).first<{ id: string }>()
      : null;
    const threadId = await createWebsiteSupportThread({
      name,
      phone,
      wechat,
      email,
      category,
      contactPreference,
      orderId: order?.id ?? null,
      memberId: viewer.memberId,
      message,
      submittedOrderId,
    });
    return Response.json({ ok: true, id: threadId, status: "已提交", message: "客服工单已提交" }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return safeServerError("提交客服工单失败，请稍后再试");
  }
}
