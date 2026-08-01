"use client";

import { useState } from "react";
import type { CommunityNotification } from "../../../lib/community/social";
import { CommunityIcon } from "../CommunityIcon";

function notificationCopy(item: CommunityNotification) {
  if (item.event_type === "new_follower") return { title: `${item.actor_name || "一位会员"} 关注了你`, detail: "你的新分享会出现在对方的关注动态中。" };
  if (item.event_type === "post_approved") return { title: "你的分享已通过审核", detail: "内容已经公开展示在 PÚSY 社区。" };
  if (item.event_type === "post_rejected") return { title: "你的分享暂未通过审核", detail: "请进入个人主页查看审核说明后调整内容。" };
  if (item.event_type === "post_hidden") return { title: "你的分享已被隐藏", detail: "该内容不再公开展示，如有疑问请联系客户服务。" };
  if (item.event_type === "following_post") return { title: `${item.actor_name || "你关注的会员"} 发布了新分享`, detail: "这篇内容已经通过社区审核。" };
  if (item.event_type === "post_comment") return { title: `${item.actor_name || "一位会员"} 评论了你的分享`, detail: "进入分享详情查看这条新评论。" };
  if (item.event_type === "comment_reply") return { title: `${item.actor_name || "一位会员"} 回复了你的评论`, detail: "进入分享详情继续参与讨论。" };
  return { title: "社区动态更新", detail: "你的 PÚSY 社区有一条新消息。" };
}

export function NotificationsClient({ initialNotifications }: { initialNotifications: CommunityNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function markRead(id?: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/community/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(id ? { id } : {}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "通知状态更新失败"); return; }
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: item.read_at || now } : item));
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusy(false); }
  }

  const unread = notifications.filter((item) => !item.read_at).length;
  return <section className="community-notifications-panel">
    <header><div><span>COMMUNITY UPDATES</span><h1>站内通知</h1><p>审核结果、关注关系和你关心的社区动态会集中显示在这里。</p></div>{unread > 0 && <button disabled={busy} onClick={() => void markRead()}><CommunityIcon name="check" size={17} />全部标为已读</button>}</header>
    {message && <p className="community-form-error" role="alert">{message}</p>}
    {notifications.length ? <div className="community-notification-list">{notifications.map((item) => {
      const copy = notificationCopy(item);
      const href = item.post_id ? `/community/posts/${item.post_id}` : item.actor_public_id ? `/community/members/${item.actor_public_id}` : "/community";
      return <article className={item.read_at ? "read" : "unread"} key={item.id}><i>{item.event_type === "new_follower" ? <CommunityIcon name="user" /> : ["following_post", "post_comment", "comment_reply"].includes(item.event_type) ? <CommunityIcon name="spark" /> : <CommunityIcon name="shield" />}</i><div><span>{item.read_at ? "已读" : "新通知"}</span><h2><a href={href}>{copy.title}</a></h2><p>{copy.detail}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>{!item.read_at && <button disabled={busy} onClick={() => void markRead(item.id)} aria-label={`将“${copy.title}”标为已读`}>标为已读</button>}</article>;
    })}</div> : <div className="community-empty"><span>ALL CAUGHT UP</span><h2>暂时没有新通知</h2><p>关注会员、发布分享或收到审核结果后，消息会显示在这里。</p><a href="/community">返回社区 →</a></div>}
  </section>;
}
