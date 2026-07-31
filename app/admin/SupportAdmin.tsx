"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCnyFromRub } from "../data/products";

export type SupportThread = {
  id: string;
  mailbox: string;
  subject: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  customer_wechat?: string;
  member_id?: number;
  member_name?: string;
  order_id?: string;
  order_status?: string;
  return_id?: string;
  return_status?: string;
  status: "unread" | "open" | "pending" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  assigned_admin_id?: string;
  due_at?: string;
  first_response_due_at?: string;
  resolution_due_at?: string;
  first_responded_at?: string;
  resolved_at?: string;
  reopened_count: number;
  member_total_orders?: number;
  member_total_spent?: number;
  member_points_balance?: number;
  member_lifetime_points?: number;
  member_tier?: string;
  member_status?: string;
  member_tags?: string;
  starred: number;
  archived_at?: string;
  deleted_at?: string;
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

export type ReturnEvent = { id: string; return_id: string; event_type: string; from_status?: string; to_status?: string; note: string; actor: string; created_at: string };
type Attachment = { id: string; filename: string; content_type?: string; size?: number };
type SupportReceiving = { domain: string; configured: boolean };
type CannedReply = { id: number; title: string; content: string };
export type SupportAgent = { id: string; email: string; display_name: string; role: string };
export type SupportCustomerOrder = { id: string; member_id?: number; customer: string; email: string; total: number; status: string; delivery: string; payment: string; carrier_name?: string; tracking_number?: string; shipment_status?: string; created_at: string };
export type SupportCustomerReturn = { id: string; order_id: string; member_id?: number; email: string; reason: string; request_type: string; status: string; refund_id?: string; created_at: string };
type SupportViewer = { id: string; email: string; displayName: string };
type Folder = "inbox" | "unread" | "handling" | "unassigned" | "due-soon" | "overdue" | "starred" | "archived" | "trash";
type ManageOperation = "mark-read" | "mark-unread" | "star" | "unstar" | "archive" | "unarchive" | "trash" | "restore" | "delete-permanent";

const statusLabels = { unread: "未读", open: "处理中", pending: "等待客户", resolved: "已解决" };
const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
const folderLabels: Array<[Folder, string]> = [["inbox", "收件箱"], ["unread", "未读"], ["handling", "处理中"], ["unassigned", "待分配"], ["due-soon", "即将超时"], ["overdue", "已超时"], ["starred", "星标"], ["archived", "已归档"], ["trash", "垃圾箱"]];

function attachments(value: string) { try { return JSON.parse(value) as Attachment[]; } catch { return []; } }
function fileSize(value = 0) { if (!value) return ""; if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
function active(thread: SupportThread) { return !thread.archived_at && !thread.deleted_at; }
function appendIndex<K, V>(index: Map<K, V[]>, key: K, value: V) { const items = index.get(key); if (items) items.push(value); else index.set(key, [value]); }

function slaState(thread: SupportThread, now: number) {
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

const tierLabels: Record<string, string> = { bronze: "青铜会员", silver: "白银会员", gold: "黄金会员", diamond: "钻石会员" };

function Customer360({ thread, orders, returns, previousTickets }: { thread: SupportThread; orders: SupportCustomerOrder[]; returns: SupportCustomerReturn[]; previousTickets: number }) {
  const tags = (thread.member_tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  return <aside className="support-customer-360">
    <header><span>客户 360</span><h3>{thread.member_name || thread.customer_name || "访客客户"}</h3><p>{thread.member_id ? `会员 #${thread.member_id}` : "尚未绑定会员账号"}</p></header>
    <section className="support-customer-summary">
      <div><span>会员等级</span><b>{tierLabels[thread.member_tier || ""] || "普通客户"}</b></div>
      <div><span>积分余额</span><b>{thread.member_points_balance ?? 0}</b></div>
      <div><span>累计订单</span><b>{thread.member_total_orders ?? orders.length}</b></div>
      <div><span>累计消费</span><b>{formatCnyFromRub(thread.member_total_spent ?? 0)}</b></div>
    </section>
    <section><h4>联系方式</h4><p>{thread.customer_phone || "未填写手机"}</p><p>{thread.customer_wechat ? `微信：${thread.customer_wechat}` : "未填写微信"}</p><p>{thread.customer_email || "未填写邮箱"}</p></section>
    <section><h4>客户标签</h4><div className="support-customer-tags">{tags.length ? tags.map((tag) => <span key={tag}>{tag}</span>) : <small>暂无标签</small>}</div></section>
    <section><h4>最近订单</h4><div className="support-customer-history">{orders.slice(0, 5).map((order) => <article key={order.id}><div><b>{order.id}</b><time>{new Date(order.created_at).toLocaleDateString("zh-CN")}</time></div><p>{order.status} · {formatCnyFromRub(order.total)}</p>{order.tracking_number && <small>{order.carrier_name} {order.tracking_number} · {order.shipment_status}</small>}</article>)}{!orders.length && <small>暂无订单记录</small>}</div></section>
    <section><h4>售后记录</h4><div className="support-customer-history">{returns.slice(0, 4).map((item) => <article key={item.id}><div><b>{item.id}</b><time>{new Date(item.created_at).toLocaleDateString("zh-CN")}</time></div><p>{item.status} · {item.reason}</p></article>)}{!returns.length && <small>暂无售后记录</small>}</div></section>
    <div className="support-customer-footer"><span>历史工单</span><b>{previousTickets} 个</b></div>
  </aside>;
}

export function SupportAdmin({ threads, messages, returnEvents, cannedReplies, receiving, agents, customerOrders, customerReturns, query, viewer, focusThreadId, onAct }: {
  threads: SupportThread[];
  messages: SupportMessage[];
  returnEvents: ReturnEvent[];
  cannedReplies: CannedReply[];
  receiving: SupportReceiving;
  agents: SupportAgent[];
  customerOrders: SupportCustomerOrder[];
  customerReturns: SupportCustomerReturn[];
  query: string;
  viewer: SupportViewer;
  focusThreadId?: string;
  onAct: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const focusedThread = threads.find((thread) => thread.id === focusThreadId);
  const [folder, setFolder] = useState<Folder>(focusedThread?.deleted_at ? "trash" : focusedThread?.archived_at ? "archived" : "inbox");
  const [selectedId, setSelectedId] = useState(focusThreadId ?? "");
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [renderedAt, setRenderedAt] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setRenderedAt(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const messagesByThread = useMemo(() => {
    const index = new Map<string, SupportMessage[]>();
    messages.forEach((message) => appendIndex(index, message.thread_id, message));
    return index;
  }, [messages]);
  const returnEventsByReturn = useMemo(() => {
    const index = new Map<string, ReturnEvent[]>();
    returnEvents.forEach((event) => appendIndex(index, event.return_id, event));
    return index;
  }, [returnEvents]);
  const customerHistory = useMemo(() => {
    const ordersByMember = new Map<number, SupportCustomerOrder[]>();
    const ordersByEmail = new Map<string, SupportCustomerOrder[]>();
    const ordersById = new Map<string, SupportCustomerOrder>();
    const returnsByMember = new Map<number, SupportCustomerReturn[]>();
    const returnsByEmail = new Map<string, SupportCustomerReturn[]>();
    const returnsByOrder = new Map<string, SupportCustomerReturn[]>();
    customerOrders.forEach((order) => {
      ordersById.set(order.id, order);
      if (order.member_id) appendIndex(ordersByMember, order.member_id, order);
      const email = order.email.toLowerCase();
      if (email) appendIndex(ordersByEmail, email, order);
    });
    customerReturns.forEach((item) => {
      appendIndex(returnsByOrder, item.order_id, item);
      if (item.member_id) appendIndex(returnsByMember, item.member_id, item);
      const email = item.email.toLowerCase();
      if (email) appendIndex(returnsByEmail, email, item);
    });
    return { ordersByMember, ordersByEmail, ordersById, returnsByMember, returnsByEmail, returnsByOrder };
  }, [customerOrders, customerReturns]);
  const counts = useMemo(() => ({
    inbox: threads.filter(active).length,
    unread: threads.filter((thread) => active(thread) && thread.status === "unread").length,
    handling: threads.filter((thread) => active(thread) && ["open", "pending"].includes(thread.status)).length,
    unassigned: threads.filter((thread) => active(thread) && thread.status !== "resolved" && !thread.assigned_admin_id).length,
    "due-soon": threads.filter((thread) => active(thread) && thread.status !== "resolved" && slaState(thread, renderedAt).key === "due-soon").length,
    overdue: threads.filter((thread) => active(thread) && thread.status !== "resolved" && slaState(thread, renderedAt).key === "overdue").length,
    starred: threads.filter((thread) => active(thread) && Boolean(thread.starred)).length,
    archived: threads.filter((thread) => Boolean(thread.archived_at) && !thread.deleted_at).length,
    trash: threads.filter((thread) => Boolean(thread.deleted_at)).length,
  }), [renderedAt, threads]);
  const slaMetrics = useMemo(() => {
    const working = threads.filter((thread) => active(thread) && thread.status !== "resolved");
    return {
      open: working.length,
      unassigned: working.filter((thread) => !thread.assigned_admin_id).length,
      dueSoon: working.filter((thread) => slaState(thread, renderedAt).key === "due-soon").length,
      overdue: working.filter((thread) => slaState(thread, renderedAt).key === "overdue").length,
      resolvedToday: threads.filter((thread) => thread.resolved_at && new Date(thread.resolved_at).toDateString() === new Date(renderedAt).toDateString()).length,
    };
  }, [renderedAt, threads]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return threads.filter((thread) => {
      const matchesFolder = folder === "inbox" ? active(thread)
        : folder === "unread" ? active(thread) && thread.status === "unread"
        : folder === "handling" ? active(thread) && ["open", "pending"].includes(thread.status)
        : folder === "unassigned" ? active(thread) && thread.status !== "resolved" && !thread.assigned_admin_id
        : folder === "due-soon" ? active(thread) && thread.status !== "resolved" && slaState(thread, renderedAt).key === "due-soon"
        : folder === "overdue" ? active(thread) && thread.status !== "resolved" && slaState(thread, renderedAt).key === "overdue"
        : folder === "starred" ? active(thread) && Boolean(thread.starred)
        : folder === "archived" ? Boolean(thread.archived_at) && !thread.deleted_at
        : Boolean(thread.deleted_at);
      return matchesFolder && (!normalized || `${thread.id} ${thread.subject} ${thread.customer_name} ${thread.customer_phone ?? ""} ${thread.customer_wechat ?? ""} ${thread.customer_email} ${thread.order_id ?? ""} ${thread.return_id ?? ""} ${thread.status}`.toLowerCase().includes(normalized));
    });
  }, [folder, query, renderedAt, threads]);
  const selected = filtered.find((thread) => thread.id === selectedId) ?? filtered[0];
  const visibleChecked = checked.filter((id) => filtered.some((thread) => thread.id === id));
  const selectedMessages = selected ? messagesByThread.get(selected.id) ?? [] : [];
  const timeline = selected?.return_id ? returnEventsByReturn.get(selected.return_id) ?? [] : [];
  const selectedOrders = selected ? selected.member_id ? customerHistory.ordersByMember.get(selected.member_id) ?? [] : selected.customer_email ? customerHistory.ordersByEmail.get(selected.customer_email.toLowerCase()) ?? [] : selected.order_id && customerHistory.ordersById.has(selected.order_id) ? [customerHistory.ordersById.get(selected.order_id)!] : [] : [];
  const selectedReturns = selected ? selected.member_id ? customerHistory.returnsByMember.get(selected.member_id) ?? [] : selected.customer_email ? customerHistory.returnsByEmail.get(selected.customer_email.toLowerCase()) ?? [] : selected.order_id ? customerHistory.returnsByOrder.get(selected.order_id) ?? [] : [] : [];
  const previousTickets = selected ? threads.filter((thread) => thread.id !== selected.id && (selected.member_id ? thread.member_id === selected.member_id : selected.customer_email ? thread.customer_email.toLowerCase() === selected.customer_email.toLowerCase() : Boolean(selected.order_id) && thread.order_id === selected.order_id)).length : 0;

  async function manage(operation: ManageOperation, ids = visibleChecked.length ? visibleChecked : selected ? [selected.id] : []) {
    if (!ids.length) return;
    if (operation === "delete-permanent" && !window.confirm(`将永久删除 ${ids.length} 个工单及全部邮件，删除后无法恢复。确定继续吗？`)) return;
    setBusy(true);
    const ok = await onAct({ action: "manage-support-threads", operation, ids, confirm: operation === "delete-permanent" ? "DELETE" : undefined });
    if (ok) { setChecked([]); if (ids.includes(selectedId)) setSelectedId(""); }
    setBusy(false);
  }

  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const message = replyText.trim();
    if (!message) return;
    setBusy(true);
    if (await onAct({ action: "reply-support-thread", id: selected.id, message })) setReplyText("");
    setBusy(false);
  }

  function openThread(thread: SupportThread) {
    setSelectedId(thread.id);
    if (thread.status === "unread" && active(thread)) void onAct({ action: "update-support-thread", id: thread.id, status: "open", priority: thread.priority, assignedAdminId: thread.assigned_admin_id || viewer.id, dueAt: thread.due_at || "" });
  }

  const allChecked = Boolean(filtered.length) && filtered.every((thread) => checked.includes(thread.id));
  return <div className="support-admin-stack">
    <section className={`support-configuration ${receiving.configured ? "ready" : "pending"}`}>
      <div><b>{receiving.configured ? "收件程序已就绪" : "收件程序等待配置"}</b><p>{receiving.domain ? `客服地址：service@${receiving.domain} · 售后地址：returns@${receiving.domain}` : "部署时配置 RESEND_INBOUND_DOMAIN 后，将显示正式收件地址。"}</p></div>
      <span>{counts.unread} 封未读</span>
    </section>
    <section className="support-sla-grid" aria-label="客服 SLA 概览">
      <article><span>处理中</span><b>{slaMetrics.open}</b><small>未解决工单</small></article>
      <article><span>待分配</span><b>{slaMetrics.unassigned}</b><small>需要负责人</small></article>
      <article className="warning"><span>即将到期</span><b>{slaMetrics.dueSoon}</b><small>未来 2 小时</small></article>
      <article className="danger"><span>已超时</span><b>{slaMetrics.overdue}</b><small>首响或解决超时</small></article>
      <article className="success"><span>今日解决</span><b>{slaMetrics.resolvedToday}</b><small>已完成工单</small></article>
    </section>
    <section className="support-mailbox">
      <nav className="support-folders">
        <div><b>客服工单</b><small>{threads.length} 个工单</small></div>
        {folderLabels.map(([key, label]) => <button className={folder === key ? "active" : ""} onClick={() => { setFolder(key); setSelectedId(""); setChecked([]); }} key={key}><span>{label}</span><b>{counts[key]}</b></button>)}
        <p>删除的邮件会在垃圾箱保留，只有“永久删除”才会清除记录。</p>
      </nav>
      <div className="support-workspace">
        <div className="support-mail-toolbar">
          <label><input type="checkbox" checked={allChecked} onChange={(event) => setChecked(event.target.checked ? filtered.map((thread) => thread.id) : [])} />全选</label>
          <span>{visibleChecked.length ? `已选择 ${visibleChecked.length} 项` : `${filtered.length} 封`}</span>
          <div>
            {folder !== "trash" && <><button disabled={busy} onClick={() => void manage("mark-read")}>标为已读</button><button disabled={busy} onClick={() => void manage("mark-unread")}>标为未读</button><button disabled={busy} onClick={() => void manage(folder === "starred" ? "unstar" : "star")}>{folder === "starred" ? "取消星标" : "加星标"}</button></>}
            {folder === "archived" ? <button disabled={busy} onClick={() => void manage("unarchive")}>移回收件箱</button> : folder === "trash" ? <><button disabled={busy} onClick={() => void manage("restore")}>恢复</button><button className="danger" disabled={busy} onClick={() => void manage("delete-permanent")}>永久删除</button></> : <><button disabled={busy} onClick={() => void manage("archive")}>归档</button><button className="danger" disabled={busy} onClick={() => void manage("trash")}>删除</button></>}
          </div>
        </div>
        <div className="support-mail-content">
          <aside className="support-thread-list">
            <header><div><h2>{folderLabels.find(([key]) => key === folder)?.[1]}</h2><p>{query ? `搜索到 ${filtered.length} 项` : "按最近联系时间排列"}</p></div><span className="support-live-dot" /></header>
            <div>{filtered.length ? filtered.map((thread) => <div className={`support-thread-row ${selected?.id === thread.id ? "active" : ""} ${thread.status === "unread" ? "unread" : ""}`} key={thread.id}>
              <label className="support-thread-check"><input type="checkbox" checked={checked.includes(thread.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...new Set([...current, thread.id])] : current.filter((id) => id !== thread.id))} aria-label={`选择 ${thread.subject}`} /></label>
              <button className="support-star" title={thread.starred ? "取消星标" : "添加星标"} onClick={() => void manage(thread.starred ? "unstar" : "star", [thread.id])}>{thread.starred ? "★" : "☆"}</button>
              <button className="support-thread-open" onClick={() => openThread(thread)}><span><b>{thread.customer_name || thread.customer_phone || thread.customer_email}</b><time>{new Date(thread.last_message_at).toLocaleDateString("zh-CN")}</time></span><strong>{thread.subject}</strong><small>{thread.mailbox === "returns" ? "售后" : "客服"} · {statusLabels[thread.status]}{thread.order_id ? ` · ${thread.order_id}` : ""}</small>{slaState(thread, renderedAt).key !== "resolved" && <em className={`support-sla-badge ${slaState(thread, renderedAt).key}`}>{slaState(thread, renderedAt).label}</em>}</button>
            </div>) : <p className="support-empty">这个文件夹里没有邮件</p>}</div>
          </aside>
          <div className="support-conversation">
            {selected ? <>
              <header className="support-conversation-header"><div><p>{selected.id}</p><h2>{selected.subject}</h2><span>{selected.customer_name || "客户"}{selected.customer_phone ? ` · ${selected.customer_phone}` : ""}{selected.customer_wechat ? ` · 微信 ${selected.customer_wechat}` : ""}{selected.customer_email ? ` · ${selected.customer_email}` : ""}</span></div>
                <div className="support-header-actions">{!selected.deleted_at && <button title="星标" onClick={() => void manage(selected.starred ? "unstar" : "star", [selected.id])}>{selected.starred ? "★ 已星标" : "☆ 星标"}</button>}{selected.deleted_at ? <><button onClick={() => void manage("restore", [selected.id])}>恢复</button><button className="danger" onClick={() => void manage("delete-permanent", [selected.id])}>永久删除</button></> : selected.archived_at ? <><button onClick={() => void manage("unarchive", [selected.id])}>移回收件箱</button><button className="danger" onClick={() => void manage("trash", [selected.id])}>删除</button></> : <><button onClick={() => void manage(selected.status === "unread" ? "mark-read" : "mark-unread", [selected.id])}>{selected.status === "unread" ? "标为已读" : "标为未读"}</button><button onClick={() => void manage("archive", [selected.id])}>归档</button><button className="danger" onClick={() => void manage("trash", [selected.id])}>删除</button></>}</div>
              </header>
              {!selected.deleted_at && !selected.archived_at && <form className="support-controls" key={selected.id} onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void onAct({ action: "update-support-thread", id: selected.id, ...values }); }}><label>优先级<select name="priority" defaultValue={selected.priority}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>处理状态<select name="status" defaultValue={selected.status}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>负责人<select name="assignedAdminId" defaultValue={selected.assigned_admin_id || ""}><option value="">暂不分配</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.display_name} · {agent.email}</option>)}</select></label><label>自定义处理时限<input name="dueAt" type="datetime-local" defaultValue={selected.due_at ? new Date(selected.due_at).toISOString().slice(0, 16) : ""} /></label>{!selected.first_responded_at && <label className="support-first-response"><input type="checkbox" name="firstResponded" value="yes" /> 已首次联系客户</label>}<button>保存分派</button></form>}
              <div className="support-links">{selected.member_id && <span>会员 #{selected.member_id}{selected.member_name ? ` · ${selected.member_name}` : ""}</span>}{selected.order_id && <span>订单 {selected.order_id} · {selected.order_status}</span>}{selected.return_id && <span>售后 {selected.return_id} · {selected.return_status}</span>}<span>负责人：{selected.assigned_to || "未分配"}</span><span className={`support-sla-chip ${slaState(selected, renderedAt).key}`}>{slaState(selected, renderedAt).label}{slaState(selected, renderedAt).date ? `：${new Date(slaState(selected, renderedAt).date || "").toLocaleString("zh-CN")}` : ""}</span>{selected.due_at && <span className={new Date(selected.due_at).getTime() < renderedAt && selected.status !== "resolved" ? "overdue" : ""}>自定义时限：{new Date(selected.due_at).toLocaleString("zh-CN")}</span>}{selected.reopened_count > 0 && <span>重新打开 {selected.reopened_count} 次</span>}</div>
              <div className="support-case-layout"><div className="support-case-main">
                <div className="support-message-list">{selectedMessages.map((message) => <article className={`${message.direction} ${message.source === "internal_note" ? "internal-note" : ""}`} key={message.id}><header><b>{message.source === "internal_note" ? "内部备注 · 仅员工可见" : message.direction === "inbound" ? selected.customer_name || selected.customer_email : message.direction === "outbound" ? "PUSY.CN 客服" : "系统记录"}</b><time>{new Date(message.created_at).toLocaleString("zh-CN")}</time></header><p>{message.text_body || "（邮件没有可显示的文字内容）"}</p>{attachments(message.attachments_json).length > 0 && <div className="support-attachments">{attachments(message.attachments_json).map((file) => message.provider_email_id ? <a key={file.id} href={`/api/admin/support/attachment?emailId=${encodeURIComponent(message.provider_email_id)}&attachmentId=${encodeURIComponent(file.id)}`} target="_blank" rel="noopener noreferrer"><span>附件</span><b>{file.filename}</b><small>{fileSize(file.size)}</small></a> : <span key={file.id}>{file.filename}</span>)}</div>}</article>)}</div>
                {timeline.length > 0 && <details className="support-return-timeline"><summary>查看售后处理记录（{timeline.length}）</summary>{timeline.map((event) => <p key={event.id}><time>{new Date(event.created_at).toLocaleString("zh-CN")}</time><b>{event.from_status ? `${event.from_status} → ${event.to_status}` : event.to_status}</b><span>{event.note || event.actor}</span></p>)}</details>}
                {!selected.deleted_at && !selected.archived_at && <><form className="support-note" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const note = String(new FormData(form).get("note") ?? "").trim(); if (note && await onAct({ action: "add-support-note", id: selected.id, note })) form.reset(); }}><input name="note" maxLength={5000} placeholder="添加内部备注，客户不会看到" required /><button>添加备注</button></form>{selected.customer_email ? <form className="support-reply" onSubmit={reply}><div className="support-quick-reply"><label>快捷回复<select defaultValue="" onChange={(event) => { const selectedReply = cannedReplies.find((item) => item.id === Number(event.target.value)); if (selectedReply) setReplyText(selectedReply.content); }}><option value="">选择模板</option>{cannedReplies.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></div><textarea name="message" value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={5} maxLength={10000} placeholder="通过邮件回复客户；发送内容会保留在当前工单" required /><div className="support-reply-actions"><span>发件人：PUSY.CN · 客户也可选择电话或微信联系</span><button disabled={busy || !receiving.configured}>{busy ? "正在发送…" : receiving.configured ? "发送邮件回复" : "等待邮件通道配置"}</button></div></form> : <div className="support-offline-contact"><b>客户未填写电子邮箱</b><p>请通过{selected.customer_wechat ? "微信或手机" : "手机"}联系客户，并将处理结果记录为内部备注。</p></div>}</>}
              </div><Customer360 thread={selected} orders={selectedOrders} returns={selectedReturns} previousTickets={previousTickets} /></div>
            </> : <div className="support-empty-conversation"><b>选择一封邮件</b><p>客户邮件、订单关联、附件和处理记录会显示在这里。</p></div>}
          </div>
        </div>
      </div>
    </section>
    <details className="support-template-manager"><summary>管理快捷回复（{cannedReplies.length}）</summary><form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); if (await onAct({ action: "create-canned-reply", ...values })) form.reset(); }}><input name="title" maxLength={80} placeholder="模板名称" required /><textarea name="content" maxLength={5000} rows={3} placeholder="回复内容" required /><button>新增快捷回复</button></form><div>{cannedReplies.map((item) => <article key={item.id}><div><b>{item.title}</b><p>{item.content}</p></div><button className="danger" onClick={() => void onAct({ action: "delete-canned-reply", id: item.id })}>删除</button></article>)}</div></details>
  </div>;
}
