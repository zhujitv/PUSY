import test from "node:test";
import assert from "node:assert/strict";
import { readSource as read } from "./helpers/read-source.mjs";

test("会员余额使用独立账户、冻结额和不可变账本", async () => {
  const [migration, wallet] = await Promise.all([
    read("db/migrations/2026-08-01-zzzz-member-wallet.sql"),
    read("lib/wallet/payment-allocation.ts"),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS member_wallets/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS member_wallet_ledger/);
  assert.match(migration, /idempotency_key TEXT NOT NULL UNIQUE/);
  assert.match(wallet, /Math\.min\(input\.order\.totalFen/);
  assert.match(wallet, /available_balance_fen = available_balance_fen - \?/);
  assert.match(wallet, /frozen_balance_fen = frozen_balance_fen \+ \?/);
  assert.match(wallet, /wallet_status = 'captured'/);
  assert.match(wallet, /wallet_status = 'released'/);
});

test("余额支付必须验证独立支付密码并限制失败次数", async () => {
  const [secret, security, api] = await Promise.all([
    read("lib/auth/member-secrets.ts"),
    read("lib/wallet/security.ts"),
    read("app/api/account/wallet/route.ts"),
  ]);
  assert.match(secret, /PBKDF2/);
  assert.match(secret, /310_000/);
  assert.match(security, /支付密码不能与账户密码相同/);
  assert.match(security, /账户密码不能与支付密码相同/);
  assert.match(security, /password_failed_attempts \+ 1 >= 5/);
  assert.match(security, /INTERVAL '30 minutes'/);
  assert.match(api, /sendVerificationEmail/);
  assert.match(api, /getPreviewMemberIdentity/);
});

test("支付按余额优先拆分且渠道只收剩余金额", async () => {
  const [lifecycle, route, checkout] = await Promise.all([
    read("lib/payments/payment-lifecycle.ts"),
    read("app/api/payments/route.ts"),
    read("app/checkout/page.tsx"),
  ]);
  assert.match(lifecycle, /amountFen: payment\.external_amount_fen/);
  assert.match(lifecycle, /payment\.external_amount_fen === 0/);
  assert.match(lifecycle, /captureWalletPayment/);
  assert.match(route, /paymentPassword/);
  assert.match(checkout, /账户余额优先/);
  assert.match(checkout, /完成组合支付/);
  assert.match(checkout, /前往财务中心设置支付密码/);
});

test("退款按支付来源拆分并把余额部分退回账户", async () => {
  const [refunds, walletRefund] = await Promise.all([
    read("lib/payments/refund-lifecycle.ts"),
    read("lib/wallet/refunds.ts"),
  ]);
  assert.match(refunds, /LEAST\(\?, GREATEST\(p\.external_amount_fen/);
  assert.match(refunds, /amountFen: refund\.external_amount_fen/);
  assert.match(refunds, /creditWalletRefund/);
  assert.match(walletRefund, /wallet_credited = 1/);
  assert.match(walletRefund, /'refund'/);
});

test("会员和后台均提供余额管理入口", async () => {
  const [account, admin, permissions] = await Promise.all([
    read("app/account/AccountFinancePanel.tsx"),
    read("app/admin/AdminPaymentComponents.tsx"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(account, /账户余额/);
  assert.match(account, /支付与账户安全/);
  assert.match(account, /余额明细/);
  assert.match(admin, /会员账户余额/);
  assert.match(admin, /调整余额/);
  assert.match(permissions, /"adjust-member-wallet": "finance\.manage"/);
});
