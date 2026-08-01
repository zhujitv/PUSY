"use client";

import { useState } from "react";
import { CommunityIcon } from "./CommunityIcon";

export function CommunityPostActions({ postUrl }: { postUrl: string }) {
  const [message, setMessage] = useState("");
  function pending(label: string) {
    setMessage(`${label}将在后续互动版本开放`);
    window.setTimeout(() => setMessage(""), 1800);
  }
  async function share() {
    const url = new URL(postUrl, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setMessage("分享链接已复制"); }
    catch { setMessage("请复制浏览器地址分享"); }
    window.setTimeout(() => setMessage(""), 1800);
  }
  return <div className="community-post-actions">
    <div><button type="button" onClick={() => pending("点赞")}><CommunityIcon name="heart" />点赞</button><button type="button" onClick={() => pending("评论")}><CommunityIcon name="comment" />评论</button><button type="button" onClick={() => void share()}><CommunityIcon name="share" />分享</button></div>
    <button type="button" onClick={() => pending("收藏")}><CommunityIcon name="bookmark" />收藏</button>
    {message && <span role="status">{message}</span>}
  </div>;
}
