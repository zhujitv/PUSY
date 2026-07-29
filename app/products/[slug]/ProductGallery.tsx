"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  return <div className="product-gallery-viewer">
    <div className="product-gallery-stage"><Image src={images[active]} alt={active === 0 ? name : `${name} 商品图 ${active + 1}`} width={1400} height={1454} sizes="(max-width: 900px) 100vw, 58vw" priority={active === 0} /></div>
    {images.length > 1 && <div className="product-gallery-thumbs" aria-label="选择商品图片">{images.map((image, index) => <button type="button" className={active === index ? "active" : ""} aria-label={`查看第 ${index + 1} 张商品图`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)} key={`${image}-${index}`}><Image src={image} alt="" width={120} height={125} sizes="80px" /></button>)}</div>}
    <span className="product-gallery-count">{active + 1} / {images.length}</span>
  </div>;
}
