import { getStoreDb } from "./store";

export type AccountIdentity = { email: string; displayName: string };

export async function ensureMember(identity: AccountIdentity) {
  const db = await getStoreDb();
  const email = identity.email.trim().toLowerCase();
  await db.prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, '') ON CONFLICT(email) DO UPDATE SET name = CASE WHEN members.name = '' THEN excluded.name ELSE members.name END, updated_at = CURRENT_TIMESTAMP").bind(identity.displayName, email).run();
  const member = await db.prepare("SELECT * FROM members WHERE email = ? LIMIT 1").bind(email).first<{ id: number; name: string; email: string; phone: string; status: string; total_orders: number; total_spent: number; joined_at: string }>();
  if (!member) throw new Error("无法建立会员档案");
  await db.prepare("UPDATE orders SET member_id = ? WHERE member_id IS NULL AND lower(email) = ?").bind(member.id, email).run();
  await db.prepare("UPDATE members SET total_orders = (SELECT COUNT(*) FROM orders WHERE member_id = ? AND status NOT IN ('待付款','支付失败','已取消')), total_spent = COALESCE((SELECT SUM(total) FROM orders WHERE member_id = ? AND status NOT IN ('待付款','支付失败','已取消')), 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(member.id, member.id, member.id).run();
  return (await db.prepare("SELECT * FROM members WHERE id = ?").bind(member.id).first<typeof member>()) ?? member;
}
