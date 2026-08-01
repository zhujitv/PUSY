"use client";

import { useState } from "react";
import { CommunityIcon } from "./CommunityIcon";
import { CommunityReportButton } from "./CommunityReportButton";

export function CommunityPostActions({ postId, postUrl, signedIn, isOwner, initialLikeCount, initialCommentCount, initialBookmarkCount, initialLiked, initialBookmarked }: {
  postId: string;
  postUrl: string;
  signedIn: boolean;
  isOwner: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  initialBookmarkCount: number;
  initialLiked: boolean;
  initialBookmarked: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"like" | "bookmark" | "">("");
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);

  async function mutate(kind: "like" | "bookmark") {
    if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(postUrl)}`; return; }
    if (kind === "like" && isOwner) { setMessage("不能给自己的分享点赞"); return; }
    const enabled = kind === "like" ? !liked : !bookmarked;
    setBusy(kind); setMessage("");
    try {
      const response = await fetch(`/api/community/posts/${postId}/interactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, enabled }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "互动操作失败"); return; }
      setLiked(Boolean(result.liked));
      setBookmarked(Boolean(result.bookmarked));
      setLikeCount(Number(result.likeCount ?? 0));
      setBookmarkCount(Number(result.bookmarkCount ?? 0));
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusy(""); }
  }
  async function share() {
    const url = new URL(postUrl, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setMessage("分享链接已复制"); }
    catch { setMessage("请复制浏览器地址分享"); }
    window.setTimeout(() => setMessage(""), 1800);
  }
  return <div className="community-post-actions">
    <div>
      <button type="button" className={liked ? "active" : ""} aria-pressed={liked} disabled={busy === "like"} onClick={() => void mutate("like")}><CommunityIcon name="heart" />{likeCount || "点赞"}</button>
      <a href={`${postUrl}#comments`}><CommunityIcon name="comment" />{initialCommentCount || "评论"}</a>
      <button type="button" onClick={() => void share()}><CommunityIcon name="share" />分享</button>
    </div>
    <div className="community-post-secondary-actions"><button type="button" className={bookmarked ? "active" : ""} aria-pressed={bookmarked} disabled={busy === "bookmark"} onClick={() => void mutate("bookmark")}><CommunityIcon name="bookmark" />{bookmarkCount || "收藏"}</button>{!isOwner && <CommunityReportButton entityType="post" entityId={postId} signedIn={signedIn} loginReturnTo={postUrl} compact />}</div>
    {message && <span role="status">{message}</span>}
  </div>;
}
