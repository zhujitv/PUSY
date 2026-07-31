import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("退换货合并到在线客服并支持验证后多订单选择", async () => {
  const [contact, contactPage, returnPage, account, returnsApi, supportApi] = await Promise.all([
    read("app/contact/ContactForm.tsx"),
    read("app/contact/page.tsx"),
    read("app/return/page.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/api/returns/route.ts"),
    read("app/api/support/route.ts"),
  ]);
  assert.match(contact, /category === "售后问题"/);
  assert.match(contact, /action: "lookup-orders"/);
  assert.match(contact, /action: "request-order-code"/);
  assert.match(contact, /action: "verify-order-code"/);
  assert.match(contact, /selectedReturnOrder/);
  assert.match(contact, /选择需要售后的商品/);
  assert.match(contact, /action: "submit-return"/);
  assert.match(contactPage, /咨询与退换货共用一个入口/);
  assert.doesNotMatch(returnPage, /ReturnForm/);
  assert.match(returnPage, /contact\?category=售后问题/);
  assert.match(account, /contact\?category=/);
  assert.match(returnsApi, /listOrders/);
  assert.match(supportApi, /category === "售后问题"/);
  assert.match(supportApi, /验证下单邮箱并选择交易订单/);
});

test("售后查单使用会员会话或邮箱验证码而不是裸邮箱", async () => {
  const [returnsApi, verification, memberAccount] = await Promise.all([
    read("app/api/returns/route.ts"),
    read("lib/notifications/verification-email.ts"),
    read("db/member-account.ts"),
  ]);
  assert.match(returnsApi, /getPreviewMemberIdentity/);
  assert.match(returnsApi, /ensureMember/);
  assert.match(memberAccount, /UPDATE orders SET member_id/);
  assert.match(returnsApi, /return-order-lookup/);
  assert.match(returnsApi, /return-order-access/);
  assert.match(returnsApi, /HttpOnly; SameSite=Lax; Max-Age=1800/);
  assert.match(returnsApi, /code_hash !== await sha256/);
  assert.match(returnsApi, /const ownership = identity\.memberId \? "o\.member_id = \?" : "lower\(o\.email\) = \?"/);
  assert.match(verification, /emailConfigured/);
  assert.match(verification, /sendEmail/);
  assert.doesNotMatch(returnsApi, /phone\s*=\s*\?\s+OR/i);
});

test("七日无理由按中国时区签收次日起算且不阻断质量售后", async () => {
  const [eligibility, returnsApi, contact] = await Promise.all([
    read("lib/returns/eligibility.ts"),
    read("app/api/returns/route.ts"),
    read("app/contact/ContactForm.tsx"),
  ]);
  assert.match(eligibility, /CHINA_OFFSET_MS/);
  assert.match(eligibility, /getUTCDate\(\) \+ 8/);
  assert.match(returnsApi, /s\.delivered_at/);
  assert.match(returnsApi, /if \(reasonKey === "seven-day-no-reason"\)/);
  assert.match(returnsApi, /sealedConditionConfirmed/);
  assert.match(contact, /系统识别时间窗口不代表自动批准/);
  assert.match(contact, /质量问题、错发、漏发或运输破损不受七日无理由时间窗口的单独限制/);
});

test("售后记录、客服工单、事件和邮件回复保持关联", async () => {
  const [service, returnsApi, notifications, admin] = await Promise.all([
    read("lib/support/service.ts"),
    read("app/api/returns/route.ts"),
    read("lib/notifications/service.ts"),
    read("app/admin/AdminClient.tsx"),
  ]);
  assert.match(service, /createWebsiteReturnCase/);
  assert.match(service, /INSERT INTO returns/);
  assert.match(service, /'returns'/);
  assert.match(service, /customer_phone, customer_wechat/);
  assert.match(service, /INSERT INTO return_events/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(returnsApi, /notifyReturnUpdated/);
  assert.match(notifications, /job\.entity_type === "return" && payload\.returnId/);
  assert.match(notifications, /supportReplyAddress\(\{ returnId: payload\.returnId \}\)/);
  assert.match(admin, /returnItemSummary/);
});
