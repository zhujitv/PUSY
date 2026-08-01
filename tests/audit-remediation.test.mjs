import test from "node:test";
import assert from "node:assert/strict";
import {
  clearOAuthStateCookie,
  createOAuthStateCookie,
  oauthStateMatchesBrowser,
} from "../lib/auth/oauth-state.ts";
import {
  decodeCommunityPostCursor,
  encodeCommunityPostCursor,
} from "../lib/community/post-cursor.ts";
import { publicPageMetadata } from "../lib/site-metadata.ts";
import { readSource as read } from "./helpers/read-source.mjs";

test("OAuth state Cookie 只接受发起授权的同一浏览器", () => {
  const state = "a".repeat(64);
  const cookie = createOAuthStateCookie(state);
  assert.match(cookie, /^pusy-oauth-state=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(oauthStateMatchesBrowser(cookie, state), true);
  assert.equal(oauthStateMatchesBrowser(cookie, "b".repeat(64)), false);
  assert.equal(oauthStateMatchesBrowser("", state), false);
  assert.match(clearOAuthStateCookie(), /Max-Age=0/);
});

test("社区复合游标保持排序类型并拒绝篡改输入", () => {
  const cursor = {
    version: 1,
    sort: "popular",
    placement: 1,
    followsAuthor: 0,
    followsTopic: 1,
    promotionRank: 9,
    commentCount: 8,
    likeCount: 12,
    bookmarkCount: 3,
    time: "2026-08-01T08:00:00.000Z",
    id: "PST-ABCDEF123456",
  };
  const encoded = encodeCommunityPostCursor(cursor);
  assert.deepEqual(decodeCommunityPostCursor(encoded, "popular"), cursor);
  assert.equal(decodeCommunityPostCursor(encoded, "latest"), null);
  assert.equal(decodeCommunityPostCursor(`${encoded}!`, "popular"), null);
  assert.equal(decodeCommunityPostCursor(Buffer.from("{}").toString("base64url"), "popular"), null);
});

test("通知任务使用原子领取且改密注销其他会员会话", async () => {
  const [notifications, memberAuth, walletRoute] = await Promise.all([
    read("lib/notifications/service.ts"),
    read("lib/preview-member-auth.ts"),
    read("app/api/account/wallet/route.ts"),
  ]);
  assert.match(notifications, /UPDATE notification_jobs[\s\S]+status = 'processing'[\s\S]+RETURNING \*/);
  assert.match(notifications, /status IN \('queued', 'failed'\)/);
  assert.match(notifications, /INTERVAL '15 minutes'/);
  assert.match(memberAuth, /DELETE FROM member_sessions WHERE member_id = \? AND token_hash != \?/);
  assert.match(walletRoute, /revokeOtherMemberSessions\(viewer\.memberId\)/);
});

test("公开页面元数据生成独立 canonical", () => {
  const metadata = publicPageMetadata("/delivery", "配送说明", "配送详情");
  assert.equal(metadata.alternates?.canonical, "https://pusy.cn/delivery");
  assert.equal(metadata.openGraph?.url, "https://pusy.cn/delivery");
});
