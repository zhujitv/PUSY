import { PageShell } from "../components/SiteChrome";
import { SearchResults } from "./SearchResults";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q = "" } = await searchParams; return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 搜索</p><h1>{q ? `“${q}”的结果` : "搜索商品"}</h1></div><form action="/search" className="search-page-form"><input name="q" defaultValue={q} placeholder="输入商品名称或品类" autoFocus /><button>搜索</button></form><SearchResults query={q} /></main></PageShell>; }
