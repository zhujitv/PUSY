import { PageShell } from "../components/SiteChrome";
const posts = [{title:"怎样让眉毛保持自然又持久",image:"/assets/07.webp",tag:"眉妆指南"},{title:"夏日肌肤的清洁与保湿步骤",image:"/assets/01.webp",tag:"护肤"},{title:"找到适合自己的通透高光",image:"/assets/31.webp",tag:"彩妆技巧"}];
export default function BlogPage() { return <PageShell><main className="blog-page"><header><p>PÚSY EDIT</p><h1>美丽灵感</h1></header><section>{posts.map((post) => <article key={post.title}><img src={post.image} alt={post.title} /><p>{post.tag}</p><h2>{post.title}</h2><a href="/blog">阅读更多 →</a></article>)}</section></main></PageShell>; }
