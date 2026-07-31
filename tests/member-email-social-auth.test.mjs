import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("会员注册和登录以邮箱验证码为主且手机号选填", async () => {
  const [client, route] = await Promise.all([
    read("app/account/login/MemberAuthClient.tsx"),
    read("app/api/account/auth/route.ts"),
  ]);
  assert.match(client, /手机号码（选填）/);
  assert.doesNotMatch(client, /name="phone"[^>]+required/);
  assert.match(client, /name="identifier" type="email"/);
  assert.match(client, /requiredFields = mode === "register" \? \["name", "email"\]/);
  assert.doesNotMatch(client, /form\.reportValidity\(\)/);
  assert.match(route, /\(phone && !phonePattern\.test\(phone\)\)/);
  assert.match(route, /WHERE lower\(email\) = \? AND email_verified = 1/);
  assert.doesNotMatch(route, /OR \(regexp_replace\(phone/);
  assert.match(route, /该邮箱已经注册，请切换到会员登录获取验证码/);
  assert.match(route, /verification delivery failed/);
  assert.doesNotMatch(route, /如资料可用于注册，验证码将发送至邮箱/);
});

test("微信和支付宝绑定使用独立表并且不保存授权令牌", async () => {
  const migration = await read("db/migrations/2026-07-31-zz-member-email-social-auth.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS member_social_accounts/);
  assert.match(migration, /UNIQUE \(member_id, provider\)/);
  assert.match(migration, /UNIQUE \(provider, provider_user_id\)/);
  assert.match(migration, /member_social_accounts_union_idx/);
  assert.doesNotMatch(migration, /access_token|refresh_token/i);
});

test("第三方授权具备短期哈希 state、会员校验和可解绑入口", async () => {
  const [start, callback, account, client, login] = await Promise.all([
    read("app/api/account/social/[provider]/route.ts"),
    read("app/api/account/social/[provider]/callback/route.ts"),
    read("app/api/account/route.ts"),
    read("app/account/AccountClient.tsx"),
    read("app/account/login/MemberAuthClient.tsx"),
  ]);
  assert.match(start, /sha256\(state\)/);
  assert.match(start, /10 \* 60_000/);
  assert.match(callback, /viewer\.memberId !== saved\.member_id/);
  assert.match(callback, /createMemberSession/);
  assert.match(account, /unlink-social/);
  assert.match(login, /注册后绑定（选填）/);
  assert.match(client, /确认解除/);
});

test("授权供应商使用官方 OAuth 入口并保持密钥只在服务端", async () => {
  const oauth = await read("lib/auth/social-oauth.ts");
  const example = await read(".env.example");
  assert.match(oauth, /open\.weixin\.qq\.com\/connect\/qrconnect/);
  assert.match(oauth, /openauth\.alipay\.com\/oauth2\/publicAppAuthorize\.htm/);
  assert.match(oauth, /api\.weixin\.qq\.com\/sns\/oauth2\/access_token/);
  assert.match(oauth, /alipay\.system\.oauth\.token/);
  assert.match(example, /WECHAT_OAUTH_APP_SECRET=/);
  assert.match(example, /ALIPAY_OAUTH_PRIVATE_KEY=/);
});
