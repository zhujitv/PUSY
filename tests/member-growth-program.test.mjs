import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MEMBER_TASK_POINTS } from "../lib/growth/member-program-rules.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("会员任务奖励数值明确且邀请双方均有奖励", () => {
  assert.equal(MEMBER_TASK_POINTS.dailyCheckin, 5);
  assert.equal(MEMBER_TASK_POINTS.sevenDayBonus, 15);
  assert.equal(MEMBER_TASK_POINTS.completeProfile, 30);
  assert.equal(MEMBER_TASK_POINTS.firstReview, 20);
  assert.equal(MEMBER_TASK_POINTS.photoReview, 30);
  assert.equal(MEMBER_TASK_POINTS.successfulReferral, 100);
  assert.equal(MEMBER_TASK_POINTS.referredFirstOrder, 50);
});

test("会员增长迁移包含任务、邀请、年度权益及图片评价字段", async () => {
  const migration = await read("db/migrations/2026-07-31-z-member-growth-program.sql");
  for (const table of ["member_task_completions", "member_referral_codes", "member_referrals", "member_benefit_grants"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /UNIQUE \(member_id, task_key, period_key\)/);
  assert.match(migration, /referred_member_id INTEGER NOT NULL UNIQUE/);
  assert.match(migration, /images_json TEXT NOT NULL DEFAULT '\[\]'/);
});

test("注册、支付与评价审核都接入自动发奖链路", async () => {
  const [auth, payments, admin, reviews] = await Promise.all([
    read("app/api/account/auth/route.ts"),
    read("lib/payments/service.ts"),
    read("app/api/admin/route.ts"),
    read("app/api/reviews/route.ts"),
  ]);
  assert.match(auth, /registerReferral/);
  assert.match(payments, /syncPaidOrderGrowth/);
  assert.match(admin, /syncReviewTasks/);
  assert.match(reviews, /images_json/);
  assert.match(reviews, /400_000/);
});

test("会员中心包含签到、任务、邀请二维码和年度权益", async () => {
  const [account, qr] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/api/account/referral-qr/route.ts"),
  ]);
  assert.match(account, /会员任务中心/);
  assert.match(account, /daily-checkin/);
  assert.match(account, /邀请好友奖励/);
  assert.match(account, /本年度会员权益/);
  assert.match(qr, /QRCode\.toBuffer/);
  assert.match(qr, /getPreviewMemberIdentity/);
});
