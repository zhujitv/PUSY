import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("交易闭环包含库存流水、运单轨迹和完整售后字段", async () => {
  const [migration, schema] = await Promise.all([
    read("db/migrations/2026-07-30-zzzzzzz-commerce-closure.sql"),
    read("db/railway-postgres.sql"),
  ]);
  for (const source of [migration, schema]) {
    assert.match(source, /CREATE TABLE IF NOT EXISTS inventory_movements/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS shipments/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS shipment_events/);
    assert.match(source, /request_type TEXT NOT NULL DEFAULT 'refund'/);
    assert.match(source, /refund_id TEXT REFERENCES refunds/);
    assert.match(source, /inventory_restocked INTEGER NOT NULL DEFAULT 0/);
  }
});

test("付款取消、发货和退款都使用受控服务而非手工改状态", async () => {
  const [cancellation, logistics, payments, admin, permissions] = await Promise.all([
    read("lib/orders/cancellation.ts"),
    read("lib/logistics/service.ts"),
    read("lib/payments/service.ts"),
    read("app/api/admin/route.ts"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(cancellation, /createRefund\(payment\.id, refundable/);
  assert.match(cancellation, /releaseOrderReservation\(order\.id\)/);
  assert.match(logistics, /tracking_number/);
  assert.match(logistics, /notifyOrderShipped/);
  assert.match(payments, /restockCancelledPaidOrder/);
  assert.match(admin, /action === "ship-order"/);
  assert.match(admin, /action === "approve-return-refund"/);
  assert.match(permissions, /"approve-return-refund": "finance\.manage"/);
});

test("会员端物流、取消订单、自动通知和财务对账均已连接", async () => {
  const [accountApi, accountUi, notifications, reconciliation, exportRoute] = await Promise.all([
    read("app/api/account/route.ts"),
    read("app/account/AccountClient.tsx"),
    read("lib/notifications/business.ts"),
    read("lib/payments/reconciliation.ts"),
    read("app/api/admin/export/route.ts"),
  ]);
  assert.match(accountApi, /action === "cancel-order"/);
  assert.match(accountApi, /shipmentEvents/);
  assert.match(accountUi, /查询物流/);
  assert.match(notifications, /order-shipped:/);
  assert.match(notifications, /refund-completed:/);
  assert.match(reconciliation, /已支付但库存未确认/);
  assert.match(exportRoute, /"payment-reconciliation"/);
  assert.match(exportRoute, /"refund-reconciliation"/);
});
