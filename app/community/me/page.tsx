import { redirect } from "next/navigation";
import { ensureCommunityProfile } from "../../../lib/community/posts";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";

export const dynamic = "force-dynamic";

export default async function MyCommunityPage() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect(`/account/login?returnTo=${encodeURIComponent("/community/me")}`);
  const publicId = await ensureCommunityProfile(viewer.memberId, viewer.displayName.slice(0, 30));
  redirect(`/community/members/${publicId}`);
}
