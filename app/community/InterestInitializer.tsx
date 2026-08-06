"use client";

import { useState } from "react";
import type { CommunityTopic } from "../../lib/community/social";

export function InterestInitializer({ topics, initialSlugs }: { topics: CommunityTopic[]; initialSlugs: string[] }) {
  const [selected, setSelected] = useState(initialSlugs);
  const [editing, setEditing] = useState(initialSlugs.length < 2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    if (selected.length < 2) { setMessage("请至少选择 2 个兴趣"); return; }
    setBusy(true); setMessage("正在更新推荐…");
    try {
      const response = await fetch("/api/community/interests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ topicSlugs: selected }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error || "保存失败"); return; }
      setEditing(false); setMessage("已更新");
      window.setTimeout(() => window.location.assign("/community?feed=for-you#feed"), 450);
    } catch { setMessage("网络连接失败，请稍后再试"); }
    finally { setBusy(false); }
  }
  if (!editing) return <section className="community-interest-compact"><span>FOR YOU</span><p>已按你的 {selected.length} 个兴趣整理首页</p><button onClick={() => setEditing(true)}>调整兴趣</button></section>;
  return <section className="community-interest-initializer"><header><span>PERSONALIZE</span><h2>{initialSlugs.length ? "调整你的兴趣" : "先告诉我们，你喜欢什么"}</h2><p>选择至少 2 项；推荐只使用站内兴趣和互动，不读取站外行为。</p></header><div>{topics.map((topic) => { const active = selected.includes(topic.slug); return <button type="button" className={active ? "active" : ""} aria-pressed={active} key={topic.id} onClick={() => setSelected((current) => active ? current.filter((slug) => slug !== topic.slug) : [...current, topic.slug].slice(0, 8))}>#{topic.name}</button>; })}</div><footer><small>{message || `已选择 ${selected.length} 项`}</small><button disabled={busy || selected.length < 2} onClick={() => void save()}>{busy ? "保存中…" : "生成我的推荐"}</button></footer></section>;
}
