"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { formatCnyFromRub } from "../data/products";
import type { CommunityLinkedProduct } from "../../lib/community/commerce";
import { recordCommunityEvent } from "./community-client-events";

export function CommunityPostTracker({ postId }: { postId: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = marker.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      recordCommunityEvent("post_impression", postId, undefined, `impression:${postId}`);
      observer.disconnect();
    }, { threshold: .1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [postId]);
  return <span className="community-impression-marker" ref={marker} aria-hidden="true" />;
}

export function CommunityProductLinks({ postId, products }: { postId: string; products: CommunityLinkedProduct[] }) {
  if (!products.length) return null;
  return <section className="community-linked-products" aria-label="分享中提到的商品">
    <header><span>本篇提到</span><small>{products.some((product) => product.verified_purchase) ? "含真实已购体验" : "关联 PÚSY 商品"}</small></header>
    <div>{products.map((product) => <a
      href={`/products/${product.slug}?fromCommunity=${encodeURIComponent(postId)}`}
      key={product.slug}
      onClick={() => recordCommunityEvent("product_click", postId, product.slug)}
    >
      <Image src={product.image} alt={product.name} width={76} height={76} sizes="76px" unoptimized />
      <span><strong>{product.name}</strong><small>{formatCnyFromRub(product.price)}</small>{product.verified_purchase ? <em>作者已购</em> : null}</span>
      <i aria-hidden="true">→</i>
    </a>)}</div>
  </section>;
}
