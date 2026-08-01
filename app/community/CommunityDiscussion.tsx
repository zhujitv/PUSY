"use client";

import { useMemo, useState } from "react";
import type { CommunityComment } from "../../lib/community/engagement";
import { CommunityReportButton } from "./CommunityReportButton";

export function CommunityDiscussion({ postId, initialComments, signedIn }: { postId: string; initialComments: CommunityComment[]; signedIn: boolean }) {
  const postUrl = `/community/posts/${postId}`;
  const [comments, setComments] = useState(initialComments);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const roots = useMemo(() => comments.filter((comment) => !comment.parent_comment_id), [comments]);
  const replies = useMemo(() => {
    const grouped = new Map<string, CommunityComment[]>();
    for (const comment of comments) {
      if (!comment.parent_comment_id) continue;
      grouped.set(comment.parent_comment_id, [...(grouped.get(comment.parent_comment_id) ?? []), comment]);
    }
    return grouped;
  }, [comments]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(`${postUrl}#comments`)}`; return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, parentCommentId: replyTo?.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "评论发布失败"); return; }
      if (result.comment) setComments((current) => [...current, result.comment]);
      setBody(""); setReplyTo(null); setMessage("评论已发布");
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("确认删除这条评论？")) return;
    const response = await fetch(`/api/community/comments/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.error || "评论删除失败"); return; }
    setComments((current) => current.filter((comment) => comment.id !== id).map((comment) => comment.parent_comment_id === id ? { ...comment, parent_comment_id: null } : comment));
    setMessage("评论已删除");
  }

  function item(comment: CommunityComment, nested = false) {
    return <article className={nested ? "reply" : ""} key={comment.id}>
      <a className="community-comment-author" href={`/community/members/${comment.author_public_id}`}><i>{comment.author_name.slice(0, 1)}</i><span><strong>{comment.author_name}</strong><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span></a>
      <p>{comment.body}</p>
      <footer><button type="button" onClick={() => { setReplyTo({ id: comment.id, name: comment.author_name }); setMessage(""); }}>回复</button>{comment.viewer_is_author ? <button type="button" onClick={() => void remove(comment.id)}>删除</button> : <CommunityReportButton entityType="comment" entityId={comment.id} signedIn={signedIn} loginReturnTo={`${postUrl}#comments`} compact />}</footer>
    </article>;
  }

  return <section className="community-discussion" id="comments">
    <header><div><span>COMMUNITY CONVERSATION</span><h2>评论与回复</h2></div><b>{comments.length} 条讨论</b></header>
    <form className="community-comment-form" onSubmit={submit}>
      {replyTo && <p>正在回复 <strong>{replyTo.name}</strong><button type="button" onClick={() => setReplyTo(null)}>取消回复</button></p>}
      <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={2} maxLength={500} rows={4} placeholder={signedIn ? "写下真实、尊重、有帮助的评论…" : "登录后参与讨论"} disabled={!signedIn || busy} required />
      <div><small>{body.length}/500</small>{signedIn ? <button disabled={busy || body.trim().length < 2}>{busy ? "发布中…" : replyTo ? "发布回复" : "发布评论"}</button> : <a href={`/account/login?returnTo=${encodeURIComponent(`${postUrl}#comments`)}`}>登录后评论</a>}</div>
      {message && <span role="status">{message}</span>}
    </form>
    <div className="community-comment-list">{roots.length ? roots.map((comment) => <section key={comment.id}>{item(comment)}{(replies.get(comment.id) ?? []).map((reply) => item(reply, true))}</section>) : <div className="community-empty"><span>START THE CONVERSATION</span><h3>还没有评论</h3><p>分享你的真实使用感受，开启第一段讨论。</p></div>}</div>
  </section>;
}
