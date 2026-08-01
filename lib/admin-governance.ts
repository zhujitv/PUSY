import { getStoreDb } from "../db/store";
import type { AdminIdentity } from "./admin-auth";
import { requestIp } from "./request-security";

export async function recordAdminAudit(input: {
  request: Request;
  actor: AdminIdentity;
  action: string;
  entityId?: string;
  summary?: string;
}) {
  const db = await getStoreDb();
  const row = await db.prepare("INSERT INTO admin_audit_logs (admin_id, actor_email, actor_role, action, entity_id, summary, request_ip, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, 'attempted') RETURNING id")
    .bind(input.actor.id, input.actor.email, input.actor.role, input.action.slice(0, 80), (input.entityId ?? "").slice(0, 160), (input.summary ?? "").slice(0, 500), requestIp(input.request).slice(0, 120))
    .first<{ id: number }>();
  if (!row) throw new Error("无法建立后台审计记录");
  return row.id;
}

export async function completeAdminAudit(id: number, outcome: "succeeded" | "failed", error = "") {
  const db = await getStoreDb();
  await db.prepare("UPDATE admin_audit_logs SET outcome = ?, error_text = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(outcome, error.slice(0, 500), id)
    .run();
}

export function auditEntityId(payload: Record<string, unknown>) {
  if (Array.isArray(payload.ids)) return payload.ids.map((id) => String(id)).slice(0, 20).join(",");
  return String(payload.id ?? payload.orderId ?? payload.paymentId ?? payload.memberId ?? payload.code ?? payload.key ?? "").trim();
}

export function auditSummary(action: string, payload: Record<string, unknown>) {
  const status = String(payload.status ?? "").trim();
  const count = Array.isArray(payload.ids) ? payload.ids.length : 0;
  if (action === "bulk-update-order-status") return `批量更新 ${count} 个订单为${status}`;
  if (status) return `更新状态为${status}`;
  if (action === "create-refund") return "发起订单退款";
  if (action === "adjust-member-wallet") return `调整会员余额 ${String(payload.amountYuan ?? "")} 元：${String(payload.reason ?? "")}`;
  if (action === "create-admin-user") return "创建后台管理员";
  if (action === "reset-admin-password") return "重置后台管理员密码";
  if (action === "manage-support-threads") return `客服工单批量操作：${String(payload.operation ?? "")}`;
  if (action === "update-product-inventory") return `更新商品库存为 ${String(payload.stock ?? "")}`;
  return action;
}
