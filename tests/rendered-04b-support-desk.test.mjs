import assert from "node:assert/strict";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


test("customer inbox links verified order replies, returns and protected attachments", async () => {
  const [supportAdmin, admin, adminApi, webhook, attachmentApi, returnApi, supportService, email, migration, managementMigration, env] = await Promise.all([
    read("app/admin/SupportAdmin.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("app/api/notifications/webhooks/resend/route.ts"),
    read("app/api/admin/support/attachment/route.ts"),
    read("app/api/returns/route.ts"),
    read("lib/support/service.ts"),
    read("lib/notifications/email.ts"),
    read("db/migrations/2026-07-30-support-inbox.sql"),
    read("db/migrations/2026-07-30-support-inbox-management.sql"),
    read(".env.example"),
  ]);
  assert.match(admin, /客服收件箱/);
  assert.match(supportAdmin, /订单 .*order_status/);
  assert.match(supportAdmin, /售后处理记录/);
  assert.match(adminApi, /reply-support-thread/);
  assert.match(adminApi, /open-linked-support-thread/);
  assert.match(adminApi, /manage-support-threads/);
  assert.match(adminApi, /delete-permanent/);
  assert.match(supportAdmin, /收件箱/);
  assert.match(supportAdmin, /已归档/);
  assert.match(supportAdmin, /垃圾箱/);
  assert.match(supportAdmin, /永久删除/);
  assert.match(webhook, /request\.text\(\)/);
  assert.match(webhook, /new Webhook\(secret\)\.verify/);
  assert.match(webhook, /email\.received/);
  assert.match(attachmentApi, /getAdminIdentity/);
  assert.match(attachmentApi, /attachments_json/);
  assert.match(returnApi, /createWebsiteReturnCase/);
  assert.match(supportService, /lower\(email\) = \?/);
  assert.match(supportService, /In-Reply-To/);
  assert.match(supportAdmin, /requestId: crypto\.randomUUID\(\)/);
  assert.match(supportService, /support-reply-\$\{normalizedRequestId\}/);
  assert.match(supportService, /CURRENT_TIMESTAMP::TEXT/);
  assert.doesNotMatch(supportService, /COALESCE\(first_responded_at, CURRENT_TIMESTAMP\)/);
  assert.match(supportService, /ensureLinkedSupportThread/);
  assert.match(supportService, /订单 .*建立客户邮件沟通/);
  assert.match(admin, /邮件联系客户/);
  assert.match(admin, /查看并回复/);
  assert.match(email, /reply_to/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_threads/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_messages/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS return_events/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS starred/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS archived_at/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS deleted_at/);
  assert.match(env, /RESEND_RECEIVING_API_KEY/);
  assert.match(env, /RESEND_INBOUND_DOMAIN/);
});

test("support desk provides account assignment, SLA tracking and customer 360 context", async () => {
  const [supportAdmin, adminApi, supportService, migration, schema, css] = await Promise.all([
    read("app/admin/SupportAdmin.tsx"),
    read("app/api/admin/route.ts"),
    read("lib/support/service.ts"),
    read("db/migrations/2026-07-31-support-sla-customer360.sql"),
    read("db/railway-postgres.sql"),
    read("app/globals.css"),
  ]);
  assert.match(supportAdmin, /客服 SLA 概览/);
  assert.match(supportAdmin, /客户 360/);
  assert.match(supportAdmin, /name="assignedAdminId"/);
  assert.match(supportAdmin, /最近订单/);
  assert.match(supportAdmin, /售后记录/);
  assert.match(adminApi, /role IN \('owner','operations','customer_service'\)/);
  assert.match(adminApi, /supportCustomerOrders/);
  assert.match(adminApi, /supportCustomerReturns/);
  assert.match(adminApi, /所选负责人不存在、已停用或没有客服权限/);
  assert.match(supportService, /first_responded_at = COALESCE\(first_responded_at, CURRENT_TIMESTAMP::TEXT\)/);
  assert.match(supportService, /reopened_count/);
  assert.match(migration, /first_response_due_at/);
  assert.match(migration, /resolution_due_at/);
  assert.match(schema, /support_threads_assignee_idx/);
  assert.doesNotMatch(supportAdmin, /<footer>/);
  assert.match(css, /@container support-admin/);
  assert.match(css, /@container support-conversation/);
  assert.match(css, /support-reply-actions/);
});
