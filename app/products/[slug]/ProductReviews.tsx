"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Review = { id: number; reviewer_name: string; rating: number; title: string; body: string; verified_purchase: number; images_json: string; created_at: string };

function images(value: string) {
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.map(String).slice(0, 3) : []; } catch { return []; }
}

async function compressReviewImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error("仅支持 JPG、PNG 或 WebP 图片");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .78));
  if (!blob || blob.size > 400_000) throw new Error("图片压缩后仍然过大，请选择更小的图片");
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("图片读取失败")); reader.readAsDataURL(blob); });
}

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewImages, setReviewImages] = useState<string[]>([]);

  useEffect(() => { queueMicrotask(() => {
    void fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => {
      if (response.ok) { setReviews(body.reviews ?? []); setSummary(body.summary ?? { count: 0, average: 0 }); }
    }).catch(() => undefined);
  }); }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("正在提交…");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...payload, images: reviewImages }) });
    const body = await response.json();
    setMessage(response.ok ? body.message : body.error || "提交失败");
    if (response.ok) { event.currentTarget.reset(); setReviewImages([]); }
    setBusy(false);
  }

  async function chooseImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - reviewImages.length));
    if (!files.length) return;
    setBusy(true); setMessage("正在处理图片…");
    try {
      const prepared = await Promise.all(files.map(compressReviewImage));
      setReviewImages((current) => [...current, ...prepared].slice(0, 3));
      setMessage("图片已准备好，提交评价后将进入审核");
    } catch (error) { setMessage(error instanceof Error ? error.message : "图片处理失败"); }
    event.target.value = ""; setBusy(false);
  }

  return <section className="product-reviews" id="reviews">
    <div className="reviews-heading"><div><p>真实使用感受</p><h2>商品评价</h2></div><div className="review-score"><b>{summary.count ? summary.average.toFixed(1) : "—"}</b><span>{summary.count ? `${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}` : "暂无评分"}<small>{summary.count} 条评价</small></span></div></div>
    <div className="reviews-layout"><div className="review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><div><b>{review.reviewer_name}</b>{review.verified_purchase ? <em>已购用户</em> : null}<span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p>{images(review.images_json).length > 0 && <div className="review-image-grid">{images(review.images_json).map((src, index) => <Image key={index} src={src} alt={`${review.reviewer_name} 的评价图片 ${index + 1}`} width={320} height={320} unoptimized />)}</div>}<small>{new Date(review.created_at).toLocaleDateString("zh-CN")}</small></article>) : <div className="review-empty"><h3>还没有公开评价</h3><p>分享你的真实体验，帮助其他顾客做选择。</p></div>}</div>
      <form className="review-form" onSubmit={submit}><h3>写下你的评价</h3><label>评分<select name="rating" defaultValue="5"><option value="5">★★★★★ 非常满意</option><option value="4">★★★★☆ 满意</option><option value="3">★★★☆☆ 一般</option><option value="2">★★☆☆☆ 不太满意</option><option value="1">★☆☆☆☆ 不满意</option></select></label><label>标题<input name="title" maxLength={80} placeholder="一句话总结（选填）" /></label><label>使用感受<textarea name="body" minLength={6} maxLength={1000} rows={5} required placeholder="说说颜色、质地、使用效果或适合场景" /></label><label className="review-upload">使用图片（最多 3 张）<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || reviewImages.length >= 3} onChange={(event) => void chooseImages(event)} /><span>图片会在浏览器中压缩后提交，审核通过可获得额外积分。</span></label>{reviewImages.length > 0 && <div className="review-image-grid editing">{reviewImages.map((src, index) => <button type="button" key={index} onClick={() => setReviewImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label={`移除第 ${index + 1} 张图片`}><Image src={src} alt="待提交评价图片" width={160} height={160} unoptimized /><i>×</i></button>)}</div>}<button disabled={busy}>{busy ? "正在处理…" : "提交评价"}</button>{message && <p className="review-message">{message}{message.includes("登录") && <> · <a href="/account/login">前往登录</a></>}</p>}<small>评价提交后需经后台审核，不会公开邮箱和手机号。</small></form></div>
  </section>;
}
