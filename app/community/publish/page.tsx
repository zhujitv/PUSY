import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { PublishCommunityPost } from "./PublishCommunityPost";

export const metadata: Metadata = { title: "发布社区分享｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityPublishPage() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent("/community/publish")}`);
  return <PageShell><main className="community-publish-page"><PublishCommunityPost displayName={viewer.displayName} /></main></PageShell>;
}
