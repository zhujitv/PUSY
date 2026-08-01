import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


test("admin workspace uses grouped navigation and responsive branded UI", async () => {
  const [admin, login, css] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/login/AdminLoginClient.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(admin, /adminNavGroups/);
  assert.match(admin, /经营/);
  assert.match(admin, /商品与内容/);
  assert.match(admin, /searchPlaceholders/);
  assert.match(admin, /掌握销售、订单、库存和客户服务/);
  assert.match(login, /统一经营工作台/);
  assert.match(login, /客服邮件与售后联动/);
  assert.match(css, /admin-nav-group/);
  assert.match(css, /admin-login-intro/);
  assert.match(css, /admin-loading i/);
});

test("admin governance enforces roles, audits changes and supports safe bulk fulfillment", async () => {
  const adminRouteUrl = new URL("../app/api/admin/route.ts", import.meta.url);
  const [admin, governanceUi, adminApi, adminRoute, permissions, auth, authApi, audit, exportApi, attachmentApi, migration, schema] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/AdminGovernance.tsx"),
    read("app/api/admin/route.ts"),
    readFile(adminRouteUrl, "utf8"),
    read("lib/admin-permissions.ts"),
    read("lib/admin-auth.ts"),
    read("app/api/admin/auth/route.ts"),
    read("lib/admin-governance.ts"),
    read("app/api/admin/export/route.ts"),
    read("app/api/admin/support/attachment/route.ts"),
    read("db/migrations/2026-07-30-zz-admin-governance.sql"),
    read("db/railway-postgres.sql"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_users/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_audit_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS admin_users/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS admin_audit_logs/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /PASSWORD_ITERATIONS = 210_000/);
  assert.match(auth, /createAdminPasswordHash/);
  assert.match(auth, /verifyAdminCredentials/);
  assert.match(auth, /legacyOwner/);
  assert.match(authApi, /recordAdminAudit/);
  assert.match(adminApi, /adminActionPermissions\[action\]/);
  assert.match(adminApi, /roleCan\(actor\.role, requiredPermission\)/);
  assert.match(adminApi, /currentAdminId|不能降级或停用当前登录账号/);
  assert.match(adminApi, /bulk-update-order-status/);
  assert.match(adminApi, /\.slice\(0, 100\)/);
  assert.match(adminApi, /尚未完成付款，不能批量进入履约状态/);
  assert.match(adminApi, /recordAdminAudit/);
  assert.doesNotMatch(adminApi, /password_hash.*results|password_salt.*results/);
  assert.match(audit, /requestIp\(input\.request\)/);
  assert.match(exportApi, /roleCan\(actor\.role, config\.permission\)/);
  assert.match(attachmentApi, /roleCan\(actor\.role, "support\.read"\)/);
  assert.match(admin, /账号与权限/);
  assert.match(admin, /操作日志/);
  assert.match(admin, /批量更新/);
  assert.match(governanceUi, /操作审计日志/);
  assert.match(governanceUi, /初始密码至少 12 位/);

  const handlerImports = [...adminRoute.matchAll(/import \{ (handle\w+Action) \} from "([^"]+)";/g)];
  const handlerSources = await Promise.all(handlerImports.map((match) => readFile(new URL(`${match[2]}.ts`, adminRouteUrl), "utf8")));
  const registeredHandlers = new Set([...adminRoute.matchAll(/^\s+(handle\w+Action),$/gm)].map((match) => match[1]));
  assert.deepEqual(handlerImports.map((match) => match[1]).filter((name) => !registeredHandlers.has(name)), []);
  const routeActions = new Set(handlerSources.flatMap((source) => [...source.matchAll(/action === "([^"]+)"/g)].map((match) => match[1])));
  const permissionActions = new Set([...permissions.matchAll(/^\s+"([^"]+)": "[^"]+",$/gm)].map((match) => match[1]));
  assert.deepEqual([...routeActions].filter((action) => !permissionActions.has(action)), []);
});

test("invoice workflow, upgraded support desk and business analytics are connected", async () => {
  const [account, accountApi, admin, businessAdmin, supportAdmin, adminApi, migration] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/api/account/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/admin/BusinessFeaturesAdmin.tsx"),
    read("app/admin/SupportAdmin.tsx"),
    read("app/api/admin/route.ts"),
    read("db/migrations/2026-07-30-workflows-and-analytics.sql"),
  ]);
  assert.match(account, /发票管理/);
  assert.match(account, /下载电子发票/);
  assert.match(accountApi, /request-invoice/);
  assert.match(admin, /经营分析/);
  assert.match(admin, /发票管理/);
  assert.match(businessAdmin, /订单成交率/);
  assert.match(businessAdmin, /热销商品排行/);
  assert.match(supportAdmin, /内部备注/);
  assert.match(supportAdmin, /快捷回复/);
  assert.match(supportAdmin, /处理时限/);
  assert.match(adminApi, /add-support-note/);
  assert.match(adminApi, /update-invoice/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS invoices/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_canned_replies/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS due_at/);
});

test("audit guards member identity, financial transitions and concurrent refunds", async () => {
  const [orders, shipping, accountApi, adminApi, adminUi, paymentApi, paymentService, reservations, returnsApi, exportApi, migration] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("lib/shipping.ts"),
    read("app/api/account/route.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/payments/route.ts"),
    read("lib/payments/service.ts"),
    read("lib/orders/reservations.ts"),
    read("app/api/returns/route.ts"),
    read("app/api/admin/export/route.ts"),
    read("db/migrations/2026-07-30-z-audit-integrity.sql"),
  ]);
  assert.doesNotMatch(orders, /ON CONFLICT\(email\) DO UPDATE SET name = excluded\.name, phone = excluded\.phone/);
  assert.match(orders, /const memberId = viewer\?\.memberId \?\? null/);
  assert.doesNotMatch(orders, /INSERT INTO members/);
  assert.doesNotMatch(orders, /SELECT id FROM members WHERE email/);
  assert.match(orders, /validGiftCardSlug/);
  assert.match(shipping, /gift-card-\(1000\|3000\|5000\|10000\)/);
  assert.doesNotMatch(accountApi, /SELECT \* FROM invoices WHERE member_id/);
  assert.match(accountApi, /cache-control.*private, no-store/);
  assert.doesNotMatch(accountApi, /UPDATE members SET name = \?, phone = \?/);
  assert.match(adminApi, /已支付订单不能直接取消/);
  assert.match(adminApi, /该状态由支付与退款系统自动维护/);
  assert.match(adminApi, /WITH refund_totals AS/);
  assert.match(adminApi, /\[api\/admin\] read failed/);
  assert.ok(adminApi.includes(String.raw`/^(https:\/\/|\/(?!\/))/.test(fileUrl)`));
  assert.match(adminUi, /orderStatusOptions/);
  assert.match(paymentApi, /status: 503, headers: \{ "set-cookie": paymentCookie\(orderId, token\)/);
  assert.match(paymentService, /pg_advisory_xact_lock/);
  assert.match(paymentService, /requireChanges\("退款金额超过可退余额"\)/);
  assert.match(reservations, /refreshOrderMemberTotals/);
  assert.match(returnsApi, /该订单当前不符合售后申请条件/);
  assert.match(exportApi, /private, no-store/);
  assert.match(migration, /status NOT IN \('待付款', '支付失败', '已取消', '已退款'\)/);
});
