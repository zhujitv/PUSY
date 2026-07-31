"use client";
import { useEffect, useState } from "react";
import type { Product } from "../../data/products";
import { useStore } from "../../components/StoreProvider";
export function ProductActions({ product }: { product: Product }) {
  const [count, setCount] = useState(1);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState("");
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const purchasable = Boolean(product.inventoryVerified && (product.stock ?? 0) > 0);
  const maxQuantity = Math.max(1, product.stock ?? 1);
  const actionLabel = purchasable ? "加入购物袋" : "到货提醒";
  useEffect(() => { fetch(`/api/account/product-alerts?slug=${encodeURIComponent(product.slug)}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => setAlerts(Array.isArray(body?.alerts) ? body.alerts.map((item: { alert_type: string }) => item.alert_type) : [])).catch(() => {}); }, [product.slug]);
  async function toggleAlert(alertType: "restock" | "price_drop") {
    setAlertMessage("正在保存…");
    const active = alerts.includes(alertType);
    const response = await fetch("/api/account/product-alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: active ? "remove" : "subscribe", slug: product.slug, alertType }) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = `/account/login?next=${encodeURIComponent(`/products/${product.slug}`)}`; return; }
    if (!response.ok) { setAlertMessage(body.error || "提醒设置失败"); return; }
    setAlerts((current) => active ? current.filter((item) => item !== alertType) : [...current, alertType]);
    setAlertMessage(active ? "已取消提醒" : "提醒已开启");
  }
  function runPrimaryAction() { if (purchasable) addToCart(product, count); else void toggleAlert("restock"); }
  return <><div className="product-actions"><div className="quantity"><button disabled={!purchasable || count <= 1} onClick={() => setCount(Math.max(1, count - 1))} aria-label="减少数量">−</button><span>{count}</span><button disabled={!purchasable || count >= maxQuantity} onClick={() => setCount(Math.min(maxQuantity, count + 1))} aria-label="增加数量">+</button></div><button className="add-main" onClick={runPrimaryAction}>{alerts.includes("restock") && !purchasable ? "✓ 已开启补货提醒" : actionLabel}</button></div><button className={`product-wishlist ${isWishlisted(product.slug) ? "active" : ""}`} onClick={() => toggleWishlist(product.slug)}>♡ {isWishlisted(product.slug) ? "已收藏" : "加入收藏"}</button><div className="product-alert-actions">{!purchasable && <button className={alerts.includes("restock") ? "active" : ""} onClick={() => void toggleAlert("restock")}>{alerts.includes("restock") ? "✓ 已开启补货提醒" : "补货时通知我"}</button>}<button className={alerts.includes("price_drop") ? "active" : ""} onClick={() => void toggleAlert("price_drop")}>{alerts.includes("price_drop") ? "✓ 已开启降价提醒" : "降价时通知我"}</button>{alertMessage && <small role="status">{alertMessage}</small>}</div><div className="mobile-purchase-bar"><span><small>{purchasable ? `有货 · ${product.stock} 件` : "暂时缺货"}</small><b>{product.name}</b></span><button type="button" onClick={runPrimaryAction}>{alerts.includes("restock") && !purchasable ? "已开启提醒" : actionLabel}</button></div></>;
}
