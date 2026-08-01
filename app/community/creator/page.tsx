import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { ensureCommunityProfile, getCommunityProfileForMember } from "../../../lib/community/posts";
import { getCommunitySocialSummary } from "../../../lib/community/social";
import { getCreatorDashboard, listCommunityCampaigns } from "../../../lib/community/creator";
import { CommunityNavigation } from "../CommunityNavigation";
import { CreatorWorkspace } from "./CreatorWorkspace";

export const metadata: Metadata = { title: "创作中心｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityCreatorPage() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent("/community/creator")}`);
  await ensureCommunityProfile(viewer.memberId, viewer.displayName.slice(0, 30));
  const [dashboard, social, profile, campaigns] = await Promise.all([
    getCreatorDashboard(viewer.memberId),
    getCommunitySocialSummary(viewer.memberId),
    getCommunityProfileForMember(viewer.memberId),
    listCommunityCampaigns(),
  ]);
  const stats = dashboard.stats;
  return <PageShell><CommunityNavigation active="creator" viewerPublicId={profile?.public_id} unreadCount={social.unreadCount} /><main className="community-creator-page">
    <section className="creator-hero"><div><span>CREATOR STUDIO · PHASE 05</span><h1>把真实体验，<br />变成长期影响力。</h1><p>{dashboard.profile?.creator_status === "restricted" ? "当前账号的投稿与积分资格暂时受限，请根据审核说明修正内容。" : "管理草稿与历史版本，查看内容表现，并参与 PÚSY 主题活动。"}</p></div><aside><small>可用积分</small><b>{Number(dashboard.points.points_balance).toLocaleString("zh-CN")}</b><span>{dashboard.points.tier} 会员 · 累计 {Number(dashboard.points.lifetime_points).toLocaleString("zh-CN")}</span></aside></section>
    <section className="creator-kpis"><article><span>内容总数</span><b>{stats.total_posts ?? 0}</b><small>{stats.draft_posts ?? 0} 篇草稿</small></article><article><span>累计曝光</span><b>{stats.impressions ?? 0}</b><small>{stats.approved_posts ?? 0} 篇已公开</small></article><article><span>真实互动</span><b>{(stats.likes ?? 0) + (stats.comments ?? 0)}</b><small>{stats.likes ?? 0} 赞 · {stats.comments ?? 0} 评论</small></article><article><span>商品贡献</span><b>{stats.add_to_carts ?? 0}</b><small>{stats.product_clicks ?? 0} 次商品点击</small></article></section>
    {campaigns.length > 0 && <section className="creator-campaign-strip"><header><div><span>ACTIVE CAMPAIGNS</span><h2>正在进行的主题活动</h2></div></header><div>{campaigns.map((campaign) => <article key={campaign.id}><small>{campaign.topic_name ? `#${campaign.topic_name}` : "PÚSY 主题活动"}</small><h3>{campaign.title}</h3><p>{campaign.description}</p><footer><span>入选奖励最高 {campaign.reward_points} 积分</span><a href={`/community/publish?${campaign.topic_slug ? `topic=${encodeURIComponent(campaign.topic_slug)}&` : ""}campaign=${encodeURIComponent(campaign.slug)}`}>参与活动 →</a></footer></article>)}</div></section>}
    <CreatorWorkspace posts={dashboard.posts as Parameters<typeof CreatorWorkspace>[0]["posts"]} />
  </main></PageShell>;
}
