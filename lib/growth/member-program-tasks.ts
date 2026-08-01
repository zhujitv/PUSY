import { getStoreDb } from "../../db/store";
import { MEMBER_TASK_POINTS } from "./member-program-rules";
import { chinaDateParts, previousDateKey, taskReference, type TaskAward } from "./member-program-shared";

export async function completeMemberTask(input: {
  memberId: number;
  taskKey: string;
  periodKey?: string;
  points: number;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const periodKey = input.periodKey ?? "lifetime";
  const points = Math.max(0, Math.round(input.points));
  if (!Number.isInteger(input.memberId) || input.memberId < 1 || !input.taskKey || !points) return null;
  const referenceId = input.referenceId ?? taskReference(input.taskKey, periodKey);
  const db = await getStoreDb();
  const result = await db.prepare(`
    WITH completed AS (
      INSERT INTO member_task_completions (member_id, task_key, period_key, points, reference_id, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (member_id, task_key, period_key) DO NOTHING
      RETURNING member_id, task_key, period_key, points
    ), changed_member AS (
      UPDATE members m SET
        points_balance = m.points_balance + c.points,
        lifetime_points = m.lifetime_points + c.points,
        tier = CASE
          WHEN m.lifetime_points + c.points >= 5000 THEN 'diamond'
          WHEN m.lifetime_points + c.points >= 2000 THEN 'gold'
          WHEN m.lifetime_points + c.points >= 500 THEN 'silver'
          ELSE 'bronze'
        END,
        updated_at = CURRENT_TIMESTAMP
      FROM completed c WHERE m.id = c.member_id
      RETURNING m.id, m.points_balance
    )
    INSERT INTO member_points_ledger (member_id, points, balance_after, reason, reference_type, reference_id)
    SELECT c.member_id, c.points, m.points_balance, ?, 'task', ?
    FROM completed c JOIN changed_member m ON m.id = c.member_id
    ON CONFLICT (member_id, reference_type, reference_id) DO NOTHING
    RETURNING member_id, points, balance_after
  `).bind(input.memberId, input.taskKey, periodKey, points, referenceId, JSON.stringify(input.metadata ?? {}), input.reason.slice(0, 120), referenceId).first<TaskAward>();
  return result;
}

export async function dailyCheckin(memberId: number) {
  const db = await getStoreDb();
  const today = chinaDateParts();
  const latest = await db.prepare("SELECT period_key, metadata_json FROM member_task_completions WHERE member_id = ? AND task_key = 'daily_checkin' ORDER BY period_key DESC LIMIT 1").bind(memberId).first<{ period_key: string; metadata_json: string }>();
  let previousStreak = 0;
  try { previousStreak = Number(JSON.parse(latest?.metadata_json ?? "{}").streak ?? 0); } catch { previousStreak = 0; }
  const streak = latest?.period_key === previousDateKey(today.key) ? previousStreak + 1 : 1;
  const points = MEMBER_TASK_POINTS.dailyCheckin + (streak % 7 === 0 ? MEMBER_TASK_POINTS.sevenDayBonus : 0);
  const award = await completeMemberTask({ memberId, taskKey: "daily_checkin", periodKey: today.key, points, reason: streak % 7 === 0 ? `连续签到 ${streak} 天奖励` : "每日签到奖励", metadata: { streak } });
  if (!award) return { completed: false, streak: latest?.period_key === today.key ? Math.max(previousStreak, 1) : streak, points: 0, message: "今天已经签到" };
  return { completed: true, streak, points, message: streak % 7 === 0 ? `签到成功，连续 ${streak} 天，获得 ${points} 积分` : `签到成功，获得 ${points} 积分` };
}

export async function syncProfileCompletionTask(memberId: number) {
  const db = await getStoreDb();
  const profile = await db.prepare(`SELECT m.name, m.phone, p.nickname, p.birthday, p.province, p.city, p.skin_type
    FROM members m JOIN member_profiles p ON p.member_id = m.id WHERE m.id = ? LIMIT 1`).bind(memberId).first<Record<string, string | number>>();
  if (!profile) return null;
  const complete = Boolean(profile.name && profile.phone && profile.nickname && profile.birthday && profile.province && profile.city && profile.skin_type);
  if (!complete) return null;
  return completeMemberTask({ memberId, taskKey: "complete_profile", points: MEMBER_TASK_POINTS.completeProfile, reason: "完善会员资料奖励" });
}

export async function syncReviewTasks(memberId: number, reviewId?: number) {
  const db = await getStoreDb();
  const review = reviewId
    ? await db.prepare("SELECT id, images_json FROM product_reviews WHERE id = ? AND member_id = ? AND status = 'approved' LIMIT 1").bind(reviewId, memberId).first<{ id: number; images_json: string }>()
    : await db.prepare("SELECT id, images_json FROM product_reviews WHERE member_id = ? AND status = 'approved' ORDER BY created_at LIMIT 1").bind(memberId).first<{ id: number; images_json: string }>();
  if (!review) return [];
  const awards = [await completeMemberTask({ memberId, taskKey: "first_review", points: MEMBER_TASK_POINTS.firstReview, reason: "首次通过审核的评价奖励", referenceId: `first-review:${review.id}` })];
  let images: unknown[] = [];
  try { const parsed = JSON.parse(review.images_json || "[]"); images = Array.isArray(parsed) ? parsed : []; } catch { images = []; }
  if (images.length) awards.push(await completeMemberTask({ memberId, taskKey: "photo_review", points: MEMBER_TASK_POINTS.photoReview, reason: "首次图片评价奖励", referenceId: `photo-review:${review.id}` }));
  return awards.filter(Boolean);
}

export async function syncFirstOrderTask(memberId: number, orderId?: string) {
  const db = await getStoreDb();
  const order = orderId
    ? await db.prepare("SELECT o.id FROM orders o JOIN payments p ON p.order_id = o.id AND p.status IN ('paid','partially_refunded') WHERE o.id = ? AND o.member_id = ? LIMIT 1").bind(orderId, memberId).first<{ id: string }>()
    : await db.prepare("SELECT o.id FROM orders o JOIN payments p ON p.order_id = o.id AND p.status IN ('paid','partially_refunded') WHERE o.member_id = ? ORDER BY p.paid_at NULLS LAST, o.created_at LIMIT 1").bind(memberId).first<{ id: string }>();
  if (!order) return null;
  return completeMemberTask({ memberId, taskKey: "first_order", points: MEMBER_TASK_POINTS.firstOrder, reason: "会员首单奖励", referenceId: `first-order:${order.id}` });
}
