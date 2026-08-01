import type { Attachment, Folder, SupportThread } from "./support-types";

export const statusLabels = { unread: "未读", open: "处理中", pending: "等待客户", resolved: "已解决" };
export const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
export const folderLabels: Array<[Folder, string]> = [["inbox", "收件箱"], ["unread", "未读"], ["handling", "处理中"], ["unassigned", "待分配"], ["due-soon", "即将超时"], ["overdue", "已超时"], ["starred", "星标"], ["archived", "已归档"], ["trash", "垃圾箱"]];

export function attachments(value: string) { try { return JSON.parse(value) as Attachment[]; } catch { return []; } }
export function fileSize(value = 0) { if (!value) return ""; if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
export function active(thread: SupportThread) { return !thread.archived_at && !thread.deleted_at; }
export function appendIndex<K, V>(index: Map<K, V[]>, key: K, value: V) { const items = index.get(key); if (items) items.push(value); else index.set(key, [value]); }

export function slaState(thread: SupportThread, now: number) {
  if (thread.status === "resolved") return { key: "resolved", label: "已完成 SLA", date: thread.resolved_at };
  const awaitingFirstResponse = !thread.first_responded_at;
  const date = awaitingFirstResponse ? thread.first_response_due_at : thread.resolution_due_at;
  if (!date) return { key: "unset", label: "未设置 SLA", date: "" };
  const remaining = new Date(date).getTime() - now;
  const phase = awaitingFirstResponse ? "首响" : "解决";
  if (remaining < 0) return { key: "overdue", label: `${phase}已超时`, date };
  if (remaining <= 2 * 60 * 60 * 1000) return { key: "due-soon", label: `${phase}即将到期`, date };
  return { key: "on-track", label: `${phase}时限内`, date };
}
