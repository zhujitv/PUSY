"use client";
import { useEffect, useState } from "react";

const key = "pusy-cn-cookie-consent";
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const frame = requestAnimationFrame(() => setVisible(!localStorage.getItem(key))); return () => cancelAnimationFrame(frame); }, []);
  function choose(value: "essential" | "all") { localStorage.setItem(key, value); setVisible(false); }
  if (!visible) return null;
  return <aside className="cookie-consent" aria-label="Cookie 设置"><div><b>PUSY.CN 尊重您的隐私</b><p>必要 Cookie 用于购物车和网站运行。经您同意后，我们才会启用分析与个性化功能。</p><a href="/cookie">查看 Cookie 政策</a></div><div className="cookie-actions"><button onClick={() => choose("essential")}>仅必要</button><button className="accept" onClick={() => choose("all")}>接受全部</button></div></aside>;
}
