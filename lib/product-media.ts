import type { Product } from "../app/data/products";

export function secondaryProductImage(product: Pick<Product, "image" | "imageAlt" | "images">) {
  return [...(product.images ?? []), product.imageAlt]
    .find((image): image is string => Boolean(image && image !== product.image));
}
