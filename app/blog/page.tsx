import type { Metadata } from "next";
import { PageShell } from "../components/SiteChrome";
import { blogPosts } from "../data/blog";

export const metadata: Metadata = { title: "美丽灵感 | PUSY.CN", description: "PÚSY 中国彩妆、眉妆与护理灵感。", alternates: { canonical: "https://pusy.cn/blog" } };

export default function BlogPage() { return <PageShell><main className="blog-page"><header><p>PÚSY EDIT</p><h1>美丽灵感</h1></header><section>{blogPosts.map((post) => <article key={post.slug}><a href={`/blog/${post.slug}`}><img src={post.image} alt={post.title} /></a><p>{post.tag}</p><h2>{post.title}</h2><a href={`/blog/${post.slug}`}>阅读更多 →</a></article>)}</section></main></PageShell>; }
