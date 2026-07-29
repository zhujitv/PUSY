"use client";

import { useMemo, useState } from "react";

export type SupportThread = {
  id: string;
  mailbox: string;
  subject: string;
  customer_email: string;
  customer_name: string;
  member_id?: number;
  member_name?: string;
  order_id?: string;
  order_status?: string;
  return_id?: string;
  return_status?: string;
  status: "unread" | "open" | "pending" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  last_message_at: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound" | "system";
  source: string;
  provider_email_id?: string;
  from_email: string;
  to_email: string;
  subject: string;
  text_body: string;
  attachments_json: string;
  created_at: string;
};

export type ReturnEvent = {
  id: string;
  return_id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  note: string;
  actor: string;
  created_at: string;
};

type Attachment = { id: string; filename: string; content_type?: string; size?: number };
type SupportReceiving = { domain: string; configured: boolean };

const statusLabels = { unread: "未读", open: "处理中", pending: "等待客户", resolved: "已解决" };
const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };

function attachments(value: string) {
  try { return JSON.parse(value) as Attachment[]; } catch { return []; }
}

function fileSize(value = 0) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function SupportAdmin({ threads, messages, returnEvents, receiving, query, viewer, onAct }: {
  threads: SupportThread[];
  messages: SupportMessage[];
  returnEvents: ReturnEvent[];
  receiving: SupportReceiving;
  query: string;
  viewer: string;
  onAct: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter((thread) => `${thread.id} ${thread.subject} ${thread.customer_name} ${thread.customer_email} ${thread.order_id ?? ""} ${thread.return_id ?? ""} ${thread.status}`.toLowerCase().includes(normalized));
  }, [query, threads]);
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const selected = filtered.find((thread) => thread.id === selectedId) ?? filtered[0];
  const selectedMessages = selected ? messages.filter((message) => message.thread_id === selected.id) : [];
  const timeline = selected?.return_id ? returnEvents.filter((event) => event.return_id === selected.return_id) : [];

  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "").trim();
    if (!message) return;
    setBusy(true);
    if (await onAct({ action: "reply-support-thread", id: selected.id, message })) form.reset();
    setBusy(false);
  }

  function openThread(thread: SupportThread) {
    setSelectedId(thread.id);
    if (thread.status === "unread") void onAct({ action: "update-support-thread", id: thread.id, status: "open", priority: thread.priority, assignedTo: thread.assigned_to || viewer });
  }

  return <div className="support-admin-stack">
    <section className={`support-configuration ${receiving.configured ? "ready" : "pending"}`}>
      <div><b>{receiving.configured ? "收件程序已就绪" : "收件程序等待配置"}</b><p>{receiving.domain ? `客服地址：service@${receiving.domain} · 售后地址：returns@${receiving.domain}` : "部署时配置 RESEND_INBOUND_DOMAIN 后，将显示正式收件地址。"}</p></div>
      <span>{threads.filter((thread) => thread.status === "unread").length} 封未读</span>
    </section>
    <section className="support-workspace">
      <aside className="support-thread-list">
        <header><div><h2>客服收件箱</h2><p>{filtered.length} 个工单</p></div><span className="support-live-dot" /></header>
        <div>{filtered.length ? filtered.map((thread) => <button className={`${selected?.id === thread.id ? "active" : ""} ${thread.status === "unread" ? "unread" : ""}`} key={thread.id} onClick={() => openThread(thread)}>
          <span><b>{thread.customer_name || thread.customer_email}</b><time>{new Date(thread.last_message_at).toLocaleDateString("zh-CN")}</time></span>
          <strong>{thread.subject}</strong>
          <small>{thread.mailbox === "returns" ? "售后" : "客服"} · {statusLabels[thread.status]}{thread.order_id ? ` · ${thread.order_id}` : ""}</small>
        </button>) : <p className="support-empty">还没有收到客户邮件</p>}</div>
      </aside>
      <div className="support-conversation">
        {selected ? <>
          <header className="support-conversation-header">
            <div><p>{selected.id}</p><h2>{selected.subject}</h2><span>{selected.customer_name || "客户"} · {selected.customer_email}</span></div>
            <div className="support-controls"><label>优先级<select value={selected.priority} onChange={(event) => void onAct({ action: "update-support-thread", id: selected.id, status: selected.status, priority: event.target.value, assignedTo: selected.assigned_to || viewer })}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>状态<select value={selected.status} onChange={(event) => void onAct({ action: "update-support-thread", id: selected.id, status: event.target.value, priority: selected.priority, assignedTo: selected.assigned_to || viewer })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
          </header>
          <div className="support-links">{selected.member_id && <span>会员 #{selected.member_id}{selected.member_name ? ` · ${selected.member_name}` : ""}</span>}{selected.order_id && <span>订单 {selected.order_id} · {selected.order_status}</span>}{selected.return_id && <span>售后 {selected.return_id} · {selected.return_status}</span>}<span>负责人：{selected.assigned_to || "未分配"}</span></div>
          <div className="support-message-list">{selectedMessages.map((message) => <article className={message.direction} key={message.id}>
            <header><b>{message.direction === "inbound" ? selected.customer_name || selected.customer_email : message.direction === "outbound" ? "PUSY.CN 客服" : "系统记录"}</b><time>{new Date(message.created_at).toLocaleString("zh-CN")}</time></header>
            <p>{message.text_body || "（邮件没有可显示的文字内容）"}</p>
            {attachments(message.attachments_json).length > 0 && <div className="support-attachments">{attachments(message.attachments_json).map((file) => message.provider_email_id ? <a key={file.id} href={`/api/admin/support/attachment?emailId=${encodeURIComponent(message.provider_email_id)}&attachmentId=${encodeURIComponent(file.id)}`} target="_blank" rel="noopener noreferrer"><span>附件</span><b>{file.filename}</b><small>{fileSize(file.size)}</small></a> : <span key={file.id}>{file.filename}</span>)}</div>}
          </article>)}</div>
          {timeline.length > 0 && <details className="support-return-timeline"><summary>查看售后处理记录（{timeline.length}）</summary>{timeline.map((event) => <p key={event.id}><time>{new Date(event.created_at).toLocaleString("zh-CN")}</time><b>{event.from_status ? `${event.from_status} → ${event.to_status}` : event.to_status}</b><span>{event.note || event.actor}</span></p>)}</details>}
          <form className="support-reply" onSubmit={reply}><textarea name="message" rows={5} maxLength={10000} placeholder="回复客户；发送后客户可直接回复同一工单" required /><footer><span>发件人：PUSY.CN · 回复将保留在当前工单</span><button disabled={busy || !receiving.configured}>{busy ? "正在发送…" : receiving.configured ? "发送回复" : "等待收件配置"}</button></footer></form>
        </> : <div className="support-empty-conversation"><b>选择一个客服工单</b><p>客户邮件、订单关联和附件会显示在这里。</p></div>}
      </div>
    </section>
  </div>;
}
