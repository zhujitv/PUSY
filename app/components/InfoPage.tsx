import { PageShell } from "./SiteChrome";

export function InfoPage({ eyebrow, title, intro, className, children }: { eyebrow: string; title: string; intro?: string; className?: string; children: React.ReactNode }) {
  return <PageShell><main className={`info-page${className ? ` ${className}` : ""}`}><header><p>{eyebrow}</p><h1>{title}</h1>{intro && <div>{intro}</div>}</header><section className="info-body">{children}</section></main></PageShell>;
}
