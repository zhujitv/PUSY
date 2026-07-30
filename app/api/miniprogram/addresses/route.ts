import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

function text(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-addresses", 20, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const recipient = text(payload.recipient, 50);
    const phone = text(payload.phone, 20).replace(/[\s-]/g, "");
    const province = text(payload.province, 30);
    const city = text(payload.city, 30);
    const district = text(payload.district, 30);
    const detail = text(payload.detail, 200);
    const postcode = text(payload.postcode, 12);
    if (!recipient || !/^1[3-9]\d{9}$/.test(phone) || !province || !city || !detail) return Response.json({ error: "请完整填写收件人、中国大陆手机号和收货地址" }, { status: 400 });
    if (postcode && !/^\d{6}$/.test(postcode)) return Response.json({ error: "请填写 6 位邮政编码" }, { status: 400 });
    const db = await getStoreDb();
    const current = await db.prepare("SELECT id FROM member_addresses WHERE member_id = ? AND is_default = 1 ORDER BY id DESC LIMIT 1").bind(viewer.memberId).first<{ id: number }>();
    if (current) {
      await db.prepare("UPDATE member_addresses SET label = '家', recipient = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, postcode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(recipient, phone, province, city, district, detail, postcode, current.id, viewer.memberId).run();
    } else {
      await db.prepare("UPDATE member_addresses SET is_default = 0 WHERE member_id = ?").bind(viewer.memberId).run();
      await db.prepare("INSERT INTO member_addresses (member_id, label, recipient, phone, province, city, district, detail, postcode, is_default) VALUES (?, '家', ?, ?, ?, ?, ?, ?, ?, 1)").bind(viewer.memberId, recipient, phone, province, city, district, detail, postcode).run();
    }
    const address = await db.prepare("SELECT id, label, recipient, phone, province, city, district, detail, postcode, is_default, updated_at FROM member_addresses WHERE member_id = ? AND is_default = 1 ORDER BY id DESC LIMIT 1").bind(viewer.memberId).first<Record<string, unknown>>();
    return Response.json({ ok: true, address }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return safeServerError("保存收货地址失败，请稍后再试");
  }
}
