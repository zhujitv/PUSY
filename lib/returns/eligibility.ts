const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

export const returnRequestTypes = {
  refund: "退货退款",
  exchange: "换货",
  reship: "漏发 / 错发补寄",
} as const;

export const returnReasons = {
  "seven-day-no-reason": "七日无理由退货",
  quality: "商品存在质量问题",
  damaged: "运输破损",
  "wrong-item": "收到错误商品",
  "missing-item": "商品漏发",
  other: "其他售后问题",
} as const;

export type ReturnRequestType = keyof typeof returnRequestTypes;
export type ReturnReason = keyof typeof returnReasons;

export function isReturnRequestType(value: string): value is ReturnRequestType {
  return Object.hasOwn(returnRequestTypes, value);
}

export function isReturnReason(value: string): value is ReturnReason {
  return Object.hasOwn(returnReasons, value);
}

export type NoReasonWindow = {
  eligible: boolean;
  state: "eligible" | "expired" | "not-delivered" | "invalid";
  deadline: string | null;
  deadlineLabel: string;
};

export function sevenDayNoReasonWindow(deliveredAt: string | null, now = new Date()): NoReasonWindow {
  if (!deliveredAt) return { eligible: false, state: "not-delivered", deadline: null, deadlineLabel: "尚未记录签收时间" };
  const delivered = new Date(deliveredAt);
  if (!Number.isFinite(delivered.getTime()) || delivered.getTime() > now.getTime()) return { eligible: false, state: "invalid", deadline: null, deadlineLabel: "签收时间待客服确认" };

  const chinaDelivered = new Date(delivered.getTime() + CHINA_OFFSET_MS);
  const deadline = new Date(Date.UTC(
    chinaDelivered.getUTCFullYear(),
    chinaDelivered.getUTCMonth(),
    chinaDelivered.getUTCDate() + 8,
  ) - CHINA_OFFSET_MS);
  const deadlineLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(deadline.getTime() - 1));
  const eligible = now.getTime() < deadline.getTime();
  return { eligible, state: eligible ? "eligible" : "expired", deadline: deadline.toISOString(), deadlineLabel: eligible ? `可在 ${deadlineLabel} 24:00 前发起` : `七日窗口已于 ${deadlineLabel} 结束` };
}
