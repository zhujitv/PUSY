import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "../../../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { getCommunityPost, getCommunityProfileForMember } from "../../../../../lib/community/posts";
import { getCommunitySocialSummary, listCommunityTopics } from "../../../../../lib/community/social";
import { listCommunityProductOptions } from "../../../../../lib/community/commerce";
import { CommunityNavigation } from "../../../CommunityNavigation";
import { CreatorPostEditor } from "./CreatorPostEditor";

export const metadata: Metadata = { title: "编辑社区分享｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.toUpperCase();
  if (!/^PST-[A-Z0-9]{12}$/.test(id)) notFound();
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent(`/community/posts/${id}/edit`)}`);
  const [post, topics, products, profile, social] = await Promise.all([getCommunityPost(id, viewer.memberId), listCommunityTopics(), listCommunityProductOptions(), getCommunityProfileForMember(viewer.memberId), getCommunitySocialSummary(viewer.memberId)]);
  if (!post || post.member_id !== viewer.memberId || post.status === "hidden") notFound();
  return <PageShell><CommunityNavigation active="creator" viewerPublicId={profile?.public_id} unreadCount={social.unreadCount} /><main className="community-creator-page"><CreatorPostEditor post={{ id: post.id, title: post.title, body: post.body, updatedAt: post.updated_at, mediaIds: post.media_ids, topicSlugs: post.topics.map((topic) => topic.slug), productSlugs: post.products.map((product) => product.slug), experience: post.experience }} topics={topics} products={products} /></main></PageShell>;
}
