"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  return <div className="product-gallery-viewer">
    <div className="product-gallery-stage"><img src={images[active]} alt={active === 0 ? name : `${name} 商品图 ${active + 1}`} fetchPriority={active === 0 ? "high" : "auto"} decoding="async" /></div>
    {images.length > 1 && <div className="product-gallery-thumbs" aria-label="选择商品图片">{images.map((image, index) => <button type="button" className={active === index ? "active" : ""} aria-label={`查看第 ${index + 1} 张商品图`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)} key={`${image}-${index}`}><img src={image} alt="" loading={index < 3 ? "eager" : "lazy"} decoding="async" /></button>)}</div>}
    <span className="product-gallery-count">{active + 1} / {images.length}</span>
  </div>;
}
