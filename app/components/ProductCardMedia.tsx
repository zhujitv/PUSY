import Image from "next/image";
import type { Product } from "../data/products";
import { secondaryProductImage } from "../../lib/product-media";

export function ProductCardMedia({ product, sizes, contain = false, square = false, priority = false }: {
  product: Pick<Product, "name" | "image" | "imageAlt" | "images">;
  sizes: string;
  contain?: boolean;
  square?: boolean;
  priority?: boolean;
}) {
  const secondaryImage = secondaryProductImage(product);
  const className = ["product-card-media", secondaryImage ? "has-secondary" : "", contain ? "is-contain" : "", square ? "is-square" : ""].filter(Boolean).join(" ");
  return <span className={className}>
    <Image className="product-card-media-primary" src={product.image} alt={product.name} width={700} height={727} sizes={sizes} priority={priority} />
    {secondaryImage && <Image className="product-card-media-secondary" src={secondaryImage} alt="" aria-hidden="true" width={700} height={727} sizes={sizes} />}
  </span>;
}
