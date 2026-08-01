import { getStoreDb } from "../../db/store";
import { MEMBER_TASK_POINTS } from "./member-program-rules";
import { completeMemberTask, syncFirstOrderTask } from "./member-program-tasks";

function randomReferralCode() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `PUSY${Array.from(bytes, (value) => (value % 36).toString(36)).join("").toUpperCase()}`;
}

export async function ensureReferralCode(memberId: number) {
  const db = await getStoreDb();
  const existing = await db.prepare("SELECT code FROM member_referral_codes WHERE member_id = ? LIMIT 1").bind(memberId).first<{ code: string }>();
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomReferralCode();
    const created = await db.prepare("INSERT INTO member_referral_codes (member_id, code) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING code").bind(memberId, code).first<{ code: string }>();
    if (created) return created.code;
    const winner = await db.prepare("SELECT code FROM member_referral_codes WHERE member_id = ? LIMIT 1").bind(memberId).first<{ code: string }>();
    if (winner) return winner.code;
  }
  throw new Error("邀请码生成失败");
}

export async function registerReferral(referredMemberId: number, rawCode: string) {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!code) return null;
  const db = await getStoreDb();
  const referrer = await db.prepare("SELECT member_id FROM member_referral_codes WHERE code = ? LIMIT 1").bind(code).first<{ member_id: number }>();
  if (!referrer || referrer.member_id === referredMemberId) return null;
  return db.prepare(`INSERT INTO member_referrals (referrer_member_id, referred_member_id, referral_code)
    VALUES (?, ?, ?) ON CONFLICT (referred_member_id) DO NOTHING RETURNING id`).bind(referrer.member_id, referredMemberId, code).first<{ id: number }>();
}

export async function rewardReferralForPaidOrder(orderId: string) {
  const db = await getStoreDb();
  const referral = await db.prepare(`SELECT r.id, r.referrer_member_id, r.referred_member_id
    FROM member_referrals r JOIN orders o ON o.member_id = r.referred_member_id
    JOIN payments p ON p.order_id = o.id AND p.status IN ('paid','partially_refunded')
    WHERE o.id = ? AND r.status = 'registered' LIMIT 1`).bind(orderId).first<{ id: number; referrer_member_id: number; referred_member_id: number }>();
  if (!referral) return null;
  await completeMemberTask({ memberId: referral.referrer_member_id, taskKey: "successful_referral", periodKey: String(referral.referred_member_id), points: MEMBER_TASK_POINTS.successfulReferral, reason: "邀请好友完成首单奖励", referenceId: `referral:${referral.id}:referrer` });
  await completeMemberTask({ memberId: referral.referred_member_id, taskKey: "referred_first_order", points: MEMBER_TASK_POINTS.referredFirstOrder, reason: "受邀会员首单奖励", referenceId: `referral:${referral.id}:referred` });
  await db.prepare("UPDATE member_referrals SET status = 'rewarded', qualifying_order_id = ?, rewarded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'registered'").bind(orderId, referral.id).run();
  return referral;
}

export async function syncPaidOrderGrowth(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare("SELECT member_id FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ member_id: number | null }>();
  if (!order?.member_id) return;
  await syncFirstOrderTask(order.member_id, orderId);
  await rewardReferralForPaidOrder(orderId);
}
