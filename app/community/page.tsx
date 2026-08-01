import type { Metadata } from "next";
import { PageShell } from "../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { listCommunityPosts, type CommunityPost } from "../../lib/community/posts";
import { CommunityPostCard } from "./CommunityPostCard";

export const metadata: Metadata = {
  title: "PÚSY CLUB 社区｜真实美妆灵感",
  description: "浏览 PÚSY CLUB 会员分享的真实妆容、护理体验与日常灵感。",
  alternates: { canonical: "https://pusy.cn/community" },
};
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  let posts: CommunityPost[] = [];
  let viewer: Awaited<ReturnType<typeof getPreviewMemberIdentity>> = null;
  let unavailable = false;
  try {
    [posts, viewer] = await Promise.all([listCommunityPosts(), getPreviewMemberIdentity()]);
  } catch {
    unavailable = true;
  }

  const loginUrl = `/account/login?returnTo=${encodeURIComponent("/community/publish")}`;
  return <PageShell><main className="community-page">
    <section className="community-hero">
      <div className="community-hero-copy"><p>PÚSY CLUB · COMMUNITY</p><h1>让真实灵感，<br />被更多人看见。</h1><span>分享妆容、护理心得和让你心动的日常。每一篇公开内容都来自已登录会员，并经过社区审核。</span><div><a className="primary" href={viewer ? "/community/publish" : loginUrl}>{viewer ? "发布我的分享" : "登录后发布"}</a>{viewer && <a href="/community/me">我的社区主页</a>}</div></div>
      <aside><span>PHASE 01</span><b>真实会员<br />图文社区</b><p>一期聚焦发布、审核与公开展示。关注、话题和站内通知已预留接口，将在第二期开放。</p></aside>
    </section>

    <section className="community-intro">
      <div><p>THE PÚSY PEOPLE</p><h2>社区新鲜分享</h2></div>
      <ol><li><b>01</b><span>会员实名登录<small>公开页不展示联系方式</small></span></li><li><b>02</b><span>图文真实表达<small>每篇 1–4 张图片</small></span></li><li><b>03</b><span>后台审核公开<small>共同维护内容质量</small></span></li></ol>
    </section>

    {unavailable ? <section className="community-empty"><span>COMMUNITY SERVICE</span><h2>社区正在准备中</h2><p>数据库迁移完成后，这里会展示会员的最新分享。</p></section>
      : posts.length ? <section className="community-feed" aria-label="社区公开内容">{posts.map((post) => <CommunityPostCard post={post} key={post.id} />)}</section>
        : <section className="community-empty"><span>BE THE FIRST</span><h2>第一篇分享，等你发布</h2><p>上传你的图片和真实感受，审核通过后会展示在这里。</p><a href={viewer ? "/community/publish" : loginUrl}>开始分享 →</a></section>}
  </main></PageShell>;
}
