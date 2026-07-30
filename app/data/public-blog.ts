import { getPublishedBlogPost, getPublishedBlogPosts } from "../../db/content-ingest";
import { blogPosts, getBlogPost, type BlogPost } from "./blog";
import type { PublishedBlogPost } from "../../lib/content-ingest/types";

const fallbackCover = "/assets/35.webp";

function publicCover(value: string) {
  return /^\/(?:assets|products)\/[A-Za-z0-9_./-]+$/u.test(value) ? value : fallbackCover;
}

function managedPost(post: PublishedBlogPost): BlogPost {
  return {
    slug: post.slug,
    aliases: [],
    title: post.title,
    tag: post.tag || "美丽灵感",
    image: publicCover(post.cover_image_url),
    intro: post.intro,
    sections: post.sections,
  };
}

export async function listPublicBlogPosts() {
  try {
    const managed = (await getPublishedBlogPosts()).map(managedPost);
    const managedSlugs = new Set(managed.map((post) => post.slug));
    return [...managed, ...blogPosts.filter((post) => !managedSlugs.has(post.slug))];
  } catch {
    return blogPosts;
  }
}

export async function findPublicBlogPost(slug: string) {
  const builtIn = getBlogPost(slug);
  if (builtIn) return builtIn;
  try {
    const managed = await getPublishedBlogPost(slug);
    return managed ? managedPost(managed) : undefined;
  } catch {
    return undefined;
  }
}
