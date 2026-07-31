import { getStoreDb } from "../../../db/store";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../lib/request-security";
import { createWebsiteSupportThread } from "../../../lib/support/service";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";

const categories = ["订单咨询", "商品咨询", "配送问题", "支付问题", "售后问题", "会员与账号", "隐私与数据", "其他问题"];
const contactPreferences = ["电话或短信", "微信", "电子邮箱"];

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "website-support", 8, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    if (String(payload.website ?? "").trim()) return Response.json({ ok: true }, { status: 201 });

    const name = String(payload.name ?? "").trim().slice(0, 60);
    const phone = String(payload.phone ?? "").trim().replace(/\s+/g, "");
    const category = String(payload.category ?? "").trim();
    const contactPreference = String(payload.contactPreference ?? "").trim();
    const wechat = String(payload.wechat ?? "").trim().slice(0, 60);
    const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
    const orderId = String(payload.orderId ?? "").trim().toUpperCase().slice(0, 64);
    const message = String(payload.message ?? "").trim().slice(0, 4000);

    if (!name || !categories.includes(category) || !contactPreferences.includes(contactPreference) || message.length < 10) return Response.json({ error: "请完整填写姓名、问题类型、联系方式和问题说明" }, { status: 400 });
    if (category === "售后问题") return Response.json({ error: "请在在线客服表单中验证下单邮箱并选择交易订单后提交售后申请" }, { status: 409 });
    if (!/^1[3-9]\d{9}$/.test(phone)) return Response.json({ error: "请输入有效的中国大陆手机号码" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "电子邮箱格式不正确，或留空使用手机联系" }, { status: 400 });
    if (contactPreference === "微信" && !wechat) return Response.json({ error: "选择微信联系时请填写微信号" }, { status: 400 });
    if (contactPreference === "电子邮箱" && !email) return Response.json({ error: "选择电子邮箱联系时请填写邮箱" }, { status: 400 });
    if (orderId && !/^PUSY-\d{8}-[A-Z0-9]{6,20}$/.test(orderId)) return Response.json({ error: "订单号格式不正确，或留空提交一般咨询" }, { status: 400 });

    const db = await getStoreDb();
    const viewer = await getPreviewMemberIdentity();
    const order = viewer && orderId ? await db.prepare("SELECT id, member_id FROM orders WHERE upper(id) = ? AND member_id = ? LIMIT 1").bind(orderId, viewer.memberId).first<{ id: string; member_id: number | null }>() : null;
    const threadId = await createWebsiteSupportThread({
      name,
      phone,
      wechat,
      email,
      category,
      contactPreference,
      orderId: order?.id ?? null,
      memberId: viewer?.memberId ?? null,
      message,
      submittedOrderId: orderId,
    });
    return Response.json({ ok: true, id: threadId, message: "客服工单已提交，我们会按你选择的方式尽快联系。" }, { status: 201 });
  } catch {
    return safeServerError("提交客服工单失败，请稍后再试");
  }
}
