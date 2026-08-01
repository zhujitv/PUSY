"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { needsContentDiscardWarning, resolveContentSubmitIntent } from "../../lib/content-studio-safety";
import { contentToggleKeys, groups, parseRevisionSnapshot, revisionLabels } from "./content-admin-config";
import type { ContentRevision, SiteContent } from "./commerce-admin-types";

export function ContentAdmin({ content, revisions, onAct, onDirtyChange }: { content: SiteContent; revisions: ContentRevision[]; onAct: (payload: Record<string, unknown>) => Promise<boolean>; onDirtyChange?: (dirty: boolean) => void }) {
  const [preview, setPreview] = useState(content);
  const [dirty, setDirty] = useState(false);
  const [busyIntent, setBusyIntent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"status" | "error">("status");
  const [invalidField, setInvalidField] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [loadedVersionTitle, setLoadedVersionTitle] = useState("");
  const [revisionBusy, setRevisionBusy] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [dirty]);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      draftButtonRef.current?.click();
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, []);

  function snapshot(form: HTMLFormElement) {
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries()) as Record<string, string>;
    for (const key of contentToggleKeys) values[key] = data.has(key) ? "1" : "0";
    return values;
  }

  function markChanged(form: HTMLFormElement, target: EventTarget) {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || !target.name) return;
    setPreview((current) => ({ ...current, ...snapshot(form) }));
    setDirty(true);
    setFeedback("");
    setFeedbackTone("status");
    if (invalidField === target.name) setInvalidField("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyIntent || revisionBusy) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = resolveContentSubmitIntent(submitter?.value);
    if (!intent) {
      setFeedbackTone("error");
      setFeedback("请使用保存草稿、定时发布或立即发布按钮完成操作。");
      return;
    }
    const values = snapshot(event.currentTarget);
    const invalidUrl = Object.entries(values).find(([key, value]) => key.endsWith("_url") && !/^\/(?!\/)[A-Za-z0-9_?&=#%./-]*$/.test(value));
    if (invalidUrl) {
      setFeedbackTone("error");
      setInvalidField(invalidUrl[0]);
      setFeedback("链接必须是以 / 开头的站内路径，例如 /catalog/products");
      const control = event.currentTarget.elements.namedItem(invalidUrl[0]);
      if (control instanceof HTMLInputElement) control.focus();
      return;
    }
    const action = intent === "draft" ? "save-content-draft" : intent === "schedule" ? "schedule-site-content" : "update-site-content";
    const publishDate = values.publishAt ? new Date(values.publishAt) : null;
    if (intent === "schedule" && (!publishDate || Number.isNaN(publishDate.getTime()) || publishDate.getTime() <= Date.now())) {
      setFeedbackTone("error");
      setInvalidField("publishAt");
      setFeedback("请选择晚于当前时间的定时发布时间");
      const control = event.currentTarget.elements.namedItem("publishAt");
      if (control instanceof HTMLInputElement) control.focus();
      return;
    }
    setInvalidField("");
    setFeedbackTone("status");
    setBusyIntent(intent);
    setFeedback(intent === "draft" ? "正在保存草稿…" : intent === "schedule" ? "正在创建定时发布…" : "正在保存并发布…");
    try {
      const ok = await onAct({ action, title: values.versionTitle, publishAt: publishDate?.toISOString() ?? "", content: values });
      if (!ok) {
        setFeedbackTone("error");
        setFeedback("保存失败，请查看页面提示后重试；当前输入不会丢失。");
        return;
      }
      const savedAt = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      setDirty(false);
      setLoadedVersionTitle("");
      setFeedback(intent === "draft" ? `草稿已保存 · ${savedAt}` : intent === "schedule" ? `定时版本已保存 · ${savedAt}` : `已保存并发布 · ${savedAt}`);
    } finally {
      setBusyIntent("");
    }
  }

  function resetEditor() {
    if (dirty && !window.confirm("确定放弃当前未保存的修改吗？")) return;
    formRef.current?.reset();
    setPreview(content);
    setDirty(false);
    setLoadedVersionTitle("");
    setInvalidField("");
    setFeedbackTone("status");
    setFeedback("已恢复为当前线上内容");
  }

  function expandGroups(open: boolean) {
    formRef.current?.querySelectorAll<HTMLDetailsElement>("details.content-group:not([hidden])").forEach((item) => { item.open = open; });
  }

  function jumpToGroup(index: number) {
    setGroupQuery("");
    window.requestAnimationFrame(() => {
      const item = document.getElementById(`content-group-${index}`) as HTMLDetailsElement | null;
      if (!item) return;
      item.open = true;
      item.scrollIntoView({ behavior: "smooth", block: "start" });
      item.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    });
  }

  function loadRevision(revision: ContentRevision) {
    if (needsContentDiscardWarning(dirty, "load") && !window.confirm("当前编辑内容尚未保存。载入其他版本会覆盖这些修改；如需保留，请先取消并保存草稿。\n\n确定继续载入吗？")) return;
    const nextSnapshot = parseRevisionSnapshot(revision.snapshot_json);
    const form = formRef.current;
    if (!nextSnapshot || !form) {
      setFeedbackTone("error");
      setFeedback("该版本内容无法读取，请刷新后重试");
      return;
    }
    for (const [key, value] of Object.entries(nextSnapshot)) {
      const control = form.elements.namedItem(key);
      if (control instanceof HTMLInputElement) {
        if (control.type === "checkbox") control.checked = value !== "0";
        else control.value = value;
      } else if (control instanceof HTMLTextAreaElement) control.value = value;
    }
    const versionTitle = form.elements.namedItem("versionTitle");
    if (versionTitle instanceof HTMLInputElement) versionTitle.value = `${revision.title} 副本`.slice(0, 100);
    const publishAt = form.elements.namedItem("publishAt");
    if (publishAt instanceof HTMLInputElement) publishAt.value = "";
    setPreview({ ...content, ...nextSnapshot });
    setLoadedVersionTitle(revision.title);
    setDirty(true);
    setInvalidField("");
    setFeedbackTone("status");
    setFeedback(`已载入“${revision.title}”，保存时会创建新版本`);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      if (versionTitle instanceof HTMLInputElement) versionTitle.focus({ preventScroll: true });
    });
  }

  async function runRevisionAction(revision: ContentRevision, action: "publish-content-revision" | "delete-content-revision") {
    if (busyIntent || revisionBusy) return;
    const verb = action === "delete-content-revision" ? "删除" : revision.status === "archived" ? "恢复并发布" : "立即发布";
    const dirtyWarning = action === "publish-content-revision" && needsContentDiscardWarning(dirty, "publish") ? "当前编辑内容尚未保存，继续会放弃这些修改。\n\n" : "";
    if (!window.confirm(`${dirtyWarning}确定${verb}“${revision.title}”吗？`)) return;
    setRevisionBusy(revision.id);
    setFeedbackTone("status");
    setFeedback(`正在${verb}“${revision.title}”…`);
    try {
      const ok = await onAct({ action, id: revision.id });
      if (!ok) {
        setFeedbackTone("error");
        setFeedback(`${verb}失败，请查看页面提示后重试。`);
      } else if (action === "delete-content-revision") {
        setFeedback(`已删除“${revision.title}”`);
      }
    } finally { setRevisionBusy(""); }
  }

  const normalizedGroupQuery = groupQuery.trim().toLowerCase();
  const groupMatches = (group: (typeof groups)[number]) => {
    if (!normalizedGroupQuery) return true;
    const toggleText = "toggle" in group && group.toggle ? group.toggle.join(" ") : "toggles" in group && group.toggles ? group.toggles.flat().join(" ") : "";
    const fieldText = group.fields.map(([key, label, help]) => `${key} ${label} ${help} ${preview[key] ?? ""}`).join(" ");
    return `${group.title} ${group.description} ${toggleText} ${fieldText}`.toLowerCase().includes(normalizedGroupQuery);
  };
  const visibleGroupCount = groups.filter(groupMatches).length;
  const filteredRevisions = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return revisions.filter((revision) => (historyStatus === "all" || revision.status === historyStatus) && (!query || `${revision.title} ${revision.id} ${revision.created_by}`.toLowerCase().includes(query)));
  }, [historyQuery, historyStatus, revisions]);
  const publishedRevision = revisions.find((item) => item.status === "published");
  const saveState = busyIntent ? "正在处理保存请求…" : dirty ? "有未保存修改" : "已与线上内容同步";
  const isBusy = Boolean(busyIntent || revisionBusy);
  const historyScopeLabel = revisions.length > 100 ? "最近 100 个版本及当前版本" : `${revisions.length} 个版本`;

  return <div className="content-studio">
    <section className="content-studio-hero"><div><span>CONTENT STUDIO</span><h2>首页内容工作台</h2><p>搜索并编辑首页内容，保存状态、快速预览和版本记录都集中在这里。</p></div><div className="content-studio-summary"><span><b>{revisions.filter((item) => item.status === "draft").length}</b><small>草稿</small></span><span><b>{revisions.filter((item) => item.status === "scheduled").length}</b><small>待发布</small></span><span className="current"><b>{publishedRevision?.title ?? "当前线上内容"}</b><small>当前版本</small></span><a href="/" target="_blank" rel="noopener noreferrer">打开线上首页 ↗</a></div></section>
    <div className="content-studio-layout">
      <form ref={formRef} className="content-editor" onSubmit={submit} onInput={(event) => markChanged(event.currentTarget, event.target)} onKeyDown={(event) => { if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLButtonElement)) event.preventDefault(); }}>
        <section className="content-release-bar" aria-label="内容保存与发布">
          <header><div><b>保存与发布</b><span className={`content-save-state ${busyIntent ? "busy" : dirty ? "dirty" : "saved"}`} role="status" aria-live="polite" aria-atomic="true"><i />{saveState}</span></div><div className="content-release-actions">{dirty && <button type="button" className="text" onClick={resetEditor}>放弃修改</button>}<button ref={draftButtonRef} type="submit" name="intent" value="draft" className="secondary" disabled={isBusy}>{busyIntent === "draft" ? "正在保存…" : "保存草稿"}</button><button type="submit" name="intent" value="schedule" className="secondary" disabled={isBusy}>{busyIntent === "schedule" ? "正在设置…" : "定时发布"}</button><button type="submit" name="intent" value="publish" disabled={isBusy}>{busyIntent === "publish" ? "正在发布…" : "保存并立即发布"}</button></div></header>
          <div className="content-release-fields"><label>版本名称<input name="versionTitle" placeholder="例如：七夕礼盒首页" maxLength={100} /></label><label>定时发布时间（中国时间）<input name="publishAt" type="datetime-local" aria-invalid={invalidField === "publishAt" || undefined} aria-describedby={invalidField === "publishAt" ? "content-form-feedback" : undefined} /></label><div><span>{loadedVersionTitle ? `正在编辑：${loadedVersionTitle}` : "⌘S / Ctrl+S 可快速保存草稿"}</span><a href="#content-quick-preview" onClick={(event) => { event.preventDefault(); const previewElement = document.getElementById("content-quick-preview"); previewElement?.scrollIntoView({ behavior: "smooth", block: "start" }); previewElement?.focus({ preventScroll: true }); }}>查看快速预览 ↓</a></div></div>
          {feedback && <p id="content-form-feedback" className={feedbackTone === "error" ? "error" : ""} role={feedbackTone === "error" ? "alert" : "status"} aria-live={feedbackTone === "error" ? "assertive" : "polite"} aria-atomic="true">{feedback}</p>}
        </section>
        <section className="content-section-tools"><label><span>查找内容设置</span><input type="search" value={groupQuery} onChange={(event) => setGroupQuery(event.target.value)} placeholder="搜索公告、主标题、分类或订阅" aria-label="查找内容设置" /></label><div className="content-section-jumps">{groups.map((group, index) => <button type="button" onClick={() => jumpToGroup(index)} key={group.title}>{String(index + 1).padStart(2, "0")} {group.title}</button>)}</div><div className="content-fold-actions"><span role="status" aria-live="polite" aria-atomic="true">{visibleGroupCount} / {groups.length} 个分区</span><button type="button" onClick={() => expandGroups(true)}>全部展开</button><button type="button" onClick={() => expandGroups(false)}>全部收起</button></div></section>
        <div className="content-groups">{groups.map((group, groupIndex) => {
          const visible = groupMatches(group);
          const settingCount = group.fields.length + ("toggle" in group && group.toggle ? 1 : "toggles" in group && group.toggles ? group.toggles.length : 0);
          return <details ref={(node) => { if (node && !node.dataset.initialized) { node.open = groupIndex < 2; node.dataset.initialized = "1"; } }} id={`content-group-${groupIndex}`} className="content-group" hidden={!visible} key={group.title}><summary><span>{String(groupIndex + 1).padStart(2, "0")}</span><div><b>{group.title}</b><small>{group.description} · {settingCount} 项设置</small></div><i aria-hidden="true">＋</i></summary><div className="content-group-fields">{"toggle" in group && group.toggle && <label className="content-toggle"><input name={group.toggle[0]} type="checkbox" defaultChecked={content[group.toggle[0]] !== "0"} /><span><b>{group.toggle[1]}</b><small>关闭后首页将隐藏这个模块</small></span></label>}{"toggles" in group && group.toggles?.map(([key, label]) => <label className="content-toggle" key={key}><input name={key} type="checkbox" defaultChecked={content[key] !== "0"} /><span><b>{label}</b><small>关闭后首页将隐藏这个模块</small></span></label>)}{group.fields.map(([key, label, help, type]) => {
            const maxLength = key.includes("title") ? 180 : 300;
            const inputProps = type === "url" ? { pattern: "^/(?!/).*", title: "请输入以 / 开头的站内路径，例如 /catalog/products" } : {};
            const hasError = invalidField === key;
            return <label className={type === "textarea" ? "wide" : ""} key={key}>{label}{type === "textarea" ? <textarea name={key} defaultValue={content[key] ?? ""} rows={3} maxLength={maxLength} aria-invalid={hasError || undefined} aria-describedby={hasError ? "content-form-feedback" : undefined} /> : <input name={key} defaultValue={content[key] ?? ""} maxLength={maxLength} aria-invalid={hasError || undefined} aria-describedby={hasError ? "content-form-feedback" : undefined} {...inputProps} />}<small>{help} · {(preview[key] ?? content[key] ?? "").length}/{maxLength}</small></label>;
          })}</div></details>;
        })}{visibleGroupCount === 0 && <p className="admin-empty content-search-empty">没有找到匹配的内容设置，请尝试其他关键词。</p>}</div>
        <div className="content-mobile-actions"><span className={dirty ? "dirty" : ""} aria-hidden="true"><i />{feedback || saveState}</span><button type="submit" name="intent" value="draft" className="secondary" disabled={isBusy}>{busyIntent === "draft" ? "保存中…" : "保存草稿"}</button><button type="submit" name="intent" value="publish" disabled={isBusy}>{busyIntent === "publish" ? "发布中…" : "立即发布"}</button></div>
      </form>
      <aside id="content-quick-preview" className="content-preview" tabIndex={-1}><header><span>快速预览 · 当前编辑内容</span><a href="/" target="_blank" rel="noopener noreferrer">线上首页 ↗</a></header>{preview.show_announcement !== "0" && <div className="content-preview-announcement">{preview.announcement}</div>}<div className="content-preview-hero"><small>{preview.hero_eyebrow}</small><h3>{preview.hero_title}</h3><p>{preview.hero_subtitle}</p><b>{preview.hero_cta_label} →</b><em>{preview.hero_cta_url}</em></div><div className="content-preview-hero secondary"><small>{preview.hero2_eyebrow}</small><h3>{preview.hero2_title}</h3><b>{preview.hero2_cta_label} →</b><em>{preview.hero2_cta_url}</em></div>{preview.show_featured !== "0" && <div className="content-preview-section"><small>精选商品</small><h3>{preview.featured_title}</h3><p>{preview.featured_subtitle}</p><div><i /><i /><i /></div></div>}{preview.show_categories !== "0" && <div className="content-preview-categories"><h3>{preview.categories_title}</h3><div><span>{preview.category_1_label}</span><span>{preview.category_2_label}</span><span>{preview.category_3_label}</span></div></div>}{preview.show_reels !== "0" && <div className="content-preview-section dark"><small>社区内容</small><h3>{preview.reels_title}</h3><p>{preview.reels_subtitle}</p></div>}{preview.show_newsletter !== "0" && <div className="content-preview-newsletter"><small>PÚSY CLUB</small><h3>{preview.newsletter_title}</h3><span>输入邮箱 <b>订阅</b></span><p>成功提示：{preview.newsletter_success}</p></div>}<footer>快速预览用于检查文案层级与显隐状态，发布前可打开线上首页核对完整图片和商品。</footer></aside>
    </div>
    <section className="admin-panel content-history"><div className="admin-panel-title"><div><h2>版本记录</h2><p>可搜索、筛选或载入下方版本继续编辑；发布和删除前都会再次确认。</p></div><span>{historyScopeLabel}</span></div><div className="content-history-tools"><label><span>搜索版本</span><input type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="名称、编号或创建人" /></label><label><span>版本状态</span><select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}><option value="all">全部状态</option><option value="published">当前版本</option><option value="draft">草稿</option><option value="scheduled">待发布</option><option value="archived">历史版本</option></select></label><span role="status" aria-live="polite" aria-atomic="true">{filteredRevisions.length} 条结果</span></div><div>{filteredRevisions.length ? filteredRevisions.map((revision) => <article key={revision.id}><div><span className={`content-version-status status-${revision.status}`}>{revisionLabels[revision.status] ?? revision.status}</span><b>{revision.title}</b><small>{revision.id} · {revision.created_by}<br />创建于 {new Date(revision.created_at).toLocaleString("zh-CN")}{revision.publish_at ? ` · 计划 ${new Date(revision.publish_at).toLocaleString("zh-CN")}` : ""}</small></div><div>{revision.snapshot_json && <button className="secondary" disabled={isBusy} onClick={() => loadRevision(revision)}>载入编辑</button>}{revision.status !== "published" && <button disabled={isBusy} onClick={() => void runRevisionAction(revision, "publish-content-revision")}>{revisionBusy === revision.id ? "处理中…" : revision.status === "archived" ? "恢复此版本" : "立即发布"}</button>}{["draft", "scheduled"].includes(revision.status) && <button className="danger" disabled={isBusy} onClick={() => void runRevisionAction(revision, "delete-content-revision")}>删除</button>}</div></article>) : <p className="admin-empty" role="status">没有符合筛选条件的版本记录。</p>}</div></section>
  </div>;
}
