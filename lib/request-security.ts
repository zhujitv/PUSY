import { sha256 } from "./payments/crypto";
import { getStoreDb } from "../db/store";

export function requestIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function allowRateLimit(keyMaterial: string, limit: number, windowSeconds: number) {
  const key = await sha256(keyMaterial);
  const db = await getStoreDb();
  const result = await db.prepare(`
    INSERT INTO rate_limits (key, request_count, window_started_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      request_count = CASE
        WHEN rate_limits.window_started_at::timestamp < CURRENT_TIMESTAMP - (? * INTERVAL '1 second') THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN rate_limits.window_started_at::timestamp < CURRENT_TIMESTAMP - (? * INTERVAL '1 second') THEN CURRENT_TIMESTAMP::TEXT
        ELSE rate_limits.window_started_at
      END
    RETURNING request_count
  `).bind(key, windowSeconds, windowSeconds).first<{ request_count: number }>();
  return Number(result?.request_count ?? limit + 1) <= limit;
}

export async function allowRequest(request: Request, scope: string, limit: number, windowSeconds: number) {
  return allowRateLimit(`${scope}:ip:${requestIp(request)}`, limit, windowSeconds);
}

export async function allowRequestForIdentity(scope: string, identity: string, limit: number, windowSeconds: number) {
  const normalized = identity.trim().toLowerCase().slice(0, 320) || "unknown";
  return allowRateLimit(`${scope}:identity:${normalized}`, limit, windowSeconds);
}

export function rateLimitResponse() {
  return privateJson({ error: "请求过于频繁，请稍后再试" }, { status: 429, headers: { "retry-after": "60" } });
}

export function safeServerError(message: string, status = 500) {
  return privateJson({ error: message }, { status });
}

export function privateJson(data: unknown, init: ResponseInit = {}) {
  const responseHeaders = new Headers(init.headers);
  responseHeaders.set("cache-control", "private, no-store");
  return Response.json(data, { ...init, headers: responseHeaders });
}
