"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="site-state-page" role="alert"><p>PUSY.CN</p><h1>页面暂时无法加载</h1><span>请稍后重试，或返回商城继续浏览。</span><div><button type="button" onClick={reset}>重新加载</button><a href="/">返回首页</a></div></main>;
}
