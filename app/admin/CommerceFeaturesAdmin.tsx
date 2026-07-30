"use client";

import { useState } from "react";

export type AdminReview = { id: number; product_slug: string; reviewer_name: string; rating: number; title: string; body: string; verified_purchase: number; status: string; created_at: string };
export type SiteContent = Record<string, string>;
export type ContentRevision = { id: string; title: string; status: string; publish_at?: string; published_at?: string; created_by: string; created_at: string; updated_at: string };

export function ReviewsAdmin({ reviews, onAct }: { reviews: AdminReview[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>商品评价审核</h2><p>公开前检查内容真实性与合规性，已购标识由订单自动判断。</p></div><span>{reviews.filter((review) => review.status === "pending").length} 条待审核</span></div><div className="admin-review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><header><div><b>{review.reviewer_name}</b>{review.verified_purchase ? <em>已购用户</em> : null}<span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><small>{review.product_slug}<br />{new Date(review.created_at).toLocaleString("zh-CN")}</small></header>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p><footer><select value={review.status} onChange={(event) => void onAct({ action: "update-review-status", id: review.id, status: event.target.value })}><option value="pending">待审核</option><option value="approved">公开显示</option><option value="rejected">拒绝公开</option></select><a href={`/products/${review.product_slug}`} target="_blank" rel="noopener noreferrer">查看商品</a></footer></article>) : <p className="admin-empty">还没有用户评价</p>}</div></section>;
}

const groups = [
  { title: "全站公告", description: "控制页面顶部的即时促销信息。", toggle: ["show_announcement", "显示顶部公告"], fields: [["announcement", "公告内容", "例如：实体商品满 198 元免标准快递费", "text"]] },
  { title: "首屏主活动", description: "首页第一张主视觉的活动主题、标题和行动入口。", fields: [["hero_eyebrow", "活动标识", "例如：púsy × Ü", "text"], ["hero_title", "主标题", "支持换行", "textarea"], ["hero_subtitle", "副标题", "一句话说明活动价值", "text"], ["hero_cta_label", "按钮文字", "例如：立即探索", "text"], ["hero_cta_url", "按钮链接", "站内路径，例如 /catalog/products", "url"]] },
  { title: "第二活动位", description: "轮播第二张内容，可用于礼盒、节日或品牌联名。", fields: [["hero2_eyebrow", "活动标识", "例如：PÚSY 神秘礼盒", "text"], ["hero2_title", "主标题", "支持换行", "textarea"], ["hero2_cta_label", "按钮文字", "例如：了解更多", "text"], ["hero2_cta_url", "按钮链接", "站内路径", "url"]] },
  { title: "精选商品", description: "控制首页商品推荐区的表达和显示状态。", toggle: ["show_featured", "显示精选商品区"], fields: [["featured_title", "区块标题", "例如：当季新品", "text"], ["featured_subtitle", "区块说明", "补充选品理由", "textarea"], ["featured_cta_label", "入口文字", "例如：查看全部", "text"]] },
  { title: "热门分类", description: "运营三个主要分类入口，无需改代码。", toggle: ["show_categories", "显示热门分类区"], fields: [["categories_title", "区块标题", "例如：按心情探索", "text"], ["category_1_label", "分类一名称", "彩妆", "text"], ["category_1_url", "分类一链接", "/catalog/makiyazh", "url"], ["category_2_label", "分类二名称", "护肤", "text"], ["category_2_url", "分类二链接", "/catalog/uhod", "url"], ["category_3_label", "分类三名称", "家居", "text"], ["category_3_url", "分类三链接", "/catalog/dlya-doma", "url"]] },
  { title: "短视频与订阅", description: "维护社区内容标题和邮件订阅表达。", fields: [["reels_title", "短视频标题", "例如：你与 PÚSY", "text"], ["reels_subtitle", "短视频说明", "内容定位说明", "textarea"], ["newsletter_title", "订阅标题", "例如：订阅邮件，立享 9 折", "text"], ["newsletter_success", "订阅成功提示", "提交后的反馈文案", "text"]], toggles: [["show_reels", "显示短视频区"], ["show_newsletter", "显示邮件订阅区"]] },
] as const;

const revisionLabels: Record<string, string> = { draft: "草稿", scheduled: "待发布", published: "当前版本", archived: "历史版本" };

export function ContentAdmin({ content, revisions, onAct }: { content: SiteContent; revisions: ContentRevision[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [preview, setPreview] = useState(content);

  function snapshot(form: HTMLFormElement) {
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries()) as Record<string, string>;
    for (const key of ["show_announcement", "show_featured", "show_categories", "show_reels", "show_newsletter"]) values[key] = data.has(key) ? "1" : "0";
    return values;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value || "publish";
    const values = snapshot(event.currentTarget);
    const action = intent === "draft" ? "save-content-draft" : intent === "schedule" ? "schedule-site-content" : "update-site-content";
    const publishAt = values.publishAt ? new Date(values.publishAt).toISOString() : "";
    await onAct({ action, title: values.versionTitle, publishAt, content: values });
  }

  return <div className="content-studio">
    <section className="content-studio-hero"><div><span>CONTENT STUDIO</span><h2>首页内容工作台</h2><p>分区维护首页内容，先预览，再保存草稿、定时发布或立即上线。</p></div><div><b>{revisions.filter((item) => item.status === "draft").length}</b><small>草稿</small><b>{revisions.filter((item) => item.status === "scheduled").length}</b><small>待发布</small><a href="/" target="_blank" rel="noopener noreferrer">打开线上首页 ↗</a></div></section>
    <div className="content-studio-layout">
      <form className="content-editor" onSubmit={submit} onInput={(event) => setPreview((current) => ({ ...current, ...snapshot(event.currentTarget) }))}>
        <section className="content-release-bar"><label>版本名称<input name="versionTitle" placeholder="例如：七夕礼盒首页" maxLength={100} /></label><label>定时发布时间<input name="publishAt" type="datetime-local" /></label><div><button type="submit" name="intent" value="draft" className="secondary">保存草稿</button><button type="submit" name="intent" value="schedule" className="secondary">定时发布</button><button type="submit" name="intent" value="publish">立即发布</button></div></section>
        {groups.map((group, groupIndex) => <details className="content-group" open={groupIndex < 2} key={group.title}><summary><span>{String(groupIndex + 1).padStart(2, "0")}</span><div><b>{group.title}</b><small>{group.description}</small></div><i>＋</i></summary><div className="content-group-fields">{"toggle" in group && group.toggle && <label className="content-toggle"><input name={group.toggle[0]} type="checkbox" defaultChecked={content[group.toggle[0]] !== "0"} /><span><b>{group.toggle[1]}</b><small>关闭后首页将隐藏这个模块</small></span></label>}{"toggles" in group && group.toggles?.map(([key, label]) => <label className="content-toggle" key={key}><input name={key} type="checkbox" defaultChecked={content[key] !== "0"} /><span><b>{label}</b><small>关闭后首页将隐藏这个模块</small></span></label>)}{group.fields.map(([key, label, help, type]) => <label className={type === "textarea" ? "wide" : ""} key={key}>{label}{type === "textarea" ? <textarea name={key} defaultValue={content[key] ?? ""} rows={3} maxLength={300} /> : <input name={key} defaultValue={content[key] ?? ""} maxLength={300} />}<small>{help} · {(preview[key] ?? content[key] ?? "").length}/300</small></label>)}</div></details>)}
      </form>
      <aside className="content-preview"><header><span>实时预览</span><i><em /><em /><em /></i></header>{preview.show_announcement !== "0" && <div className="content-preview-announcement">{preview.announcement}</div>}<div className="content-preview-hero"><small>{preview.hero_eyebrow}</small><h3>{preview.hero_title}</h3><p>{preview.hero_subtitle}</p><b>{preview.hero_cta_label} →</b></div>{preview.show_featured !== "0" && <div className="content-preview-section"><small>精选商品</small><h3>{preview.featured_title}</h3><p>{preview.featured_subtitle}</p><div><i /><i /><i /></div></div>}{preview.show_categories !== "0" && <div className="content-preview-categories"><h3>{preview.categories_title}</h3><div><span>{preview.category_1_label}</span><span>{preview.category_2_label}</span><span>{preview.category_3_label}</span></div></div>}{preview.show_reels !== "0" && <div className="content-preview-section dark"><small>社区内容</small><h3>{preview.reels_title}</h3><p>{preview.reels_subtitle}</p></div>}</aside>
    </div>
    <section className="admin-panel content-history"><div className="admin-panel-title"><div><h2>版本历史</h2><p>已发布版本可以一键恢复；草稿和待发布版本可以继续发布或删除。</p></div><span>{revisions.length} 个版本</span></div><div>{revisions.length ? revisions.map((revision) => <article key={revision.id}><div><span className={`content-version-status status-${revision.status}`}>{revisionLabels[revision.status] ?? revision.status}</span><b>{revision.title}</b><small>{revision.id} · {revision.created_by}<br />创建于 {new Date(revision.created_at).toLocaleString("zh-CN")}{revision.publish_at ? ` · 计划 ${new Date(revision.publish_at).toLocaleString("zh-CN")}` : ""}</small></div><div>{revision.status !== "published" && <button onClick={() => void onAct({ action: "publish-content-revision", id: revision.id })}>{revision.status === "archived" ? "恢复此版本" : "立即发布"}</button>}{["draft", "scheduled"].includes(revision.status) && <button className="danger" onClick={() => void onAct({ action: "delete-content-revision", id: revision.id })}>删除</button>}</div></article>) : <p className="admin-empty">首次发布后，版本记录会显示在这里。</p>}</div></section>
  </div>;
}
