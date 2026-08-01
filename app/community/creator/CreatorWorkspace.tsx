"use client";

import Image from "next/image";
import { useState } from "react";

type CreatorPost = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "pending" | "approved" | "rejected" | "hidden";
  moderation_note: string;
  created_at: string;
  updated_at: string;
  media_ids: string[];
  campaign_title: string;
  campaign_status: string;
  version_count: number;
};

const labels = { draft: "草稿", pending: "审核中", approved: "已公开", rejected: "未通过", hidden: "已隐藏" } as const;

export function CreatorWorkspace({ posts }: { posts: CreatorPost[] }) {
  const [items, setItems] = useState(posts);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function changeVisibility(post: CreatorPost) {
    setBusyId(post.id); setMessage("");
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: post.status === "hidden" ? "restore" : "hide" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "操作失败，请稍后再试"); return; }
      setItems((current) => current.map((item) => item.id === post.id ? { ...item, status: result.status, moderation_note: "" } : item));
      setMessage(result.message || "已保存");
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusyId(""); }
  }

  return <section className="creator-posts-panel">
    <header><div><span>CONTENT LIBRARY</span><h2>我的内容</h2></div><a href="/community/publish">＋ 新建分享</a></header>
    {message && <p className="creator-workspace-message" role="status">{message}</p>}
    {items.length ? <div className="creator-post-list">{items.map((post) => <article key={post.id}>
      <div className="creator-post-thumb">{post.media_ids[0] ? <Image src={`/api/community/media/${post.media_ids[0]}`} alt="" fill sizes="120px" unoptimized /> : <span>草稿</span>}</div>
      <section><div><em className={`community-status status-${post.status}`}>{labels[post.status]}</em>{post.campaign_title && <small>{post.campaign_title} · {post.campaign_status === "qualified" ? "已入选" : post.campaign_status === "rejected" ? "未入选" : "待评选"}</small>}</div><h3>{post.title || "未命名分享"}</h3><p>{post.body || "尚未填写正文"}</p>{post.moderation_note && <aside>审核说明：{post.moderation_note}</aside>}<footer><span>更新于 {new Date(post.updated_at).toLocaleString("zh-CN")} · {post.version_count} 个版本</span><div>{post.status !== "hidden" && <a href={`/community/posts/${post.id}/edit`}>编辑</a>}{post.status === "approved" && <a href={`/community/posts/${post.id}`}>查看</a>}<button disabled={busyId === post.id} onClick={() => void changeVisibility(post)}>{post.status === "hidden" ? "恢复并送审" : "隐藏"}</button></div></footer></section>
    </article>)}</div> : <div className="community-empty"><span>START CREATING</span><h2>还没有创作内容</h2><p>可以先保存一篇草稿，再慢慢补充图片和体验。</p><a href="/community/publish">开始创作 →</a></div>}
  </section>;
}
