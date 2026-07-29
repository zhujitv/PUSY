import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getBlogPost } from "../../data/blog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "文章未找到 | PUSY.CN" };
  return { title: `${post.title} | PUSY.CN`, description: post.intro, alternates: { canonical: `https://pusy.cn/blog/${post.slug}` }, openGraph: { title: post.title, description: post.intro, images: [{ url: post.image }] } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const post = getBlogPost(slug); if (!post) notFound(); return <PageShell><main className="article-page"><header><p>{post.tag}</p><h1>{post.title}</h1><span>{post.intro}</span></header><Image className="article-hero" src={post.image} alt={post.title} width={960} height={1280} sizes="100vw" priority /><div className="article-body">{post.sections.map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}<a href="/catalog/products">探索相关产品 →</a></div></main></PageShell>; }
