import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "../components/SiteChrome";
import { listPublicBlogPosts } from "../data/public-blog";

export const metadata: Metadata = { title: "美丽灵感 | PUSY.CN", description: "PÚSY 中国彩妆、眉妆与护理灵感。", alternates: { canonical: "https://pusy.cn/blog" } };
export const dynamic = "force-dynamic";

export default async function BlogPage() { const posts = await listPublicBlogPosts(); return <PageShell><main className="blog-page"><header><p>PÚSY EDIT</p><h1>美丽灵感</h1><span>品牌日常、妆容灵感与产品使用知识，经中国官网人工审核后发布。</span></header><section>{posts.map((post) => <article key={post.slug}><a href={`/blog/${post.slug}`}><Image src={post.image} alt={post.title} width={960} height={1280} sizes="(max-width: 700px) 100vw, 33vw" /></a><p>{post.tag}</p><h2>{post.title}</h2><a href={`/blog/${post.slug}`}>阅读更多 →</a></article>)}</section></main></PageShell>; }
