"use client";

import Image from "next/image";
import type { AdminReview } from "./commerce-admin-types";

function reviewImages(value = "[]") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String).slice(0, 3) : []; } catch { return []; } }

export function ReviewsAdmin({ reviews, onAct }: { reviews: AdminReview[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>商品评价审核</h2><p>公开前检查内容真实性与合规性，已购标识由订单自动判断。</p></div><span>{reviews.filter((review) => review.status === "pending").length} 条待审核</span></div><div className="admin-review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><header><div><b>{review.reviewer_name}</b>{review.verified_purchase ? <em>已购用户</em> : null}<span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><small>{review.product_slug}<br />{new Date(review.created_at).toLocaleString("zh-CN")}</small></header>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p>{reviewImages(review.images_json).length > 0 && <div className="review-image-grid admin">{reviewImages(review.images_json).map((src, index) => <Image key={index} src={src} alt={`评价图片 ${index + 1}`} width={180} height={180} unoptimized />)}</div>}<footer><select value={review.status} onChange={(event) => void onAct({ action: "update-review-status", id: review.id, status: event.target.value })}><option value="pending">待审核</option><option value="approved">公开显示</option><option value="rejected">拒绝公开</option></select><a href={`/products/${review.product_slug}`} target="_blank" rel="noopener noreferrer">查看商品</a></footer></article>) : <p className="admin-empty">还没有用户评价</p>}</div></section>;
}
