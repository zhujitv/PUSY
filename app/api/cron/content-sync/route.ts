import { timingSafeEqual } from "node:crypto";
import { publishDueContentCandidates } from "../../../../db/content-ingest";
import { syncOfficialContentSources } from "../../../../lib/content-ingest/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bearerMatches(request: Request, expected: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) return Response.json({ error: "定时同步密钥未配置", configured: false }, { status: 503 });
  if (!bearerMatches(request, secret)) return Response.json({ error: "定时同步鉴权失败" }, { status: 401 });

  try {
    const result = await syncOfficialContentSources();
    const saved = result.results.reduce((total, item) => total + item.saved, 0);
    const published = await publishDueContentCandidates("system:cron");
    return Response.json({ ok: true, saved, published, ...result }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "定时内容同步失败" }, { status: 500 });
  }
}
