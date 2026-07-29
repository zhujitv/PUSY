"use client";

import { useEffect, useState } from "react";

type Review = { id: number; reviewer_name: string; rating: number; title: string; body: string; verified_purchase: number; created_at: string };

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { queueMicrotask(() => {
    void fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => {
      if (response.ok) { setReviews(body.reviews ?? []); setSummary(body.summary ?? { count: 0, average: 0 }); }
    }).catch(() => undefined);
  }); }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("正在提交…");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...payload }) });
    const body = await response.json();
    setMessage(response.ok ? body.message : body.error || "提交失败");
    if (response.ok) event.currentTarget.reset();
    setBusy(false);
  }

  return <section className="product-reviews" id="reviews">
    <div className="reviews-heading"><div><p>真实使用感受</p><h2>商品评价</h2></div><div className="review-score"><b>{summary.count ? summary.average.toFixed(1) : "—"}</b><span>{summary.count ? `${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}` : "暂无评分"}<small>{summary.count} 条评价</small></span></div></div>
    <div className="reviews-layout"><div className="review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><div><b>{review.reviewer_name}</b>{review.verified_purchase ? <em>已购用户</em> : null}<span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p><small>{new Date(review.created_at).toLocaleDateString("zh-CN")}</small></article>) : <div className="review-empty"><h3>还没有公开评价</h3><p>分享你的真实体验，帮助其他顾客做选择。</p></div>}</div>
      <form className="review-form" onSubmit={submit}><h3>写下你的评价</h3><label>评分<select name="rating" defaultValue="5"><option value="5">★★★★★ 非常满意</option><option value="4">★★★★☆ 满意</option><option value="3">★★★☆☆ 一般</option><option value="2">★★☆☆☆ 不太满意</option><option value="1">★☆☆☆☆ 不满意</option></select></label><label>标题<input name="title" maxLength={80} placeholder="一句话总结（选填）" /></label><label>使用感受<textarea name="body" minLength={6} maxLength={1000} rows={5} required placeholder="说说颜色、质地、使用效果或适合场景" /></label><button disabled={busy}>{busy ? "正在提交…" : "提交评价"}</button>{message && <p className="review-message">{message}{message.includes("登录") && <> · <a href="/account/login">前往登录</a></>}</p>}<small>评价提交后需经后台审核，不会公开邮箱和手机号。</small></form></div>
  </section>;
}
