import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createGiftCardCode } from "../lib/gift-cards.ts";
import { roleCan } from "../lib/admin-permissions.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

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
