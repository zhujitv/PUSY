import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "../../../components/SiteChrome";
import { getCommunityMember, getCommunityProfileForMember, listCommunityPosts } from "../../../../lib/community/posts";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { CommunityPostCard } from "../../CommunityPostCard";
import { CommunityNavigation } from "../../CommunityNavigation";
import { FollowButton } from "../../FollowButton";
import { getCommunitySocialSummary } from "../../../../lib/community/social";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const publicId = (await params).id.toUpperCase();
  if (!/^MBR-[A-Z0-9]{12}$/.test(publicId)) return { title: "会员主页未找到｜PÚSY CLUB" };
  try {
    const member = await getCommunityMember(publicId);
    return member ? { title: `${member.display_name} 的社区主页｜PÚSY CLUB`, description: member.bio || `${member.display_name} 在 PÚSY CLUB 的公开分享。` } : { title: "会员主页未找到｜PÚSY CLUB" };
  } catch { return { title: "PÚSY CLUB 会员主页" }; }
}

export default async function CommunityMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const publicId = (await params).id.toUpperCase();
  if (!/^MBR-[A-Z0-9]{12}$/.test(publicId)) notFound();
  const viewer = await getPreviewMemberIdentity();
  const [member, posts, viewerProfile, social] = await Promise.all([
    getCommunityMember(publicId, viewer?.memberId),
    listCommunityPosts({ publicId, viewerMemberId: viewer?.memberId, limit: 48 }),
    viewer ? getCommunityProfileForMember(viewer.memberId) : Promise.resolve(null),
    viewer ? getCommunitySocialSummary(viewer.memberId) : Promise.resolve(null),
  ]);
  if (!member) notFound();
  const isOwner = viewer?.memberId === member.member_id;
  return <PageShell><CommunityNavigation active="profile" viewerPublicId={viewerProfile?.public_id} unreadCount={social?.unreadCount ?? 0} /><main className="community-member-page">
    <section className="community-member-hero">
      <div className="community-profile-avatar" aria-hidden="true">{member.display_name.slice(0, 1).toUpperCase()}</div>
      <div><p>PÚSY CLUB · MEMBER {member.public_id.slice(-6)}</p><h1>{member.display_name}</h1><span>{member.bio || "正在用自己的方式，记录每一次美丽灵感。"}</span><small>PÚSY CLUB 会员 · {new Date(member.joined_at).getFullYear()} 年加入</small></div>
      <aside><span>公开分享<b>{member.post_count}</b></span><a href={`/community/members/${member.public_id}/connections?view=followers`}>关注者<b>{member.follower_count}</b></a><a href={`/community/members/${member.public_id}/connections?view=following`}>正在关注<b>{member.following_count}</b></a>{isOwner ? <a href="/community/publish">发布新分享</a> : <FollowButton publicId={member.public_id} initialFollowing={member.viewer_is_following} signedIn={Boolean(viewer)} loginReturnTo={`/community/members/${member.public_id}`} />}</aside>
    </section>
    <header className="community-member-heading"><div><p>{isOwner ? "MY COMMUNITY NOTES" : "COMMUNITY NOTES"}</p><h2>{isOwner ? "我的分享与审核进度" : `${member.display_name} 的公开分享`}</h2></div><a href="/community">返回社区首页 →</a></header>
    {posts.length ? <section className="community-feed member-feed">{posts.map((post) => <CommunityPostCard post={post} showStatus={isOwner} signedIn={Boolean(viewer)} isOwner={isOwner} key={post.id} />)}</section> : <section className="community-empty"><span>NO NOTES YET</span><h2>{isOwner ? "还没有发布分享" : "还没有公开分享"}</h2><p>{isOwner ? "上传第一篇图文，让真实灵感被更多人看见。" : "审核通过的内容会展示在这里。"}</p>{isOwner && <a href="/community/publish">发布第一篇 →</a>}</section>}
  </main></PageShell>;
}
