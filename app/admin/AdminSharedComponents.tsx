"use client";
import { useState } from "react";
import { formatCnyFromRub } from "../data/products";
import type { TrendPoint } from "./admin-types";

export function ExportLink({ type }: { type: string }) { return <a className="admin-export" href={`/api/admin/export?type=${type}`}>导出 CSV</a>; }

export function RevenueChart({ points }: { points: TrendPoint[] }) {
  const days = Array.from({ length: 30 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - 29 + index); return date.toISOString().slice(0, 10); });
  const values = days.map((day) => points.find((point) => point.day === day)?.revenue ?? 0);
  const max = Math.max(...values, 1);
  return <section className="admin-panel revenue-chart"><div className="admin-panel-title"><div><h2>近 30 天销售趋势</h2><p>按非取消订单统计</p></div><b>{formatCnyFromRub(values.reduce((sum, value) => sum + value, 0))}</b></div><div className="revenue-bars">{values.map((value, index) => <i key={days[index]} style={{ height: `${Math.max(3, value / max * 100)}%` }} title={`${days[index]} · ${formatCnyFromRub(value)}`} />)}</div><div className="revenue-axis"><span>{days[0].slice(5)}</span><span>{days[14].slice(5)}</span><span>{days[29].slice(5)}</span></div></section>;
}

export function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (products: Record<string, unknown>[]) => Promise<void> }) {
  const [value, setValue] = useState('[\n  {\n    "name": "中文商品名称",\n    "category": "彩妆",\n    "price": 118.8,\n    "stock": 0,\n    "inventoryVerified": false,\n    "image": "/assets/01.webp"\n  }\n]');
  const [error, setError] = useState("");
  function parse() {
    setError("");
    try { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) throw new Error("JSON 顶层必须是数组"); void onImport(parsed); return; } catch (jsonError) {
      try { const lines = value.trim().split(/\r?\n/).filter(Boolean); const headers = lines[0].split(",").map((item) => item.trim()); if (!headers.includes("name")) throw new Error("CSV 必须包含 name 列"); const rows = lines.slice(1).map((line) => Object.fromEntries(line.split(",").map((cell,index) => [headers[index], cell.trim()]))); void onImport(rows); } catch { setError(jsonError instanceof Error ? jsonError.message : "无法解析导入内容"); }
    }
  }
  return <div className="admin-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-detail-card"><div className="admin-panel-title"><div><p>最多一次导入 200 件</p><h2>批量导入商品</h2></div><button onClick={onClose}>×</button></div><p className="admin-help">支持 JSON 数组或 CSV，商品链接由系统自动维护；price 与 oldPrice 均直接填写人民币元。category 必须使用“分类管理”中已启用的分类名称。</p><textarea className="admin-import-area" value={value} onChange={(event) => setValue(event.target.value)} rows={18} />{error && <p className="checkout-error">{error}</p>}<button className="admin-save" onClick={parse}>开始导入</button></section></div>;
}
