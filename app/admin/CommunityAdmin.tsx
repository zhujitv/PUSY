"use client";

import Image from "next/image";
import { useState } from "react";

export type CommunityModerationPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  author_name: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  moderation_note: string;
  moderated_by?: string;
  moderated_at?: string;
  published_at?: string;
  created_at: string;
  media_ids: string[];
};

const statusNames = { pending: "待审核", approved: "公开显示", rejected: "拒绝公开", hidden: "已隐藏" } as const;

function ModerationCard({ post, canManage, onAct }: { post: CommunityModerationPost; canManage: boolean; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [status, setStatus] = useState(post.status);
  const [reason, setReason] = useState(post.moderation_note || "");
  return <article className="community-moderation-card">
    <header><div className="community-admin-author"><i>{post.author_name.slice(0, 1).toUpperCase()}</i><span><b>{post.author_name}</b><small>{post.author_public_id} · 会员 #{post.member_id}</small></span></div><div><em className={`community-status status-${post.status}`}>{statusNames[post.status]}</em><time>{new Date(post.created_at).toLocaleString("zh-CN")}</time></div></header>
    <div className={`community-admin-media count-${post.media_ids.length}`}>{post.media_ids.map((id, index) => <span key={id}><Image src={`/api/community/media/${id}`} alt={`待审社区图片 ${index + 1}`} fill sizes="(max-width: 900px) 50vw, 240px" unoptimized /></span>)}</div>
    <section><small>{post.id}</small>{post.title && <h3>{post.title}</h3>}<p>{post.body}</p></section>
    <footer>{canManage ? <><label>审核结果<select value={status} onChange={(event) => setStatus(event.target.value as CommunityModerationPost["status"])}><option value="pending">待审核</option><option value="approved">公开显示</option><option value="rejected">拒绝公开</option><option value="hidden">隐藏内容</option></select></label><label>审核说明<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder={status === "rejected" ? "拒绝公开时必须填写，会员可见" : "选填，会员可在自己的主页查看"} /></label><button onClick={() => void onAct({ action: "update-community-post-status", id: post.id, status, reason })}>保存审核结果</button></> : <p>当前账号仅可查看社区审核队列。</p>}<a href={`/community/posts/${post.id}`} target="_blank" rel="noopener noreferrer">预览内容 ↗</a></footer>
  </article>;
}

export function CommunityAdmin({ posts, canManage, onAct }: { posts: CommunityModerationPost[]; canManage: boolean; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const pending = posts.filter((post) => post.status === "pending").length;
  return <section className="admin-panel community-admin-panel"><div className="admin-panel-title"><div><h2>社区内容审核</h2><p>审核会员图文与公开昵称；所有状态变更同时进入社区事件和后台操作日志。</p></div><span>{pending} 条待审核</span></div><div className="community-moderation-list">{posts.length ? posts.map((post) => <ModerationCard post={post} canManage={canManage} onAct={onAct} key={post.id} />) : <p className="admin-empty">还没有社区投稿</p>}</div></section>;
}
