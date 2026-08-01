import { legacyAdminConfigured } from "../../admin-auth";
import { ensureLinkedSupportThread, sendSupportReply } from "../../support/service";
import { supportSlaDeadlines, validSupportPriority } from "../../support/sla";

const supportStatuses = ["unread", "open", "pending", "resolved"];
const invoiceStatuses = ["pending", "processing", "issued", "rejected", "cancelled"];
const supportOperations = ["mark-read", "mark-unread", "star", "unstar", "archive", "unarchive", "trash", "restore", "delete-permanent"];
const partnershipStatuses = ["待联系", "洽谈中", "已合作", "已拒绝", "已关闭"];
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleSupportInvoiceAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db, actor } = context;
  if (action === "update-support-thread") {
      const status = String(payload.status ?? "");
      const priority = String(payload.priority ?? "normal");
      if (!supportStatuses.includes(status) || !validSupportPriority(priority)) return Response.json({ error: "工单状态或优先级无效" }, { status: 400 });
      const dueAt = String(payload.dueAt ?? "").trim();
      if (dueAt && Number.isNaN(Date.parse(dueAt))) return Response.json({ error: "处理时限无效" }, { status: 400 });
      const threadId = String(payload.id ?? "");
      const current = await db.prepare("SELECT id, status, priority, first_response_due_at, resolution_due_at, first_responded_at, resolved_at, reopened_count FROM support_threads WHERE id = ? AND deleted_at IS NULL LIMIT 1").bind(threadId).first<{ id: string; status: string; priority: string; first_response_due_at: string | null; resolution_due_at: string | null; first_responded_at: string | null; resolved_at: string | null; reopened_count: number }>();
      if (!current) return Response.json({ error: "客服工单不存在" }, { status: 404 });
      const assignedAdminId = String(payload.assignedAdminId ?? "").trim();
      let assignedTo: string | null = null;
      if (assignedAdminId) {
        if (assignedAdminId === "legacy-owner" && legacyAdminConfigured()) assignedTo = "主管理员";
        else {
          const assignee = await db.prepare("SELECT display_name, email FROM admin_users WHERE id = ? AND status = 'active' AND role IN ('owner','operations','customer_service') LIMIT 1").bind(assignedAdminId).first<{ display_name: string; email: string }>();
          if (!assignee) return Response.json({ error: "所选负责人不存在、已停用或没有客服权限" }, { status: 400 });
          assignedTo = assignee.display_name || assignee.email;
        }
      }
      const deadlines = supportSlaDeadlines(priority);
      const priorityChanged = current.priority !== priority;
      const firstRespondedAt = current.first_responded_at ?? (payload.firstResponded === "yes" ? new Date().toISOString() : null);
      const firstResponseDueAt = firstRespondedAt ? current.first_response_due_at : priorityChanged || !current.first_response_due_at ? deadlines.firstResponseDueAt : current.first_response_due_at;
      const resolutionDueAt = status === "resolved" ? current.resolution_due_at : current.status === "resolved" || priorityChanged || !current.resolution_due_at ? deadlines.resolutionDueAt : current.resolution_due_at;
      const resolvedAt = status === "resolved" ? current.resolved_at || new Date().toISOString() : null;
      const reopenedCount = Number(current.reopened_count || 0) + (current.status === "resolved" && status !== "resolved" ? 1 : 0);
      const result = await db.prepare("UPDATE support_threads SET status = ?, priority = ?, assigned_admin_id = ?, assigned_to = ?, due_at = ?, first_response_due_at = ?, first_responded_at = ?, resolution_due_at = ?, resolved_at = ?, reopened_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(status, priority, assignedAdminId || null, assignedTo, dueAt || null, firstResponseDueAt, firstRespondedAt, resolutionDueAt, resolvedAt, reopenedCount, threadId).run();
      if (!result.meta.changes) return Response.json({ error: "客服工单不存在" }, { status: 404 });
    } else if (action === "add-support-note") {
      const threadId = String(payload.id ?? "");
      const note = String(payload.note ?? "").trim().slice(0, 5000);
      if (!note) return Response.json({ error: "请填写内部备注" }, { status: 400 });
      const result = await db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body, headers_json) SELECT ?, id, 'system', 'internal_note', ?, customer_email, '内部备注', ?, ? FROM support_threads WHERE id = ? AND deleted_at IS NULL").bind(`MSG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, actor.email, note, JSON.stringify({ actor: actor.email }), threadId).run();
      if (!result.meta.changes) return Response.json({ error: "客服工单不存在" }, { status: 404 });
      await db.prepare("UPDATE support_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(threadId).run();
    } else if (action === "create-canned-reply") {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      const content = String(payload.content ?? "").trim().slice(0, 5000);
      if (!title || !content) return Response.json({ error: "请填写快捷回复名称和内容" }, { status: 400 });
      await db.prepare("INSERT INTO support_canned_replies (title, content) VALUES (?, ?)").bind(title, content).run();
    } else if (action === "delete-canned-reply") {
      await db.prepare("DELETE FROM support_canned_replies WHERE id = ?").bind(Number(payload.id)).run();
    } else if (action === "manage-support-threads") {
      const operation = String(payload.operation ?? "");
      const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id)).filter((id) => /^TKT-[A-Z0-9]{6,32}$/.test(id)))].slice(0, 200);
      if (!supportOperations.includes(operation) || !ids.length) return Response.json({ error: "请选择有效的邮件操作和工单" }, { status: 400 });
      if (operation === "delete-permanent" && payload.confirm !== "DELETE") return Response.json({ error: "永久删除需要再次确认" }, { status: 400 });
      const statements = ids.map((id) => operation === "mark-read"
        ? db.prepare("UPDATE support_threads SET status = CASE WHEN status = 'unread' THEN 'open' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
        : operation === "mark-unread"
          ? db.prepare("UPDATE support_threads SET status = 'unread', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
          : operation === "star"
            ? db.prepare("UPDATE support_threads SET starred = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
            : operation === "unstar"
              ? db.prepare("UPDATE support_threads SET starred = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
              : operation === "archive"
                ? db.prepare("UPDATE support_threads SET archived_at = CURRENT_TIMESTAMP, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                : operation === "unarchive"
                  ? db.prepare("UPDATE support_threads SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
                  : operation === "trash"
                    ? db.prepare("UPDATE support_threads SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                    : operation === "restore"
                      ? db.prepare("UPDATE support_threads SET deleted_at = NULL, archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                      : db.prepare("DELETE FROM support_threads WHERE id = ? AND deleted_at IS NOT NULL").bind(id));
      await db.batch(statements);
    } else if (action === "reply-support-thread") {
      await sendSupportReply(String(payload.id), String(payload.message ?? ""), actor, String(payload.requestId ?? ""));
    } else if (action === "open-linked-support-thread") {
      const threadId = await ensureLinkedSupportThread({ orderId: String(payload.orderId ?? ""), returnId: String(payload.returnId ?? ""), actor });
      payload.id = threadId;
      return Response.json({ ok: true, threadId });
    } else if (action === "update-invoice") {
      const status = String(payload.status ?? "");
      const invoiceNumber = String(payload.invoiceNumber ?? "").trim().slice(0, 100);
      const fileUrl = String(payload.fileUrl ?? "").trim().slice(0, 1000);
      const rejectionReason = String(payload.rejectionReason ?? "").trim().slice(0, 1000);
      const adminNote = String(payload.adminNote ?? "").trim().slice(0, 2000);
      if (!invoiceStatuses.includes(status)) return Response.json({ error: "发票状态无效" }, { status: 400 });
      if (status === "issued" && (!invoiceNumber || !(/^(https:\/\/|\/(?!\/))/.test(fileUrl)))) return Response.json({ error: "已开具发票需要填写发票号码和安全下载地址" }, { status: 400 });
      if (status === "rejected" && !rejectionReason) return Response.json({ error: "请填写驳回原因" }, { status: 400 });
      const result = await db.prepare("UPDATE invoices SET status = ?, invoice_number = ?, file_url = ?, rejection_reason = ?, admin_note = ?, issued_at = CASE WHEN ? = 'issued' THEN COALESCE(issued_at, CURRENT_TIMESTAMP) ELSE issued_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, invoiceNumber, fileUrl, rejectionReason, adminNote, status, String(payload.id)).run();
      if (!result.meta.changes) return Response.json({ error: "发票申请不存在" }, { status: 404 });
    } else if (action === "update-retail-partnership-status") {
      const status = String(payload.status ?? "");
      if (!partnershipStatuses.includes(status)) return Response.json({ error: "合作申请状态无效" }, { status: 400 });
      await db.prepare("UPDATE retail_partnerships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(payload.id)).run();
  } else return false;
  return true;
}
