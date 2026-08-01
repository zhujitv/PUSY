import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getCommunityProfileForMember } from "../../../lib/community/posts";
import { getCommunitySocialSummary, listCommunityNotifications } from "../../../lib/community/social";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { CommunityNavigation } from "../CommunityNavigation";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = { title: "站内通知｜PÚSY CLUB", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityNotificationsPage() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent("/community/notifications")}`);
  const [notifications, profile, social] = await Promise.all([
    listCommunityNotifications(viewer.memberId),
    getCommunityProfileForMember(viewer.memberId),
    getCommunitySocialSummary(viewer.memberId),
  ]);
  return <PageShell><CommunityNavigation active="notifications" viewerPublicId={profile?.public_id} unreadCount={social.unreadCount} /><main className="community-notifications-page"><NotificationsClient initialNotifications={notifications} /></main></PageShell>;
}
