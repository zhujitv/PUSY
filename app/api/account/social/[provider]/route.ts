import { getStoreDb } from "../../../../../db/store";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { isSocialProvider, safeOAuthReturnTo, socialAuthorizationUrl, socialProviderConfigured, socialProviderLabels } from "../../../../../lib/auth/social-oauth";
import { createOAuthStateCookie } from "../../../../../lib/auth/oauth-state";
import { sha256 } from "../../../../../lib/payments/crypto";
import { allowRequest, rateLimitResponse } from "../../../../../lib/request-security";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  if (!isSocialProvider(rawProvider)) return Response.json({ error: "不支持该账号类型" }, { status: 404 });
  if (!await allowRequest(request, `member-social-${rawProvider}`, 12, 10 * 60)) return rateLimitResponse();

  const url = new URL(request.url);
  const viewer = await getPreviewMemberIdentity();
  const mode = url.searchParams.get("mode") === "login" ? "login" : "bind";
  if (mode === "bind" && !viewer) return Response.redirect(new URL("/account/login?social=login-required", url.origin), 302);
  if (mode === "login" && viewer) return Response.redirect(new URL("/account", url.origin), 302);

  const fallback = mode === "bind" ? "/account" : "/account/login";
  const returnTo = safeOAuthReturnTo(url.searchParams.get("returnTo") ?? "", fallback);
  const callbackUrl = `${url.origin}/api/account/social/${rawProvider}/callback`;
  const state = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;

  if (!socialProviderConfigured(rawProvider)) {
    const target = new URL(fallback, url.origin);
    target.searchParams.set("social", "not-configured");
    target.searchParams.set("provider", rawProvider);
    target.searchParams.set("label", socialProviderLabels[rawProvider]);
    return Response.redirect(target, 302);
  }

  try {
    const authorizationUrl = socialAuthorizationUrl(rawProvider, callbackUrl, state);
    const db = await getStoreDb();
    await db.prepare("DELETE FROM member_oauth_states WHERE expires_at::timestamp <= CURRENT_TIMESTAMP OR consumed_at IS NOT NULL").run();
    await db.prepare("INSERT INTO member_oauth_states (state_hash, member_id, provider, mode, return_to, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(await sha256(state), viewer?.memberId ?? null, rawProvider, mode, returnTo, new Date(Date.now() + 10 * 60_000).toISOString()).run();
    const response = Response.redirect(authorizationUrl, 302);
    response.headers.set("set-cookie", createOAuthStateCookie(state));
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch {
    const target = new URL(fallback, url.origin);
    target.searchParams.set("social", "failed");
    target.searchParams.set("provider", rawProvider);
    target.searchParams.set("label", socialProviderLabels[rawProvider]);
    return Response.redirect(target, 302);
  }
}
