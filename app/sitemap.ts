import type { MetadataRoute } from "next";
import { categoryNames, collectionNames, products } from "./data/products";
import { blogPosts } from "./data/blog";
import { getPublicProductCategories } from "../db/product-categories";

const baseUrl = "https://pusy.cn";
const pages = ["", "/catalog", "/catalog/products", "/about", "/blog", "/contact", "/delivery", "/return", "/payment", "/stores-china", "/gift-card", "/gift-card/questions", "/faq", "/privacy", "/details", "/cookie", "/oferta"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date();
  let managedCategorySlugs: string[] = [];
  try { managedCategorySlugs = (await getPublicProductCategories()).map((category) => category.slug); } catch { managedCategorySlugs = Object.keys(categoryNames); }
  return [
    ...pages.map((path) => ({ url: `${baseUrl}${path}`, lastModified: updated })),
    ...[...new Set(managedCategorySlugs)].map((slug) => ({ url: `${baseUrl}/catalog/${slug}`, lastModified: updated })),
    ...Object.keys(collectionNames).map((slug) => ({ url: `${baseUrl}/collections/${slug}`, lastModified: updated })),
    ...products.map((product) => ({ url: `${baseUrl}/products/${product.slug}`, lastModified: updated })),
    ...blogPosts.flatMap((post) => [post.slug, ...post.aliases].map((slug) => ({ url: `${baseUrl}/blog/${slug}`, lastModified: updated }))),
  ];
}
