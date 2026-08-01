"use client";

import Image from "next/image";
import { useState } from "react";
import type { CommunityTopic } from "../../../../../lib/community/social";
import type { CommunityProductOption } from "../../../../../lib/community/commerce";

export function CreatorPostEditor({ post, topics, products }: { post: { id: string; title: string; body: string; updatedAt: string; mediaIds: string[]; topicSlugs: string[]; productSlugs: string[] }; topics: CommunityTopic[]; products: CommunityProductOption[] }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [topicSlug, setTopicSlug] = useState(post.topicSlugs[0] ?? topics[0]?.slug ?? "");
  const [productSlugs, setProductSlugs] = useState(post.productSlugs);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(intent: "draft" | "submit") {
    setBusy(true); setError(""); setMessage(intent === "draft" ? "正在保存草稿…" : "正在提交审核…");
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body, topicSlugs: topicSlug ? [topicSlug] : [], productSlugs, expectedUpdatedAt: post.updatedAt, intent }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(""); setError(result.error || "保存失败，请稍后再试"); return; }
      setMessage(result.message || "已保存");
      window.setTimeout(() => { window.location.href = "/community/creator"; }, 700);
    } catch { setMessage(""); setError("网络连接失败，请稍后再试"); }
    finally { setBusy(false); }
  }

  return <div className="creator-editor-layout"><section className="creator-editor-form"><header><span>EDIT POST</span><h1>继续完善这篇分享</h1><p>公开内容修改后会重新进入审核；历史版本仅用于审计，不会公开展示。</p></header>
    <label>标题 <small>{title.length} / 80</small><input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>正文 <small>{body.length} / 1500</small><textarea rows={10} maxLength={1500} value={body} onChange={(event) => setBody(event.target.value)} /></label>
    <label>话题<select value={topicSlug} onChange={(event) => setTopicSlug(event.target.value)}>{topics.map((topic) => <option value={topic.slug} key={topic.id}>#{topic.name}</option>)}</select></label>
    <fieldset><legend>关联商品 <small>最多 3 件</small></legend><div className="creator-editor-products">{products.map((product) => { const selected = productSlugs.includes(product.slug); return <label className={selected ? "selected" : ""} key={product.slug}><input type="checkbox" checked={selected} disabled={!selected && productSlugs.length >= 3} onChange={() => setProductSlugs((current) => selected ? current.filter((slug) => slug !== product.slug) : [...current, product.slug].slice(0, 3))} />{product.name}</label>; })}</div></fieldset>
    {error && <p className="community-form-error" role="alert">{error}</p>}{message && <p className="community-form-message" role="status">{message}</p>}
    <div className="community-publish-actions"><button className="community-draft-button" disabled={busy} onClick={() => void save("draft")}>保存为草稿</button><button className="community-submit" disabled={busy || body.trim().length < 10 || !post.mediaIds.length} onClick={() => void save("submit")}>提交审核</button></div>
  </section><aside><h2>当前图片</h2><p>本期编辑保留原图，避免审核中的图片被静默替换。</p><div className="creator-editor-media">{post.mediaIds.map((id, index) => <span key={id}><Image src={`/api/community/media/${id}`} alt={`分享图片 ${index + 1}`} fill sizes="240px" unoptimized /></span>)}</div></aside></div>;
}
