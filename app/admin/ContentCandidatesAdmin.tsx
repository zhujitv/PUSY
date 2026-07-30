"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ContentSource = {
  id: string;
  name: string;
  platform: string;
  account_url?: string;
  feed_url?: string;
  status: string;
  ingest_enabled: number | boolean;
  rights_status: string;
  last_synced_at?: string | null;
  error_text?: string | null;
};

export type ContentCandidate = {
  id: string;
  source_id: string;
  source_name?: string;
  source_platform?: string;
  external_id: string;
  source_url: string;
  source_type: string;
  original_title: string;
  original_text: string;
  translated_title: string;
  translated_text: string;
  media_json?: string | unknown[];
  product_refs_json?: string | unknown[];
  compliance_flags_json?: string | unknown[];
  translation_status: string;
  status: string;
  publish_at?: string | null;
  published_at?: string | null;
  rejected_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type CandidateWorkspace = {
  sources: ContentSource[];
  candidates: ContentCandidate[];
  summary: Record<string, number>;
  translation: { configured?: boolean; provider?: string; model?: string };
};

const statusLabels: Record<string, string> = {
  fetched: "待翻译",
  translating: "翻译中",
  pending_review: "待审核",
  approved: "已批准",
  scheduled: "待发布",
  published: "已发布",
  rejected: "已拒绝",
  withdrawn: "已撤回",
  failed: "处理失败",
};

const platformLabels: Record<string, string> = { telegram: "Telegram", instagram: "Instagram", vk: "VK" };

function jsonList(value: string | unknown[] | undefined) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dateTimeLocal(value?: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function ContentCandidatesAdmin() {
  const [workspace, setWorkspace] = useState<CandidateWorkspace | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/content-candidates", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(body.error || "无法读取采集草稿");
    else {
      setWorkspace(body as CandidateWorkspace);
      setSelectedId((current) => current || body.candidates?.[0]?.id || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const candidates = useMemo(() => {
    const all = workspace?.candidates ?? [];
    if (filter === "all") return all;
    if (filter === "active") return all.filter((item) => !["rejected", "withdrawn"].includes(item.status));
    return all.filter((item) => item.status === filter);
  }, [filter, workspace]);
  const selected = workspace?.candidates.find((item) => item.id === selectedId) ?? candidates[0];

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (!selected) return false;
    setBusy(action);
    setMessage("正在保存…");
    const response = await fetch("/api/admin/content-candidates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id: selected.id, ...payload }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setMessage(body.error || "保存失败");
      return false;
    }
    setMessage(body.translation?.reason || "已保存");
    await load();
    return true;
  }

  return <section className="content-ingest-admin" aria-labelledby="content-ingest-title">
    <div className="content-ingest-head">
      <div><span>OFFICIAL CONTENT FEED</span><h2 id="content-ingest-title">官方内容采集与审核</h2><p>平台内容只会生成候选草稿。完成中文编辑、合规检查和人工批准后，才可排期或发布到中国官网。</p></div>
      <div className="content-ingest-summary"><b>{workspace?.summary?.pending_review ?? 0}</b><small>待审核</small><b>{workspace?.summary?.scheduled ?? 0}</b><small>待发布</small><b>{workspace?.summary?.published ?? 0}</b><small>已发布</small></div>
    </div>

    <div className="content-source-strip">
      {(workspace?.sources ?? []).map((source) => <article key={source.id}>
        <span className={`content-source-dot ${source.error_text ? "has-error" : source.ingest_enabled ? "is-ready" : ""}`} />
        <div><b>{platformLabels[source.platform] ?? source.platform} · {source.name}</b><small>{source.rights_status === "authorized" ? "官网使用已授权" : "授权待确认"} · {source.ingest_enabled ? "采集已启用" : "采集未启用"}{source.last_synced_at ? ` · 最近同步 ${new Date(source.last_synced_at).toLocaleString("zh-CN")}` : ""}</small>{source.error_text && <em>{source.error_text}</em>}</div>
        {(source.account_url || source.feed_url) && <a href={source.account_url || source.feed_url} target="_blank" rel="noopener noreferrer">查看账号 ↗</a>}
      </article>)}
      {!loading && !workspace?.sources?.length && <p>数据库迁移完成后，Telegram、Instagram 与 VK 官方来源会显示在这里。</p>}
    </div>

    <div className="content-candidate-toolbar">
      <div>{[["active", "处理中"], ["pending_review", "待审核"], ["approved", "已批准"], ["scheduled", "待发布"], ["published", "已发布"], ["all", "全部"]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
      <span>{workspace?.translation?.configured ? `自动翻译已配置${workspace.translation.model ? ` · ${workspace.translation.model}` : ""}` : "自动翻译尚未配置，采集内容会保留为待翻译草稿"}</span>
    </div>

    {message && <div className="admin-message">{message}</div>}
    {loading ? <div className="admin-loading"><i /><b>正在读取候选内容</b><span>正在同步来源与审核状态…</span></div> : <div className="content-candidate-layout">
      <aside className="content-candidate-list" aria-label="候选内容列表">
        {candidates.map((candidate) => <button className={selected?.id === candidate.id ? "active" : ""} onClick={() => setSelectedId(candidate.id)} key={candidate.id}>
          <span><i>{platformLabels[candidate.source_platform ?? ""] ?? candidate.source_platform ?? candidate.source_type}</i><em className={`candidate-status status-${candidate.status}`}>{statusLabels[candidate.status] ?? candidate.status}</em></span>
          <b>{candidate.translated_title || candidate.original_title || "未命名内容"}</b>
          <p>{(candidate.translated_text || candidate.original_text).slice(0, 92)}</p>
          <small>{new Date(candidate.created_at).toLocaleString("zh-CN")}</small>
        </button>)}
        {!candidates.length && <p className="admin-empty">当前筛选条件下没有候选内容。</p>}
      </aside>

      {selected ? <CandidateEditor key={`${selected.id}-${selected.updated_at}`} candidate={selected} busy={busy} onAct={act} /> : <section className="admin-panel content-candidate-empty"><h3>等待第一条官方内容</h3><p>配置平台凭据并运行同步后，新内容会先进入这里，不会直接公开。</p></section>}
    </div>}
  </section>;
}

function CandidateEditor({ candidate, busy, onAct }: { candidate: ContentCandidate; busy: string; onAct: (action: string, payload?: Record<string, unknown>) => Promise<boolean> }) {
  const flags = jsonList(candidate.compliance_flags_json).map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "message" in item) return String(item.message);
    return JSON.stringify(item);
  });
  const media = jsonList(candidate.media_json);
  const [rejectReason, setRejectReason] = useState(candidate.rejected_reason ?? "");
  const [publishAt, setPublishAt] = useState(dateTimeLocal(candidate.publish_at));
  const translationReady = ["translated", "review_required"].includes(candidate.translation_status)
    && Boolean(candidate.translated_title.trim() && candidate.translated_text.trim());

  return <div className="content-candidate-editor">
    <header><div><span>{candidate.source_name || candidate.source_id}</span><h3>{candidate.original_title || "官方平台内容"}</h3><p>{candidate.external_id}</p></div><a href={candidate.source_url} target="_blank" rel="noopener noreferrer">查看原内容 ↗</a></header>

    <div className="content-origin-card"><div><b>原文存档</b><small>原文保持不可变，便于校对和追溯。</small></div><h4>{candidate.original_title || "无标题"}</h4><p>{candidate.original_text || "此内容没有文字说明。"}</p>{Boolean(media.length) && <span>{media.length} 个来源素材仅作审核参考，批准使用前请核对人物、音乐及图片版权。</span>}</div>

    <form onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); const productRefs = String(values.get("productRefs") ?? "").split(",").map((value) => value.trim()).filter(Boolean); void onAct("update-candidate", { translatedTitle: values.get("translatedTitle"), translatedText: values.get("translatedText"), productRefs }); }}>
      <label>中文标题<input name="translatedTitle" defaultValue={candidate.translated_title} maxLength={160} placeholder="请输入适合中国官网的标题" required /></label>
      <label>中文正文<textarea name="translatedText" defaultValue={candidate.translated_text} rows={12} maxLength={12000} placeholder="自动翻译后请人工校对品牌词、功效描述和本地化表达" required /></label>
      <label>关联商品（商品 slug，多个用逗号分隔）<input name="productRefs" defaultValue={jsonList(candidate.product_refs_json).join(", ")} placeholder="例如：product-slug-1, product-slug-2" /></label>
      <button className="admin-save" disabled={Boolean(busy)}>{busy === "update-candidate" ? "正在保存…" : "保存中文草稿"}</button>
    </form>

    <section className={`content-compliance ${flags.length ? "has-flags" : "is-clear"}`}><div><b>{flags.length ? `发现 ${flags.length} 项需人工确认` : "自动初筛未发现高风险词"}</b><small>自动检查不能替代中国广告与化妆品合规审核。</small></div>{flags.length ? <ul>{flags.map((flag, index) => <li key={`${flag}-${index}`}>{flag}</li>)}</ul> : null}</section>

    <div className="content-candidate-actions">
      {!translationReady && <button disabled={Boolean(busy)} onClick={() => void onAct("translate-candidate")}>{busy === "translate-candidate" ? "翻译中…" : "重新自动翻译"}</button>}
      {candidate.status === "pending_review" && <button className="primary" disabled={Boolean(busy) || !translationReady} onClick={() => void onAct("approve-candidate")}>人工批准</button>}
      {["pending_review", "approved"].includes(candidate.status) && <div className="candidate-reject"><input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="拒绝原因" maxLength={500} /><button className="danger" disabled={Boolean(busy) || !rejectReason.trim()} onClick={() => void onAct("reject-candidate", { reason: rejectReason })}>拒绝</button></div>}
      {candidate.status === "approved" && <div className="candidate-schedule"><input aria-label="计划发布时间" type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} /><button disabled={Boolean(busy) || !publishAt} onClick={() => void onAct("schedule-candidate", { publishAt: new Date(publishAt).toISOString() })}>定时发布</button><button className="primary" disabled={Boolean(busy)} onClick={() => void onAct("publish-candidate")}>立即发布</button></div>}
      {candidate.status === "scheduled" && <><button className="primary" disabled={Boolean(busy)} onClick={() => void onAct("publish-candidate")}>立即发布</button><button className="danger" disabled={Boolean(busy)} onClick={() => void onAct("withdraw-candidate", { reason: "管理员取消排期" })}>取消排期</button></>}
      {candidate.status === "published" && <button className="danger" disabled={Boolean(busy)} onClick={() => void onAct("withdraw-candidate")}>从官网撤回</button>}
    </div>
    {candidate.reviewed_by && <footer>审核人：{candidate.reviewed_by} · {candidate.reviewed_at ? new Date(candidate.reviewed_at).toLocaleString("zh-CN") : ""}{candidate.published_at ? ` · 发布于 ${new Date(candidate.published_at).toLocaleString("zh-CN")}` : ""}</footer>}
  </div>;
}
