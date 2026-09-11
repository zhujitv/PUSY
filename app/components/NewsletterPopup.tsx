"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

const dismissedKey = "pusy-cn-newsletter-popup-dismissed";
const subscribedKey = "pusy-cn-newsletter-popup-subscribed";
const excludedPaths = ["/admin", "/account", "/checkout", "/cart", "/community"];

type NewsletterResponse = { error?: string; couponCode?: string; message?: string };

export function NewsletterPopup() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const excluded = excludedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (excluded || localStorage.getItem(subscribedKey) || sessionStorage.getItem(dismissedKey)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetch("/api/content")
      .then((response) => response.ok ? response.json() : { content: {} })
      .catch(() => ({ content: {} }))
      .then((body) => {
        if (cancelled || body?.content?.show_newsletter === "0") return;
        timer = setTimeout(() => {
          previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setOpen(true);
        }, 3000);
      });
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [excluded, pathname]);

  useEffect(() => {
    if (!open || excluded) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => emailRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = priorOverflow;
      previousFocusRef.current?.focus();
    };
  }, [excluded, open]);

  function close() {
    sessionStorage.setItem(dismissedKey, "1");
    setOpen(false);
  }

  function keepFocusInside(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { close(); return; }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], input:not([disabled])") ?? [])]
      .filter((element) => element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "popup", privacyConsent, marketingConsent }),
      });
      const body = await response.json().catch(() => ({})) as NewsletterResponse;
      if (!response.ok) throw new Error(body.error || "订阅失败，请稍后再试");
      localStorage.setItem(subscribedKey, "1");
      sessionStorage.setItem(dismissedKey, "1");
      setCouponCode(body.couponCode || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "订阅失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || excluded) return null;
  return <div className="newsletter-popup-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} className="newsletter-popup" role="dialog" aria-modal="true" aria-labelledby="newsletter-popup-title" onKeyDown={keepFocusInside}>
      <button className="newsletter-popup-close" type="button" onClick={close} aria-label="关闭订阅弹窗"><span aria-hidden="true" /></button>
      <Image className="newsletter-popup-image" src="/assets/newsletter-popup-2026-09.jpg" alt="PÚSY 粉色礼盒与品牌单品" width={1000} height={563} sizes="(max-width: 640px) calc(100vw - 32px), 420px" priority />
      {couponCode ? <div className="newsletter-popup-success" aria-live="polite">
        <p>欢迎加入 PÚSY CLUB</p>
        <h2 id="newsletter-popup-title">订阅成功</h2>
        <span>您的专属新客 9 折优惠码</span>
        <output>{couponCode}</output>
        <small>优惠码 30 天内有效，仅可使用一次。请妥善保存。</small>
        <button type="button" onClick={close}>开始选购</button>
      </div> : <form className="newsletter-popup-form" onSubmit={subscribe}>
        <h2 id="newsletter-popup-title">新客见面礼 · 立享 9 折</h2>
        <p>留下邮箱，第一时间收到新品、补货和会员活动。</p>
        <div className="newsletter-popup-fields">
          <label className="sr-only" htmlFor="newsletter-popup-email">电子邮箱</label>
          <input ref={emailRef} id="newsletter-popup-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="您的电子邮箱" required />
          <button type="submit" disabled={submitting}>{submitting ? "正在订阅…" : "订阅并领取"}</button>
        </div>
        <label className="newsletter-popup-consent"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} required /><span>我已阅读并同意<a href="/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a>，同意 PUSY.CN 处理我的电子邮箱。</span></label>
        <label className="newsletter-popup-consent"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} required /><span>我同意通过电子邮件接收新品、优惠和会员活动信息，可随时通过<a href="/contact" target="_blank" rel="noopener noreferrer">客户服务</a>退订。</span></label>
        {error && <p className="newsletter-popup-error" role="alert">{error}</p>}
      </form>}
    </section>
  </div>;
}
