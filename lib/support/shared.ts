export function bounded(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function supportReceivingDomain() {
  return (process.env.RESEND_INBOUND_DOMAIN ?? "").trim().toLowerCase().replace(/^@/, "");
}

export function supportReplyAddress(input: { threadId?: string; orderId?: string; returnId?: string; mailbox?: "service" | "returns" }) {
  const domain = supportReceivingDomain();
  if (!domain) return "";
  const local = input.threadId ? `thread-${input.threadId}` : input.returnId ? `return-${input.returnId}` : input.orderId ? `order-${input.orderId}` : input.mailbox === "returns" ? "returns" : "service";
  return `${local.toLowerCase().replace(/[^a-z0-9-]/g, "")}@${domain}`;
}

export type SupportActor = { id: string; email: string; displayName: string };

export function reopenResolutionSql() {
  return "resolution_due_at = CASE WHEN status = 'resolved' THEN ? ELSE resolution_due_at END, reopened_count = reopened_count + CASE WHEN status = 'resolved' THEN 1 ELSE 0 END, resolved_at = CASE WHEN status = 'resolved' THEN NULL ELSE resolved_at END";
}
