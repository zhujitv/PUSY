import { getStoreDb } from "../../../db/store";
import { chinaRegion } from "../../../lib/china-region";
import { enqueueNotification } from "../../../lib/notifications/service";

const cooperationTypes = ["线下门店", "电商平台", "区域经销", "企业采购", "其他合作"];

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (String(payload.website ?? "").trim()) return Response.json({ ok: true }, { status: 201 });

    const contactName = String(payload.contactName ?? "").trim().slice(0, 40);
    const phone = String(payload.phone ?? "").trim().replace(/\s+/g, "");
    const company = String(payload.company ?? "").trim().slice(0, 100);
    const city = String(payload.city ?? "").trim().slice(0, 60);
    const cooperationType = String(payload.cooperationType ?? "").trim();
    const wechat = String(payload.wechat ?? "").trim().slice(0, 60);
    const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 120);
    const proposal = String(payload.proposal ?? "").trim().slice(0, 1500);

    if (!contactName || !company || !city || !proposal || !cooperationTypes.includes(cooperationType)) {
      return Response.json({ error: "请完整填写联系人、公司、城市、合作类型和合作方案" }, { status: 400 });
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) return Response.json({ error: "请输入有效的中国大陆手机号码" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "邮箱格式不正确，或留空仅使用手机联系" }, { status: 400 });

    const id = `PR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const db = await getStoreDb();
    await db.prepare("INSERT INTO retail_partnerships (id, contact_name, phone, company, city, cooperation_type, wechat, email, proposal, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '待联系')")
      .bind(id, contactName, phone, company, city, cooperationType, wechat, email, proposal)
      .run();
    const notificationPayload = { applicationId: id, contactName, phone, company, city, cooperationType };
    await Promise.all([
      enqueueNotification({
        eventKey: `retail-partnership-internal:${id}`,
        entityType: "retail_partnership",
        entityId: id,
        templateKey: "retail_partnership_internal",
        email: chinaRegion.supportEmail,
        phone: /^1[3-9]\d{9}$/.test(chinaRegion.customerServicePhone) ? chinaRegion.customerServicePhone : undefined,
        payload: notificationPayload,
      }),
      enqueueNotification({
        eventKey: `retail-partnership-confirmation:${id}`,
        entityType: "retail_partnership",
        entityId: id,
        templateKey: "retail_partnership_confirmation",
        email: email || undefined,
        phone,
        payload: notificationPayload,
      }),
    ]).catch(() => undefined);
    return Response.json({ ok: true, id, message: "合作申请已提交，我们会通过手机或微信与您联系。" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "提交失败，请稍后再试" }, { status: 500 });
  }
}
