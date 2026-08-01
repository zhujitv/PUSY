import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { getCommunityProfileForMember } from "../../../lib/community/posts";
import { getCommunitySocialSummary, listCommunityTopics } from "../../../lib/community/social";
import { PublishCommunityPost } from "./PublishCommunityPost";
import { CommunityNavigation } from "../CommunityNavigation";
import { listCommunityProductOptions, type CommunityProductOption } from "../../../lib/community/commerce";
import { products as catalogProducts } from "../../data/products";

export const metadata: Metadata = { title: "发布社区分享｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityPublishPage({ searchParams }: { searchParams: Promise<{ topic?: string; product?: string }> }) {
  const [viewer, requested] = await Promise.all([getPreviewMemberIdentity(), searchParams]);
  if (!viewer) {
    const returnParams = new URLSearchParams();
    if (/^[a-z0-9-]{2,40}$/.test(requested.topic ?? "")) returnParams.set("topic", requested.topic!);
    if (/^[a-z0-9][a-z0-9-]{1,119}$/.test(requested.product ?? "")) returnParams.set("product", requested.product!);
    const returnTo = `/community/publish${returnParams.size ? `?${returnParams}` : ""}`;
    redirect(`/account/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  const [topics, profile, social, productOptions] = await Promise.all([
    listCommunityTopics(),
    getCommunityProfileForMember(viewer.memberId),
    getCommunitySocialSummary(viewer.memberId),
    listCommunityProductOptions().catch(() => catalogProducts.filter((product) => !product.slug.startsWith("gift-card-")).map((product): CommunityProductOption => ({ slug: product.slug, name: product.name, image: product.image, price: product.price }))),
  ]);
  const requestedTopic = requested.topic;
  const defaultTopic = topics.some((topic) => topic.slug === requestedTopic) ? requestedTopic : topics[0]?.slug;
  const defaultProduct = productOptions.some((product) => product.slug === requested.product) ? requested.product : undefined;
  return <PageShell><CommunityNavigation active="publish" viewerPublicId={profile?.public_id} unreadCount={social.unreadCount} /><main className="community-publish-page"><PublishCommunityPost displayName={viewer.displayName} topics={topics} products={productOptions} defaultTopic={defaultTopic} defaultProduct={defaultProduct} /></main></PageShell>;
}
