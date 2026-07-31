import test from "node:test";
import assert from "node:assert/strict";
import { sevenDayNoReasonWindow } from "../lib/returns/eligibility.ts";

test("七日窗口从中国时区签收次日起按自然日计算", () => {
  const delivered = "2026-08-01T06:30:00.000Z"; // 中国时间 8 月 1 日 14:30
  const beforeDeadline = sevenDayNoReasonWindow(delivered, new Date("2026-08-08T15:59:59.999Z"));
  const atDeadline = sevenDayNoReasonWindow(delivered, new Date("2026-08-08T16:00:00.000Z"));
  assert.equal(beforeDeadline.eligible, true);
  assert.equal(beforeDeadline.deadline, "2026-08-08T16:00:00.000Z");
  assert.equal(atDeadline.eligible, false);
  assert.equal(atDeadline.state, "expired");
});

test("没有有效签收时间时不自动认定七日无理由资格", () => {
  assert.equal(sevenDayNoReasonWindow(null).state, "not-delivered");
  assert.equal(sevenDayNoReasonWindow("invalid").state, "invalid");
});
