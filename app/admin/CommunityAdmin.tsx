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
  products: Array<{ slug: string; name: string; image: string; price: number; verified_purchase: boolean }>;
  promotion_placement: "featured" | "pinned" | "";
  promotion_rank: number;
  promotion_note: string;
  impression_count: number;
  product_click_count: number;
  add_to_cart_count: number;
};

export type CommunityInsights = {
  summary: { impressions: number; productClicks: number; addToCarts: number; measuredPosts: number };
  products: Array<{ productSlug: string; productName: string; productClicks: number; addToCarts: number }>;
};

export type CommunityReport = {
  id: string;
  entity_type: "post" | "comment";
  entity_id: string;
  post_id: string;
  comment_id: string | null;
  reason: "spam" | "abuse" | "misinformation" | "commercial" | "other";
  detail: string;
  status: "pending" | "resolved" | "dismissed";
  resolution_note: string;
  reporter_name: string;
  target_author_name: string;
  target_excerpt: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const statusNames = { pending: "待审核", approved: "公开显示", rejected: "拒绝公开", hidden: "已隐藏" } as const;
const reportReasonNames = { spam: "垃圾或重复内容", abuse: "攻击、骚扰或不友善", misinformation: "虚假或误导信息", commercial: "未标注商业推广", other: "其他问题" } as const;
const reportStatusNames = { pending: "待处理", resolved: "已处理违规", dismissed: "已驳回" } as const;

function ModerationCard({ post, canManage, onAct }: { post: CommunityModerationPost; canManage: boolean; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [status, setStatus] = useState(post.status);
  const [reason, setReason] = useState(post.moderation_note || "");
  const [placement, setPlacement] = useState<"none" | "featured" | "pinned">(post.promotion_placement || "none");
  const [sortOrder, setSortOrder] = useState(post.promotion_rank);
  const [promotionNote, setPromotionNote] = useState(post.promotion_note || "");
  return <article className="community-moderation-card">
    <header><div className="community-admin-author"><i>{post.author_name.slice(0, 1).toUpperCase()}</i><span><b>{post.author_name}</b><small>{post.author_public_id} · 会员 #{post.member_id}</small></span></div><div><em className={`community-status status-${post.status}`}>{statusNames[post.status]}</em><time>{new Date(post.created_at).toLocaleString("zh-CN")}</time></div></header>
    <div className={`community-admin-media count-${post.media_ids.length}`}>{post.media_ids.map((id, index) => <span key={id}><Image src={`/api/community/media/${id}`} alt={`待审社区图片 ${index + 1}`} fill sizes="(max-width: 900px) 50vw, 240px" unoptimized /></span>)}</div>
    <section><small>{post.id}</small>{post.title && <h3>{post.title}</h3>}<p>{post.body}</p>{post.products.length > 0 && <div className="community-admin-products">{post.products.map((product) => <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" key={product.slug}>{product.name}</a>)}</div>}<dl className="community-post-metrics"><div><dt>曝光</dt><dd>{post.impression_count}</dd></div><div><dt>商品点击</dt><dd>{post.product_click_count}</dd></div><div><dt>加购</dt><dd>{post.add_to_cart_count}</dd></div></dl></section>
    <footer>{canManage ? <><label>审核结果<select value={status} onChange={(event) => setStatus(event.target.value as CommunityModerationPost["status"])}><option value="pending">待审核</option><option value="approved">公开显示</option><option value="rejected">拒绝公开</option><option value="hidden">隐藏内容</option></select></label><label>审核说明<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder={status === "rejected" ? "拒绝公开时必须填写，会员可见" : "选填，会员可在自己的主页查看"} /></label><button onClick={() => void onAct({ action: "update-community-post-status", id: post.id, status, reason })}>保存审核结果</button>{post.status === "approved" && <section className="community-promotion-editor"><h4>内容推荐</h4><label>展示位置<select value={placement} onChange={(event) => setPlacement(event.target.value as "none" | "featured" | "pinned")}><option value="none">普通内容</option><option value="featured">精选推荐</option><option value="pinned">社区置顶</option></select></label><label>推荐权重<input type="number" min={0} max={999} value={sortOrder} onChange={(event) => setSortOrder(Math.min(999, Math.max(0, Number(event.target.value))))} /></label><label>运营说明<textarea value={promotionNote} onChange={(event) => setPromotionNote(event.target.value)} maxLength={300} rows={2} placeholder="选填，仅后台可见" /></label><button onClick={() => void onAct({ action: "update-community-promotion", id: post.id, placement, sortOrder, note: promotionNote })}>保存推荐设置</button></section>}</> : <p>当前账号仅可查看社区审核队列。</p>}<a href={`/community/posts/${post.id}`} target="_blank" rel="noopener noreferrer">预览内容 ↗</a></footer>
  </article>;
}

function ReportCard({ report, canManage, onAct }: { report: CommunityReport; canManage: boolean; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [decision, setDecision] = useState<"resolve" | "dismiss">(report.status === "dismissed" ? "dismiss" : "resolve");
  const [note, setNote] = useState(report.resolution_note || "");
  return <article className="community-report-card">
    <header><div><span>{report.entity_type === "post" ? "分享举报" : "评论举报"}</span><strong>{reportReasonNames[report.reason]}</strong></div><em className={`report-${report.status}`}>{reportStatusNames[report.status]}</em></header>
    <section><small>{report.id} · 举报人：{report.reporter_name}</small><h3>{report.target_author_name} 的{report.entity_type === "post" ? "分享" : "评论"}</h3><blockquote>{report.target_excerpt || "内容已不可见"}</blockquote>{report.detail && <p>举报说明：{report.detail}</p>}<a href={`/community/posts/${report.post_id}`} target="_blank" rel="noopener noreferrer">查看关联分享 ↗</a></section>
    <footer>{canManage ? <><label>处理结果<select value={decision} onChange={(event) => setDecision(event.target.value as "resolve" | "dismiss")}><option value="resolve">确认违规并隐藏内容</option><option value="dismiss">驳回举报</option></select></label><label>处理说明<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder={decision === "resolve" ? "确认违规时必须填写" : "选填"} /></label><button onClick={() => void onAct({ action: "update-community-report-status", id: report.id, decision, note })}>保存处理结果</button></> : <p>当前账号仅可查看举报队列。</p>}</footer>
  </article>;
}

export function CommunityAdmin({ posts, reports, insights, canManage, onAct }: { posts: CommunityModerationPost[]; reports: CommunityReport[]; insights: CommunityInsights; canManage: boolean; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const pending = posts.filter((post) => post.status === "pending").length;
  const pendingReports = reports.filter((report) => report.status === "pending").length;
  return <div className="community-admin-workspace">
    <section className="community-insights"><article><span>近 30 天曝光</span><b>{insights.summary.impressions.toLocaleString("zh-CN")}</b><small>{insights.summary.measuredPosts} 篇内容产生数据</small></article><article><span>商品点击</span><b>{insights.summary.productClicks.toLocaleString("zh-CN")}</b><small>{insights.summary.impressions ? `${(insights.summary.productClicks / insights.summary.impressions * 100).toFixed(1)}% 点击率` : "等待曝光数据"}</small></article><article><span>社区加购</span><b>{insights.summary.addToCarts.toLocaleString("zh-CN")}</b><small>{insights.summary.productClicks ? `${(insights.summary.addToCarts / insights.summary.productClicks * 100).toFixed(1)}% 点击后加购` : "等待商品点击"}</small></article></section>
    {insights.products.length > 0 && <section className="admin-panel community-top-products"><div className="admin-panel-title"><div><h2>社区带动商品</h2><p>近 30 天按加购与点击排序。</p></div></div><div>{insights.products.map((product) => <a href={`/products/${product.productSlug}`} target="_blank" rel="noopener noreferrer" key={product.productSlug}><span><b>{product.productName}</b><small>{product.productClicks} 次点击</small></span><strong>{product.addToCarts} 次加购</strong></a>)}</div></section>}
    <section className="admin-panel community-admin-panel"><div className="admin-panel-title"><div><h2>用户举报</h2><p>核查会员举报；确认违规会隐藏对应分享或评论，并写入举报事件与后台操作日志。</p></div><span>{pendingReports} 条待处理</span></div><div className="community-report-list">{reports.length ? reports.map((report) => <ReportCard report={report} canManage={canManage} onAct={onAct} key={report.id} />) : <p className="admin-empty">还没有用户举报</p>}</div></section>
    <section className="admin-panel community-admin-panel"><div className="admin-panel-title"><div><h2>社区内容审核</h2><p>审核会员图文与公开昵称；所有状态变更同时进入社区事件和后台操作日志。</p></div><span>{pending} 条待审核</span></div><div className="community-moderation-list">{posts.length ? posts.map((post) => <ModerationCard post={post} canManage={canManage} onAct={onAct} key={post.id} />) : <p className="admin-empty">还没有社区投稿</p>}</div></section>
  </div>;
}
