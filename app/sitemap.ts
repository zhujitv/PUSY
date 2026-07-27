import type { MetadataRoute } from "next";
import { products } from "./data/products";

const baseUrl = "https://pusy.cn";
const pages = ["", "/catalog/products", "/about", "/blog", "/delivery", "/return", "/payment", "/stores-china", "/gift-card", "/faq", "/privacy", "/cookie", "/oferta"];

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  return [
    ...pages.map((path) => ({ url: `${baseUrl}${path}`, lastModified: updated })),
    ...products.map((product) => ({ url: `${baseUrl}/products/${product.slug}`, lastModified: updated })),
  ];
}
