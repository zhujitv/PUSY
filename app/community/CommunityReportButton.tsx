"use client";

import { useState } from "react";

const reasonOptions = [
  ["spam", "垃圾或重复内容"],
  ["abuse", "攻击、骚扰或不友善"],
  ["misinformation", "虚假或误导信息"],
  ["commercial", "未标注的商业推广"],
  ["other", "其他问题"],
] as const;

export function CommunityReportButton({ entityType, entityId, signedIn, loginReturnTo, compact = false }: { entityType: "post" | "comment"; entityId: string; signedIn: boolean; loginReturnTo: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(loginReturnTo)}`; return; }
    setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reason: values.reason, detail: values.detail }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "举报提交失败"); return; }
      setMessage("已提交，内容管理员会尽快核查");
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusy(false); }
  }

  return <span className={`community-report-control ${compact ? "compact" : ""}`}>
    <button type="button" className="community-report-trigger" onClick={() => {
      if (!signedIn) { window.location.href = `/account/login?returnTo=${encodeURIComponent(loginReturnTo)}`; return; }
      setOpen((value) => !value); setMessage("");
    }}>举报</button>
    {open && <form onSubmit={submit}>
      <strong>举报这条{entityType === "post" ? "分享" : "评论"}</strong>
      <label>原因<select name="reason" defaultValue="spam">{reasonOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>补充说明<textarea name="detail" maxLength={500} rows={3} placeholder="选填；选择“其他问题”时请填写" /></label>
      {message && <p role="status">{message}</p>}
      <div><button type="button" onClick={() => setOpen(false)}>取消</button><button disabled={busy}>{busy ? "提交中…" : "提交举报"}</button></div>
    </form>}
  </span>;
}
