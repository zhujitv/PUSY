import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { getCommunityProfileForMember } from "../../../lib/community/posts";
import { getCommunitySocialSummary, listCommunityTopics } from "../../../lib/community/social";
import { PublishCommunityPost } from "./PublishCommunityPost";
import { CommunityNavigation } from "../CommunityNavigation";

export const metadata: Metadata = { title: "发布社区分享｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityPublishPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent("/community/publish")}`);
  const [topics, profile, social] = await Promise.all([
    listCommunityTopics(),
    getCommunityProfileForMember(viewer.memberId),
    getCommunitySocialSummary(viewer.memberId),
  ]);
  const requestedTopic = (await searchParams).topic;
  const defaultTopic = topics.some((topic) => topic.slug === requestedTopic) ? requestedTopic : topics[0]?.slug;
  return <PageShell><CommunityNavigation active="publish" viewerPublicId={profile?.public_id} unreadCount={social.unreadCount} /><main className="community-publish-page"><PublishCommunityPost displayName={viewer.displayName} topics={topics} defaultTopic={defaultTopic} /></main></PageShell>;
}
