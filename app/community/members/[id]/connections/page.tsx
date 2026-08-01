import { notFound } from "next/navigation";
import { PageShell } from "../../../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { getCommunityProfileForMember } from "../../../../../lib/community/posts";
import { getCommunitySocialSummary, listCommunityConnections } from "../../../../../lib/community/social";
import { CommunityNavigation } from "../../../CommunityNavigation";
import { FollowButton } from "../../../FollowButton";

export const dynamic = "force-dynamic";

export default async function CommunityConnectionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const publicId = (await params).id.toUpperCase();
  if (!/^MBR-[A-Z0-9]{12}$/.test(publicId)) notFound();
  const viewer = await getPreviewMemberIdentity();
  const [connections, profile, social] = await Promise.all([
    listCommunityConnections(publicId, viewer?.memberId),
    viewer ? getCommunityProfileForMember(viewer.memberId) : Promise.resolve(null),
    viewer ? getCommunitySocialSummary(viewer.memberId) : Promise.resolve(null),
  ]);
  if (!connections) notFound();
  const view = (await searchParams).view === "following" ? "following" : "followers";
  const people = connections[view];
  return <PageShell><CommunityNavigation active="profile" viewerPublicId={profile?.public_id} unreadCount={social?.unreadCount ?? 0} /><main className="community-connections-page"><nav><a href={`/community/members/${publicId}`}>← 返回会员主页</a></nav><header><span>COMMUNITY CONNECTIONS</span><h1>{connections.member.display_name} 的{view === "followers" ? "关注者" : "正在关注"}</h1><div><a className={view === "followers" ? "active" : ""} href={`?view=followers`}>关注者 {connections.followers.length}</a><a className={view === "following" ? "active" : ""} href={`?view=following`}>正在关注 {connections.following.length}</a></div></header><section>{people.length ? people.map((person) => <article key={person.public_id}><a href={`/community/members/${person.public_id}`}><i>{person.display_name.slice(0, 1)}</i><span><strong>{person.display_name}</strong><small>{person.bio || person.public_id}</small></span></a>{profile?.public_id !== person.public_id && <FollowButton publicId={person.public_id} initialFollowing={person.viewer_is_following} signedIn={Boolean(viewer)} loginReturnTo={`/community/members/${publicId}/connections?view=${view}`} compact />}</article>) : <p>这里还没有会员关系。</p>}</section></main></PageShell>;
}
