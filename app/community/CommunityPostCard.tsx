import Image from "next/image";
import type { CommunityPost } from "../../lib/community/posts";
import { FollowButton } from "./FollowButton";
import { CommunityPostActions } from "./CommunityPostActions";
import { CommunityPostTracker, CommunityProductLinks } from "./CommunityCommerce";

const statusLabels = {
  pending: "审核中",
  draft: "草稿",
  approved: "已公开",
  rejected: "未通过",
  hidden: "已隐藏",
} as const;

export function CommunityPostCard({ post, showStatus = false, signedIn = false, isOwner = false }: { post: CommunityPost; showStatus?: boolean; signedIn?: boolean; isOwner?: boolean }) {
  const postUrl = `/community/posts/${post.id}`;
  return <article className="community-post-card">
    <CommunityPostTracker postId={post.id} />
    <header>
      <a className="community-author" href={`/community/members/${post.author_public_id}`}>
        <i aria-hidden="true">{post.author_name.slice(0, 1).toUpperCase()}</i>
        <span><b>{post.author_name}{post.author_account_type === "official" && <em className="community-official-badge">{post.author_official_label || "官方"}</em>}</b><small>{post.author_account_type === "official" ? "PÚSY 官方创作者" : "PÚSY CLUB 会员"} · {post.follower_count} 位关注者</small></span>
      </a>
      <div className="community-card-author-actions">{!isOwner && <FollowButton publicId={post.author_public_id} initialFollowing={post.viewer_is_following} signedIn={signedIn} loginReturnTo={postUrl} compact />}<time dateTime={post.published_at || post.created_at}>{new Date(post.published_at || post.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</time></div>
    </header>
    <a className={`community-media-grid media-count-${post.media_ids.length}`} href={postUrl} aria-label={`查看${post.author_name}发布的社区内容`}>
      {post.media_ids.map((mediaId, index) => <span key={mediaId}><Image src={`/api/community/media/${mediaId}`} alt={`${post.author_name} 的分享图片 ${index + 1}`} fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" unoptimized /></span>)}
    </a>
    <div className="community-post-copy">
      <div>{showStatus && <em className={`community-status status-${post.status}`}>{statusLabels[post.status]}</em>}{post.promotion_placement && <em className={`community-promotion-badge promotion-${post.promotion_placement}`}>{post.promotion_placement === "pinned" ? "置顶" : "精选"}</em>}<span className="community-card-topics">{post.topics.map((topic) => <a href={`/community?topic=${encodeURIComponent(topic.slug)}#feed`} key={topic.id}>#{topic.name}</a>)}</span></div>
      {post.title && <h2><a href={postUrl}>{post.title}</a></h2>}
      <p>{post.body}</p>
      {showStatus && post.status === "rejected" && post.moderation_note && <aside>审核说明：{post.moderation_note}</aside>}
      <CommunityProductLinks postId={post.id} products={post.products} />
      <CommunityPostActions
        postId={post.id}
        postUrl={postUrl}
        signedIn={signedIn}
        isOwner={isOwner}
        initialLikeCount={post.like_count}
        initialCommentCount={post.comment_count}
        initialBookmarkCount={post.bookmark_count}
        initialLiked={post.viewer_has_liked}
        initialBookmarked={post.viewer_has_bookmarked}
      />
      <footer><a href={postUrl}>查看完整分享 <span>→</span></a><span>图文 · {post.media_ids.length} 张</span></footer>
    </div>
  </article>;
}
