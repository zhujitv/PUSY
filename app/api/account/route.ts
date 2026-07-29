import { ensureMember } from "../../../db/member-account";
import { getStoreDb } from "../../../db/store";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { ensureMemberProfile } from "../../../db/member-profile";
import { hasTrustedOrigin, safeServerError } from "../../../lib/request-security";

const genderValues = new Set(["", "female", "male", "undisclosed"]);
const skinTypeValues = new Set(["", "normal", "dry", "oily", "combination", "sensitive"]);
const skinConcernValues = new Set(["补水保湿", "控油净肤", "敏感修护", "提亮肤色", "抗老紧致", "痘肌护理"]);
const categoryValues = new Set(["彩妆", "护肤", "身体护理", "头发护理", "眉妆", "配件"]);

function text(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function selected(value: unknown, allowed: Set<string>) {
  return Array.isArray(value) ? value.map(String).filter((item) => allowed.has(item)) : [];
}

function validBirthday(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > new Date().toISOString().slice(0, 10)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function identity() {
  return getPreviewMemberIdentity();
}

export async function GET() {
  try {
    const viewer = await identity();
    if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401 });
    const member = await ensureMember(viewer);
    await ensureMemberProfile(member.id);
    const db = await getStoreDb();
    const [profile, addresses, orders, orderItems, returns] = await Promise.all([
      db.prepare("SELECT * FROM member_profiles WHERE member_id = ?").bind(member.id).first(),
      db.prepare("SELECT * FROM member_addresses WHERE member_id = ? ORDER BY is_default DESC, id DESC").bind(member.id).all(),
      db.prepare("SELECT o.*, COUNT(oi.id) AS item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.member_id = ? GROUP BY o.id ORDER BY o.created_at DESC").bind(member.id).all(),
      db.prepare("SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.member_id = ? ORDER BY oi.id").bind(member.id).all(),
      db.prepare("SELECT r.* FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.member_id = ? ORDER BY r.created_at DESC").bind(member.id).all(),
    ]);
    return Response.json({ member, profile, addresses: addresses.results, orders: orders.results, orderItems: orderItems.results, returns: returns.results, canSignOut: true });
  } catch {
    return safeServerError("读取会员资料失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    const viewer = await identity();
    if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401 });
    const member = await ensureMember(viewer);
    if (member.status === "blocked") return Response.json({ error: "该会员账户已停用" }, { status: 403 });
    await ensureMemberProfile(member.id);
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = await getStoreDb();
    if (action === "update-profile") {
      const name = text(payload.name, 50);
      const phone = text(payload.phone, 20);
      if (!name || !/^\+?[0-9\s-]{6,20}$/.test(phone)) return Response.json({ error: "请填写姓名和有效手机号码" }, { status: 400 });
      const nickname = text(payload.nickname, 30);
      const gender = text(payload.gender, 20);
      const birthday = text(payload.birthday, 10);
      const skinType = text(payload.skinType, 20);
      if (!genderValues.has(gender) || !skinTypeValues.has(skinType)) return Response.json({ error: "个人资料选项无效" }, { status: 400 });
      if (!validBirthday(birthday)) return Response.json({ error: "请填写有效的出生日期" }, { status: 400 });
      const skinConcerns = selected(payload.skinConcerns, skinConcernValues);
      const preferredCategories = selected(payload.preferredCategories, categoryValues);
      await db.batch([
        db.prepare("UPDATE members SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, phone, member.id),
        db.prepare(`UPDATE member_profiles SET nickname = ?, gender = ?, birthday = ?, wechat = ?, province = ?, city = ?, occupation = ?, skin_type = ?, skin_concerns = ?, preferred_categories = ?, bio = ?, email_marketing = ?, sms_marketing = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?`).bind(nickname, gender, birthday, text(payload.wechat, 50), text(payload.province, 30), text(payload.city, 30), text(payload.occupation, 50), skinType, JSON.stringify(skinConcerns), JSON.stringify(preferredCategories), text(payload.bio, 200), payload.emailMarketing ? 1 : 0, payload.smsMarketing ? 1 : 0, member.id),
      ]);
    } else if (action === "save-address") {
      const values = ["label", "recipient", "phone", "province", "city", "district", "detail", "postcode"].map((key) => String(payload[key] ?? "").trim());
      const [label, recipient, phone, province, city, district, detail, postcode] = values;
      if (!recipient || !phone || !province || !city || !detail) return Response.json({ error: "请完整填写收件人、电话和地址" }, { status: 400 });
      const id = Number(payload.id ?? 0);
      const wantsDefault = Boolean(payload.isDefault);
      const count = await db.prepare("SELECT COUNT(*) AS count FROM member_addresses WHERE member_id = ?").bind(member.id).first<{ count: number }>();
      const isDefault = wantsDefault || !count?.count;
      if (isDefault) await db.prepare("UPDATE member_addresses SET is_default = 0 WHERE member_id = ?").bind(member.id).run();
      if (id) {
        const result = await db.prepare("UPDATE member_addresses SET label = ?, recipient = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, postcode = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(label || "家", recipient, phone, province, city, district, detail, postcode, isDefault ? 1 : 0, id, member.id).run();
        if (!result.meta.changes) return Response.json({ error: "未找到该收货地址" }, { status: 404 });
      } else {
        await db.prepare("INSERT INTO member_addresses (member_id, label, recipient, phone, province, city, district, detail, postcode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(member.id, label || "家", recipient, phone, province, city, district, detail, postcode, isDefault ? 1 : 0).run();
      }
    } else if (action === "set-default-address") {
      const id = Number(payload.id);
      await db.batch([db.prepare("UPDATE member_addresses SET is_default = 0 WHERE member_id = ?").bind(member.id), db.prepare("UPDATE member_addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(id, member.id)]);
    } else if (action === "delete-address") {
      const id = Number(payload.id);
      const address = await db.prepare("SELECT is_default FROM member_addresses WHERE id = ? AND member_id = ?").bind(id, member.id).first<{ is_default: number }>();
      if (!address) return Response.json({ error: "未找到该收货地址" }, { status: 404 });
      await db.prepare("DELETE FROM member_addresses WHERE id = ? AND member_id = ?").bind(id, member.id).run();
      if (address.is_default) await db.prepare("UPDATE member_addresses SET is_default = 1 WHERE id = (SELECT id FROM member_addresses WHERE member_id = ? ORDER BY id DESC LIMIT 1)").bind(member.id).run();
    } else return Response.json({ error: "未知操作" }, { status: 400 });
    return Response.json({ ok: true });
  } catch {
    return safeServerError("保存会员资料失败，请稍后再试");
  }
}
