import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "../../../components/SiteChrome";
import { getCommunityPost } from "../../../../lib/community/posts";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { CommunityPostCard } from "../../CommunityPostCard";

export const metadata: Metadata = { title: "社区分享｜PÚSY CLUB" };
export const dynamic = "force-dynamic";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^PST-[A-Z0-9]{12}$/.test(id)) notFound();
  const viewer = await getPreviewMemberIdentity();
  const post = await getCommunityPost(id, viewer?.memberId);
  if (!post) notFound();
  const isOwner = viewer?.memberId === post.member_id;
  return <PageShell><main className="community-post-page"><nav><a href="/community">← 返回社区</a><a href={`/community/members/${post.author_public_id}`}>查看会员主页 →</a></nav>{isOwner && post.status !== "approved" && <p className={`community-detail-status status-${post.status}`}>{post.status === "pending" ? "这篇分享正在审核中，仅你和内容管理员可以查看。" : `这篇分享未公开${post.moderation_note ? `：${post.moderation_note}` : "。"}`}</p>}<CommunityPostCard post={post} showStatus={isOwner} /></main></PageShell>;
}
