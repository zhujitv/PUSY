import { getStoreDb } from "../../db/store";
import { bounded, id } from "./shared";

export async function recordReturnStatusChange(input: { returnId: string; status: string; actor: string; note?: string }) {
  const db = await getStoreDb();
  const current = await db.prepare("SELECT id, status, support_thread_id FROM returns WHERE id = ? LIMIT 1").bind(input.returnId).first<{ id: string; status: string; support_thread_id: string | null }>();
  if (!current) throw new Error("售后申请不存在");
  if (current.status === input.status) return;
  const statements = [
    db.prepare("UPDATE returns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(input.status, input.returnId),
    db.prepare("INSERT INTO return_events (id, return_id, event_type, from_status, to_status, note, actor) VALUES (?, ?, 'status_changed', ?, ?, ?, ?)").bind(id("REV"), input.returnId, current.status, input.status, bounded(input.note, 1000), input.actor),
  ];
  if (current.support_thread_id) {
    statements.push(
      db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) SELECT ?, id, 'system', 'return_status', ?, customer_email, ?, ? FROM support_threads WHERE id = ?").bind(id("MSG"), input.actor, `售后状态更新：${input.returnId}`, `售后状态已从“${current.status}”更新为“${input.status}”。${input.note ? `\n${bounded(input.note, 1000)}` : ""}`, current.support_thread_id),
      db.prepare("UPDATE support_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.support_thread_id),
    );
  }
  await db.batch(statements);
  const { notifyReturnUpdated } = await import("../notifications/business");
  await notifyReturnUpdated(input.returnId, input.status, input.note ?? "").catch(() => undefined);
}
