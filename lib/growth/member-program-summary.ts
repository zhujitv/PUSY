import { getStoreDb } from "../../db/store";
import { MEMBER_TASK_POINTS } from "./member-program-rules";
import { syncAnnualBenefits } from "./member-program-benefits";
import { ensureReferralCode } from "./member-program-referrals";
import { chinaDateParts } from "./member-program-shared";
import { syncFirstOrderTask, syncProfileCompletionTask, syncReviewTasks } from "./member-program-tasks";

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
