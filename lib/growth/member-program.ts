import { getStoreDb } from "../../db/store";
import { MEMBER_TASK_POINTS } from "./member-program-rules";
export { MEMBER_TASK_POINTS } from "./member-program-rules";

type TaskAward = { member_id: number; points: number; balance_after: number };
type DateParts = { year: number; month: number; day: number; key: string };

function chinaDateParts(date = new Date()): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return { year, month, day, key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function previousDateKey(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function storedFromYuan(yuan: number) {
  return Math.round(yuan / 0.12);
}

function taskReference(taskKey: string, periodKey: string) {
  return `${taskKey}:${periodKey}`.slice(0, 180);
}

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

export async function memberGrowthSummary(memberId: number, origin: string) {
  await Promise.all([syncProfileCompletionTask(memberId), syncReviewTasks(memberId), syncFirstOrderTask(memberId), syncAnnualBenefits(memberId)]);
  const db = await getStoreDb();
  const today = chinaDateParts();
  const [member, completions, referrals, grants] = await Promise.all([
    db.prepare("SELECT m.joined_at, m.tier, p.birthday FROM members m LEFT JOIN member_profiles p ON p.member_id = m.id WHERE m.id = ? LIMIT 1").bind(memberId).first<{ joined_at: string; tier: string; birthday: string }>(),
    db.prepare("SELECT task_key, period_key, points, metadata_json, completed_at FROM member_task_completions WHERE member_id = ? ORDER BY completed_at DESC LIMIT 200").bind(memberId).all<{ task_key: string; period_key: string; points: number; metadata_json: string; completed_at: string }>(),
    db.prepare("SELECT status, COUNT(*)::INTEGER AS count FROM member_referrals WHERE referrer_member_id = ? GROUP BY status").bind(memberId).all<{ status: string; count: number }>(),
    db.prepare("SELECT benefit_key, benefit_year, granted_at FROM member_benefit_grants WHERE member_id = ? ORDER BY benefit_year DESC").bind(memberId).all<{ benefit_key: string; benefit_year: number; granted_at: string }>(),
  ]);
  if (!member) throw new Error("会员不存在");
  const code = await ensureReferralCode(memberId);
  const completed = new Set(completions.results.map((item) => item.task_key));
  const todayCheckin = completions.results.find((item) => item.task_key === "daily_checkin" && item.period_key === today.key);
  let streak = 0;
  try { streak = Number(JSON.parse(todayCheckin?.metadata_json ?? "{}").streak ?? 0); } catch { streak = 0; }
  const rewardedInvites = referrals.results.find((item) => item.status === "rewarded")?.count ?? 0;
  const pendingInvites = referrals.results.find((item) => item.status === "registered")?.count ?? 0;
  const currentGrants = new Set(grants.results.filter((item) => item.benefit_year === today.year).map((item) => item.benefit_key));
  const joined = chinaDateParts(new Date(member.joined_at));
  const membershipYears = Math.max(0, today.year - joined.year);
  return {
    tasks: [
      { key: "daily_checkin", title: "每日签到", description: "每天签到获得 5 积分，连续 7 天额外获得 15 积分", points: MEMBER_TASK_POINTS.dailyCheckin, completed: Boolean(todayCheckin), repeatable: true },
      { key: "complete_profile", title: "完善会员资料", description: "完善基本资料、联系电话与美妆档案", points: MEMBER_TASK_POINTS.completeProfile, completed: completed.has("complete_profile") },
      { key: "first_order", title: "完成会员首单", description: "首次成功付款后自动发放", points: MEMBER_TASK_POINTS.firstOrder, completed: completed.has("first_order") },
      { key: "first_review", title: "发表首次评价", description: "评价审核通过后自动发放", points: MEMBER_TASK_POINTS.firstReview, completed: completed.has("first_review") },
      { key: "photo_review", title: "上传首次图片评价", description: "评价图片审核通过后自动发放", points: MEMBER_TASK_POINTS.photoReview, completed: completed.has("photo_review") },
      { key: "successful_referral", title: "邀请好友完成首单", description: "每位好友首单完成后可重复获得奖励", points: MEMBER_TASK_POINTS.successfulReferral, completed: rewardedInvites > 0, repeatable: true, count: rewardedInvites },
    ],
    checkin: { completedToday: Boolean(todayCheckin), streak },
    referral: { code, link: `${origin}/account/login?ref=${encodeURIComponent(code)}`, pending: pendingInvites, rewarded: rewardedInvites, friendReward: MEMBER_TASK_POINTS.referredFirstOrder, inviterReward: MEMBER_TASK_POINTS.successfulReferral },
    benefits: [
      { key: "birthday_coupon", title: "生日礼券", description: "生日月自动发放满 99 元减 20 元礼券", configured: Boolean(member.birthday), granted: currentGrants.has("birthday_coupon") },
      { key: "anniversary_coupon", title: "会员周年礼", description: membershipYears ? `本年度为加入 PÚSY CLUB 第 ${membershipYears} 周年` : "加入满一年后，每年周年月自动发放礼券", configured: true, granted: currentGrants.has("anniversary_coupon") },
      { key: "new_product_access", title: "新品优先体验", description: "金卡及以上会员享有新品优先体验资格", configured: true, granted: ["gold", "diamond"].includes(member.tier) },
      { key: "exclusive_bundle", title: "会员专属套装", description: "钻石会员可参与专属套装与限量活动", configured: true, granted: member.tier === "diamond" },
    ],
  };
}
