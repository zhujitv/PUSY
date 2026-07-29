"use client";

export type AdminReview = { id: number; product_slug: string; reviewer_name: string; rating: number; title: string; body: string; verified_purchase: number; status: string; created_at: string };
export type SiteContent = Record<string, string>;

export function ReviewsAdmin({ reviews, onAct }: { reviews: AdminReview[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>商品评价审核</h2><p>公开前检查内容真实性与合规性，已购标识由订单自动判断。</p></div><span>{reviews.filter((review) => review.status === "pending").length} 条待审核</span></div><div className="admin-review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><header><div><b>{review.reviewer_name}</b>{review.verified_purchase ? <em>已购用户</em> : null}<span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><small>{review.product_slug}<br />{new Date(review.created_at).toLocaleString("zh-CN")}</small></header>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p><footer><select value={review.status} onChange={(event) => void onAct({ action: "update-review-status", id: review.id, status: event.target.value })}><option value="pending">待审核</option><option value="approved">公开显示</option><option value="rejected">拒绝公开</option></select><a href={`/products/${review.product_slug}`} target="_blank">查看商品</a></footer></article>) : <p className="admin-empty">还没有用户评价</p>}</div></section>;
}

const contentFields = [
  ["announcement", "顶部公告", "例如：订单满 600 元免费配送"],
  ["hero_eyebrow", "首页活动标识", "例如：púsy × Ü"],
  ["hero_title", "首页主标题", "可换行输入"],
  ["hero_subtitle", "首页副标题", "活动说明"],
  ["featured_title", "首页商品区标题", "例如：新品"],
] as const;

export function ContentAdmin({ content, onAct }: { content: SiteContent; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>首页内容运营</h2><p>保存后首页会自动读取最新文案，无需修改代码。</p></div><a href="/" target="_blank">预览首页</a></div><form className="content-admin-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void onAct({ action: "update-site-content", content: values }); }}>{contentFields.map(([key, label, help]) => <label key={key}>{label}{key === "hero_title" ? <textarea name={key} defaultValue={content[key] ?? ""} rows={3} /> : <input name={key} defaultValue={content[key] ?? ""} />}<small>{help}</small></label>)}<button className="admin-save">保存首页内容</button></form></section>;
}
