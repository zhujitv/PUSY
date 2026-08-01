import { getStoreDb } from "../../db/store";
import { chinaDateParts, storedFromYuan } from "./member-program-shared";

async function grantAnnualCoupon(input: { memberId: number; benefitKey: string; year: number; prefix: string; valueYuan: number; minimumYuan: number; endsAt: string; label: string }) {
  const db = await getStoreDb();
  const code = `${input.prefix}${input.year}${String(input.memberId).padStart(5, "0")}`;
  return db.prepare(`
    WITH grant_row AS (
      INSERT INTO member_benefit_grants (member_id, benefit_key, benefit_year, metadata_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (member_id, benefit_key, benefit_year) DO NOTHING
      RETURNING id
    ), coupon_row AS (
      INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, assignment_mode, starts_at, ends_at)
      SELECT ?, 'fixed', ?, ?, 1, 'active', 'targeted', CURRENT_TIMESTAMP, ? FROM grant_row
      ON CONFLICT (code) DO NOTHING
      RETURNING id
    ), linked AS (
      UPDATE member_benefit_grants g SET coupon_id = c.id
      FROM coupon_row c, grant_row r WHERE g.id = r.id RETURNING c.id
    )
    INSERT INTO coupon_assignments (coupon_id, member_id)
    SELECT id, ? FROM linked ON CONFLICT DO NOTHING
    RETURNING coupon_id
  `).bind(input.memberId, input.benefitKey, input.year, JSON.stringify({ label: input.label }), code, storedFromYuan(input.valueYuan), storedFromYuan(input.minimumYuan), input.endsAt, input.memberId).first<{ coupon_id: number }>();
}

export async function syncAnnualBenefits(memberId: number) {
  const db = await getStoreDb();
  const member = await db.prepare(`SELECT m.joined_at, m.tier, p.birthday FROM members m
    LEFT JOIN member_profiles p ON p.member_id = m.id WHERE m.id = ? LIMIT 1`).bind(memberId).first<{ joined_at: string; tier: string; birthday: string }>();
  if (!member) return;
  const now = chinaDateParts();
  const endsAt = new Date(Date.UTC(now.year, now.month, 1, 15, 59, 59)).toISOString();
  if (member.birthday && Number(member.birthday.slice(5, 7)) === now.month) {
    await grantAnnualCoupon({ memberId, benefitKey: "birthday_coupon", year: now.year, prefix: "BDAY", valueYuan: 20, minimumYuan: 99, endsAt, label: "生日礼券" });
  }
  const joined = chinaDateParts(new Date(member.joined_at));
  const years = now.year - joined.year;
  if (years >= 1 && joined.month === now.month) {
    await grantAnnualCoupon({ memberId, benefitKey: "anniversary_coupon", year: now.year, prefix: "ANNI", valueYuan: 30, minimumYuan: 199, endsAt, label: `${years} 周年礼券` });
  }
}
