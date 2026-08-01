import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { createGiftCardCode } from "../lib/gift-cards.ts";
import { roleCan } from "../lib/admin-permissions.ts";
import { hasTrustedOrigin } from "../lib/request-origin.ts";
import { supportSlaDeadlines } from "../lib/support/sla.ts";
import { readSource as read } from "./helpers/read-source.mjs";

const root = new URL("../", import.meta.url);

test("数据库迁移顺序会先创建客服基础表，并使用校验台账", async () => {
  const files = (await readdir(new URL("db/migrations/", root))).filter((file) => file.endsWith(".sql")).sort();
  assert.ok(files.indexOf("2026-07-30-00-support-inbox.sql") < files.indexOf("2026-07-30-support-inbox-management.sql"));
  const runner = await read("scripts/migrate-db.mjs");
  assert.match(runner, /schema_migrations/);
  assert.match(runner, /createHash\("sha256"\)/);
  assert.match(runner, /client\.query\("BEGIN"\)/);
  assert.match(runner, /pg_advisory_lock/);
  assert.match(runner, /已执行的迁移文件发生变化/);
});

test("礼品卡使用完整 UUID 熵且公开校验不返回内部卡号", async () => {
  const orders = await read("app/api/orders/route.ts");
  const giftCards = await read("lib/gift-cards.ts");
  const validation = await read("app/api/promotions/validate/route.ts");
  const generated = new Set(Array.from({ length: 1000 }, () => createGiftCardCode()));
  assert.equal(generated.size, 1000);
  for (const code of generated) assert.match(code, /^PUSY-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
  assert.match(giftCards, /randomUUID\(\)\.replaceAll\("-", ""\)/);
  assert.match(orders, /createGiftCardCode\(\)/);
  assert.doesNotMatch(giftCards, /slice\(0, 8\)/);
  assert.match(validation, /promotionType === "gift-card" \? "" : result\.code/);
  assert.doesNotMatch(validation, /Response\.json\(result/);
});

test("客服表单只按已登录会员身份关联订单", async () => {
  const support = await read("app/api/support/route.ts");
  assert.match(support, /getPreviewMemberIdentity/);
  assert.match(support, /member_id = \?/);
  assert.match(support, /viewer\.memberId/);
  assert.doesNotMatch(support, /phone = \? OR/);
});

test("客服 SLA 按优先级生成首响和解决时限", () => {
  const start = "2026-07-31T00:00:00.000Z";
  assert.deepEqual(supportSlaDeadlines("urgent", start), {
    firstResponseDueAt: "2026-07-31T01:00:00.000Z",
    resolutionDueAt: "2026-07-31T04:00:00.000Z",
  });
  assert.deepEqual(supportSlaDeadlines("normal", start), {
    firstResponseDueAt: "2026-07-31T08:00:00.000Z",
    resolutionDueAt: "2026-08-02T00:00:00.000Z",
  });
});

test("管理员会话、手机号身份和仓库权限均已加固", async () => {
  const adminAuth = await read("lib/admin-auth.ts");
  const permissions = await read("lib/admin-permissions.ts");
  const memberAuth = await read("app/api/account/auth/route.ts");
  const migration = await read("db/migrations/2026-07-30-zzzz-identity-hardening.sql");
  assert.match(adminAuth, /session_version/);
  assert.match(adminAuth, /parsed\.version/);
  assert.match(memberAuth, /phone_verified = 1/);
  assert.match(memberAuth, /purpose = 'verify-phone'/);
  assert.match(migration, /members_phone_unique_idx/);
  assert.equal(roleCan("warehouse", "products.manage"), false);
  assert.equal(roleCan("warehouse", "products.inventory.manage"), true);
  assert.equal(roleCan("warehouse", "orders.fulfill"), true);
  assert.match(permissions, /warehouse: \["orders\.read", "orders\.fulfill", "products\.read", "products\.inventory\.manage"\]/);
  assert.doesNotMatch(permissions, /warehouse: \[[^\]]*products\.manage/);
});

test("后台操作先写审计意图，并记录成功或失败结果", async () => {
  const adminApi = await read("app/api/admin/route.ts");
  const governance = await read("lib/admin-governance.ts");
  assert.match(adminApi, /auditId = await recordAdminAudit/);
  assert.match(adminApi, /completeAdminAudit\(auditId, "succeeded"\)/);
  assert.match(adminApi, /completeAdminAudit\(auditId, "failed"/);
  assert.doesNotMatch(adminApi, /audit failed/);
  assert.match(governance, /outcome.*attempted/);
});

test("后台按当前模块加载数据，而不是一次读取全部业务表", async () => {
  const adminApi = await read("app/api/admin/route.ts");
  const adminUi = await read("app/admin/AdminClient.tsx");
  assert.match(adminApi, /searchParams\.get\("view"\)/);
  assert.match(adminApi, /wants\("support"\)/);
  assert.match(adminApi, /wants\("payments"\)/);
  assert.match(adminUi, /\/api\/admin\?view=/);
  assert.match(adminUi, /load\(next\)/);
});

test("安全审计修复覆盖会员关联、认证限流、支付同步与私有缓存", async () => {
  const [orders, requestSecurity, adminAuth, adminLogin, adminLoginUi, memberAuth, paymentApi, paymentUi, accountApi, config, proxy, ignore] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("lib/request-security.ts"),
    read("lib/admin-auth.ts"),
    read("app/api/admin/auth/route.ts"),
    read("app/admin/login/AdminLoginClient.tsx"),
    read("app/api/account/auth/route.ts"),
    read("app/api/payments/route.ts"),
    read("app/checkout/payment/PaymentClient.tsx"),
    read("app/api/account/route.ts"),
    read("next.config.ts"),
    read("proxy.ts"),
    read(".gitignore"),
  ]);

  assert.match(orders, /const memberId = viewer\?\.memberId \?\? null/);
  assert.doesNotMatch(orders, /SELECT id FROM members WHERE email/);
  assert.doesNotMatch(orders, /INSERT INTO members/);
  assert.match(requestSecurity, /allowRequestForIdentity/);
  assert.match(requestSecurity, /private, no-store/);
  assert.match(adminAuth, /ADMIN_PASSWORD \?\? ""\)\.length >= 12/);
  assert.match(adminAuth, /export function legacyAdminConfigured/);
  assert.match(adminLogin, /admin-login-account/);
  assert.match(adminLogin, /request\.formData\(\)/);
  assert.match(adminLogin, /status: 303/);
  assert.match(adminLoginUi, /method="post" action="\/api\/admin\/auth"/);
  assert.match(memberAuth, /member-code-target-10m/);
  assert.match(memberAuth, /member-code-target-day/);
  assert.doesNotMatch(memberAuth, /已经注册，请直接登录/);
  assert.match(paymentApi, /payload\.action === "sync"/);
  assert.match(paymentApi, /sync-payment-order/);
  assert.doesNotMatch(paymentApi, /searchParams\.get\("sync"\)/);
  assert.match(paymentUi, /action: "sync"/);
  assert.match(accountApi, /privateJson\(\{ error: "请先登录会员账户"/);
  assert.doesNotMatch(config, /sri:/);
  assert.match(proxy, /matcher: \["\/admin\/:path\*", "\/account\/:path\*", "\/community\/:path\*"\]/);
  assert.match(proxy, /nonce-\$\{nonce\}/);
  assert.match(proxy, /Referrer-Policy", "no-referrer"/);
  assert.doesNotMatch(proxy, /script-src[^;]*unsafe-inline/);
  assert.match(ignore, /project\.private\.config\.json/);
});

test("后台登录在 Vercel 转发主机和 PUSY 主域之间仍能校验同源", () => {
  assert.equal(hasTrustedOrigin(new Request("https://deployment.vercel.app/api/admin/auth", {
    headers: { origin: "https://pusy.cn", "x-forwarded-host": "pusy.cn" },
  })), true);
  assert.equal(hasTrustedOrigin(new Request("https://pusy.cn/api/admin/auth", {
    headers: { origin: "https://www.pusy.cn" },
  })), true);
  assert.equal(hasTrustedOrigin(new Request("https://deployment.vercel.app/api/admin/auth", {
    headers: { origin: "https://pusy.cn", "sec-fetch-site": "same-origin" },
  })), true);
  assert.equal(hasTrustedOrigin(new Request("https://internal-runtime.local/api/admin/auth", {
    headers: { origin: "null", "sec-fetch-site": "same-origin" },
  })), true);
  assert.equal(hasTrustedOrigin(new Request("https://pusy.cn/api/admin/auth", {
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  })), false);
});
