import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";

test("community launch state stays truthful without advertising empty metrics", async () => {
  const [community, social] = await Promise.all([
    read("app/community/page.tsx"),
    read("lib/community/social.ts"),
  ]);

  assert.match(community, /showCommunityCounts = memberCount >= 12 && approvedPostCount >= 12/);
  assert.match(community, /真实分享/);
  assert.match(community, /审核公开/);
  assert.match(community, /写下你的灵感/);
  assert.match(community, /从一次真实体验开始/);
  assert.doesNotMatch(community, /BE THE FIRST|第一篇分享/);
  assert.match(social, /HAVING COUNT\(DISTINCT p\.id\) FILTER \(WHERE p\.status = 'approved'\) > 0/);
});

test("public payment guidance matches wallet-first split payments", async () => {
  const [payment, faq, terms] = await Promise.all([
    read("app/payment/page.tsx"),
    read("app/faq/page.tsx"),
    read("app/oferta/page.tsx"),
  ]);

  for (const source of [payment, faq, terms]) {
    assert.match(source, /账户余额/);
    assert.match(source, /组合支付/);
    assert.match(source, /支付密码/);
  }
  assert.match(payment, /支付密码不能与账户登录密码相同/);
  assert.match(terms, /不能与账户登录密码相同/);
});

test("homepage defers the Russian third-party video player behind Chinese controls", async () => {
  const [home, localizedVideo, css] = await Promise.all([
    readFile(new URL("../app/HomeClient.tsx", import.meta.url), "utf8"),
    read("app/components/LocalizedReelVideo.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(home, /LocalizedReelVideo/);
  assert.doesNotMatch(home, /<iframe/);
  assert.match(localizedVideo, /playing \?/);
  assert.match(localizedVideo, /播放短片/);
  assert.match(localizedVideo, /点击后加载视频/);
  assert.match(localizedVideo, /runtime\.strm\.yandex\.ru\/player\/video/);
  assert.match(localizedVideo, /nativeui=true&share=false/);
  assert.doesNotMatch(localizedVideo, /autoplay/);
  assert.match(css, /\.reel-video-trigger/);
});
