"use client";

import { useEffect, useState } from "react";
import { CommunityIcon } from "./CommunityIcon";
import { recordCommunityEvent } from "./community-client-events";
import Image from "next/image";

export function CommunityShareActions({ postId, postUrl }: { postId: string; postUrl: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const shareUrl = typeof window === "undefined" ? postUrl : new URL(`${postUrl}?source=copy_link`, window.location.origin).toString();
  async function copy() {
    try { await navigator.clipboard.writeText(shareUrl); recordCommunityEvent("share_poster", postId, undefined, undefined, "copy_link"); setMessage("分享链接已复制"); }
    catch { setMessage("请复制浏览器地址分享"); }
  }
  function showPoster() { setOpen(true); recordCommunityEvent("share_poster", postId, undefined, `poster:${postId}`, "wechat"); }
  return <><button type="button" onClick={showPoster}><CommunityIcon name="share" />分享</button>{open && <div className="community-share-modal" role="dialog" aria-modal="true" aria-label="微信分享海报" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section><header><div><span>WECHAT SHARE</span><h2>微信分享海报</h2></div><button onClick={() => setOpen(false)} aria-label="关闭">×</button></header><Image src={`/api/community/posts/${postId}/share-poster?source=wechat`} alt="PÚSY 社区微信分享海报" width={900} height={1200} unoptimized /><footer><a href={`/api/community/posts/${postId}/share-poster?source=wechat`} download={`pusy-community-${postId}.svg`}>保存海报</a><button onClick={() => void copy()}>复制分享链接</button></footer>{message && <p role="status">{message}</p>}</section></div>}</>;
}

export function CommunityShareArrival({ postId, source }: { postId: string; source: "wechat" | "copy_link" }) {
  useEffect(() => {
    const attribution = JSON.stringify({ postId, source, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    try { window.localStorage.setItem("pusy-community-attribution", attribution); } catch {}
    recordCommunityEvent("share_open", postId, undefined, `share-open:${source}:${postId}`, source);
  }, [postId, source]);
  return null;
}
