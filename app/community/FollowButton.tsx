"use client";

import { useState } from "react";

export function FollowButton({ publicId, initialFollowing, signedIn, loginReturnTo, compact = false }: { publicId: string; initialFollowing: boolean; signedIn: boolean; loginReturnTo: string; compact?: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(loginReturnTo)}`; return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/community/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || "关注操作失败"); return; }
      setFollowing(Boolean(result.following));
    } catch { setError("网络连接失败"); }
    finally { setBusy(false); }
  }

  return <span className={`community-follow-wrap ${compact ? "compact" : ""}`}><button type="button" className={following ? "followed" : ""} disabled={busy} onClick={() => void toggle()}>{busy ? "处理中…" : following ? "已关注" : "+ 关注"}</button>{error && <small role="alert">{error}</small>}</span>;
}
