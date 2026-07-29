import type { MetadataRoute } from "next";
import { categoryNames, collectionNames, products } from "./data/products";
import { blogPosts } from "./data/blog";

const baseUrl = "https://pusy.cn";
const pages = ["", "/catalog", "/catalog/products", "/about", "/blog", "/delivery", "/return", "/payment", "/stores-china", "/gift-card", "/gift-card/questions", "/faq", "/privacy", "/details", "/cookie", "/oferta"];

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  return [
    ...pages.map((path) => ({ url: `${baseUrl}${path}`, lastModified: updated })),
    ...Object.keys(categoryNames).map((slug) => ({ url: `${baseUrl}/catalog/${slug}`, lastModified: updated })),
    ...Object.keys(collectionNames).map((slug) => ({ url: `${baseUrl}/collections/${slug}`, lastModified: updated })),
    ...products.map((product) => ({ url: `${baseUrl}/products/${product.slug}`, lastModified: updated })),
    ...blogPosts.flatMap((post) => [post.slug, ...post.aliases].map((slug) => ({ url: `${baseUrl}/blog/${slug}`, lastModified: updated }))),
  ];
}
