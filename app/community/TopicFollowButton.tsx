"use client";

import { useState } from "react";

export function TopicFollowButton({ slug, initialFollowing, initialCount, signedIn, returnTo }: { slug: string; initialFollowing: boolean; initialCount: number; signedIn: boolean; returnTo: string }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(returnTo)}`; return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/community/topics", { method: following ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "话题关注失败"); return; }
      setFollowing(Boolean(result.following)); setCount(Number(result.followerCount ?? count));
    } catch { setMessage("网络连接失败"); }
    finally { setBusy(false); }
  }
  return <span className="community-topic-follow"><button type="button" className={following ? "followed" : ""} disabled={busy} onClick={() => void toggle()}>{following ? "已关注话题" : "+ 关注话题"}</button><small>{count} 人关注</small>{message && <em role="alert">{message}</em>}</span>;
}
