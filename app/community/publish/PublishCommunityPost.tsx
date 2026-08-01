"use client";

import Image from "next/image";
import { useState } from "react";
import { COMMUNITY_MEDIA_LIMIT } from "../../../lib/community/contracts";
import type { CommunityTopic } from "../../../lib/community/social";
import type { CommunityProductOption } from "../../../lib/community/commerce";
import { formatCnyFromRub } from "../../data/products";

async function canvasData(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("图片处理失败，请更换图片后重试");
  return blob;
}

async function compressCommunityImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("仅支持 JPG、PNG 或 WebP 图片");
  if (file.size > 12_000_000) throw new Error("原始图片不能超过 12MB");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob = await canvasData(canvas, .82);
  for (const quality of [.72, .62, .52]) {
    if (blob.size <= 430_000) break;
    blob = await canvasData(canvas, quality);
  }
  if (blob.size > 430_000) throw new Error("图片压缩后仍然过大，请选择尺寸更小的图片");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });
}

export function PublishCommunityPost({ displayName, topics, products, defaultTopic, defaultProduct }: { displayName: string; topics: CommunityTopic[]; products: CommunityProductOption[]; defaultTopic?: string; defaultProduct?: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState(defaultTopic ?? topics[0]?.slug ?? "");
  const [productSlugs, setProductSlugs] = useState<string[]>(defaultProduct ? [defaultProduct] : []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [memberUrl, setMemberUrl] = useState("/community/me");
  const [clientRequestId] = useState(() => crypto.randomUUID());

  async function chooseImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, COMMUNITY_MEDIA_LIMIT - images.length));
    event.target.value = "";
    if (!files.length) return;
    setBusy(true); setError(""); setMessage("正在优化图片…");
    try {
      const prepared = await Promise.all(files.map(compressCommunityImage));
      setImages((current) => [...current, ...prepared].slice(0, COMMUNITY_MEDIA_LIMIT));
      setMessage("图片已准备好");
    } catch (imageError) {
      setMessage(""); setError(imageError instanceof Error ? imageError.message : "图片处理失败");
    } finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!images.length) { setError("请至少上传 1 张图片"); return; }
    setBusy(true); setMessage("正在提交审核…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/community/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, title, body, images, topicSlugs: [topicSlug], productSlugs, clientRequestId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || "发布失败，请稍后再试"); setMessage(""); return; }
      setMemberUrl(String(result.memberUrl || "/community/me")); setPublished(true); setMessage(result.message || "内容已提交审核");
    } catch { setMessage(""); setError("网络连接失败，请保留当前内容后重试"); }
    finally { setBusy(false); }
  }

  if (published) return <section className="community-publish-success"><i>✓</i><p>SUBMITTED FOR REVIEW</p><h1>分享已提交</h1><span>{message}。你可以在个人社区主页查看审核状态。</span><div><a href={memberUrl}>查看我的社区主页</a><a href="/community">返回社区首页</a></div></section>;

  return <div className="community-publish-layout">
    <form className="community-publish-form" onSubmit={submit}>
      <header><p>CREATE A POST</p><h1>分享你的此刻</h1><span>真实的体验，比完美的答案更有价值 · 以 {displayName} 的会员身份发布</span></header>
      <label>社区昵称 <small>公开展示，不要填写联系方式</small><input name="displayName" minLength={2} maxLength={30} defaultValue={displayName} required /></label>
      <label>分享标题 <small>选填，最多 80 字</small><input name="title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="一句话写下这次灵感" /></label>
      <label>正文 <small>{body.length} / 1500</small><textarea name="body" minLength={10} maxLength={1500} required rows={9} value={body} onChange={(event) => setBody(event.target.value)} placeholder="分享妆容、色彩、质地、护理感受或你的真实使用场景…" /></label>
      <label>选择话题 <small>帮助其他会员找到这篇分享</small><select name="topic" value={topicSlug} onChange={(event) => setTopicSlug(event.target.value)} required>{topics.map((topic) => <option value={topic.slug} key={topic.id}>#{topic.name}</option>)}</select></label>
      <fieldset className="community-product-selector"><legend>关联商品 <small>选填，最多 3 件；已购状态由真实订单自动判断</small></legend>
        <div>{products.map((product) => {
          const selected = productSlugs.includes(product.slug);
          return <label className={selected ? "selected" : ""} key={product.slug}><input type="checkbox" checked={selected} disabled={!selected && productSlugs.length >= 3} onChange={() => setProductSlugs((current) => selected ? current.filter((slug) => slug !== product.slug) : [...current, product.slug].slice(0, 3))} /><Image src={product.image} alt="" width={58} height={58} unoptimized /><span><b>{product.name}</b><small>{formatCnyFromRub(product.price)}</small></span><i>{selected ? "✓" : "+"}</i></label>;
        })}</div>
      </fieldset>
      <fieldset><legend>分享图片 <small>1–{COMMUNITY_MEDIA_LIMIT} 张</small></legend>
        {images.length > 0 && <div className={`community-upload-preview count-${images.length}`}>{images.map((src, index) => <button type="button" key={index} onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`移除第 ${index + 1} 张图片`}><Image src={src} alt={`待发布图片 ${index + 1}`} fill sizes="(max-width: 720px) 50vw, 220px" unoptimized /><i>×</i></button>)}</div>}
        {images.length < COMMUNITY_MEDIA_LIMIT && <label className="community-upload-control"><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => void chooseImages(event)} /><b>＋ 添加图片</b><span>JPG、PNG、WebP · 系统会自动压缩</span></label>}
      </fieldset>
      {error && <p className="community-form-error" role="alert">{error}</p>}
      {message && <p className="community-form-message" role="status">{message}</p>}
      <button className="community-submit" disabled={busy || body.length < 10 || !images.length}>{busy ? "正在处理…" : "提交社区审核"}</button>
    </form>
    <aside className="community-publish-side">
      <section className="community-live-preview"><header><span>实时预览</span><small>社区信息流</small></header><article><div className="preview-author"><i>{displayName.slice(0, 1)}</i><span><b>{displayName}</b><small>刚刚 · 等待审核</small></span></div><div className="preview-media">{images[0] ? <Image src={images[0]} alt="分享预览" fill sizes="320px" unoptimized /> : <Image src="/assets/31.webp" alt="示例预览" fill sizes="320px" />}</div><div className="preview-copy"><span>#{topics.find((topic) => topic.slug === topicSlug)?.name ?? "社区话题"}</span><h3>{title || "你的分享标题"}</h3><p>{body || "你写下的真实体验会显示在这里。"}</p>{productSlugs.length > 0 && <div className="preview-products">{productSlugs.map((slug) => <small key={slug}>＋ {products.find((product) => product.slug === slug)?.name}</small>)}</div>}</div></article></section>
      <section className="community-publish-rules"><p>COMMUNITY STANDARD</p><h2>分享真实，也保护彼此。</h2><ol><li><b>01</b><span>只上传你有权分享的图片，不包含他人隐私信息。</span></li><li><b>02</b><span>避免医疗功效承诺、虚假宣传和引导站外交易。</span></li><li><b>03</b><span>审核结果会通过站内通知同步给你。</span></li></ol><a href="/oferta">查看用户服务协议 →</a></section>
    </aside>
  </div>;
}
