import { getStoreDb } from "../../../../../../db/store";
import { createMemberSession, getPreviewMemberIdentity } from "../../../../../../lib/preview-member-auth";
import { exchangeSocialAuthorization, isSocialProvider, safeOAuthReturnTo, socialProviderLabels } from "../../../../../../lib/auth/social-oauth";
import { sha256 } from "../../../../../../lib/payments/crypto";

type OAuthState = { member_id: number | null; provider: string; mode: "bind" | "login"; return_to: string; expires_at: string; consumed_at: string | null };
type SocialAccount = { member_id: number };

function destination(origin: string, path: string, status: string, provider?: string) {
  const url = new URL(path, origin);
  url.searchParams.set("social", status);
  if (provider) url.searchParams.set("provider", provider);
  return url;
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const requestUrl = new URL(request.url);
  if (!isSocialProvider(rawProvider)) return Response.redirect(destination(requestUrl.origin, "/account/login", "failed"), 302);
  const code = requestUrl.searchParams.get("code") ?? requestUrl.searchParams.get("auth_code") ?? "";
  const state = requestUrl.searchParams.get("state") ?? "";
  if (!code || !state) return Response.redirect(destination(requestUrl.origin, "/account/login", "cancelled", rawProvider), 302);

  try {
    const db = await getStoreDb();
    const stateHash = await sha256(state);
    const saved = await db.prepare("SELECT member_id, provider, mode, return_to, expires_at, consumed_at FROM member_oauth_states WHERE state_hash = ? LIMIT 1").bind(stateHash).first<OAuthState>();
    if (!saved || saved.provider !== rawProvider || saved.consumed_at || new Date(saved.expires_at).getTime() <= Date.now()) throw new Error("授权状态无效或已过期");
    const callbackUrl = `${requestUrl.origin}/api/account/social/${rawProvider}/callback`;
    const identity = await exchangeSocialAuthorization(rawProvider, code, callbackUrl);

    if (saved.mode === "bind") {
      const viewer = await getPreviewMemberIdentity();
      if (!viewer || viewer.memberId !== saved.member_id) throw new Error("会员登录状态已变化");
      const occupied = await db.prepare(`SELECT member_id FROM member_social_accounts
        WHERE provider = ? AND (provider_user_id = ? OR (? != '' AND provider_union_id = ?)) LIMIT 1`)
        .bind(rawProvider, identity.providerUserId, identity.providerUnionId, identity.providerUnionId).first<SocialAccount>();
      if (occupied && occupied.member_id !== viewer.memberId) throw new Error(`${socialProviderLabels[rawProvider]}账号已绑定其他会员`);
      await db.batch([
        db.prepare("UPDATE member_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE state_hash = ? AND consumed_at IS NULL").bind(stateHash).requireChanges("授权状态已经使用"),
        db.prepare(`INSERT INTO member_social_accounts (member_id, provider, provider_user_id, provider_union_id)
          VALUES (?, ?, ?, ?) ON CONFLICT (member_id, provider) DO UPDATE SET
          provider_user_id = excluded.provider_user_id, provider_union_id = excluded.provider_union_id, updated_at = CURRENT_TIMESTAMP`)
          .bind(viewer.memberId, rawProvider, identity.providerUserId, identity.providerUnionId),
      ]);
      const returnTo = safeOAuthReturnTo(saved.return_to, "/account");
      return Response.redirect(destination(requestUrl.origin, returnTo, "bound", rawProvider), 302);
    }

    const account = await db.prepare(`SELECT member_id FROM member_social_accounts
      WHERE provider = ? AND (provider_user_id = ? OR (? != '' AND provider_union_id = ?)) LIMIT 1`)
      .bind(rawProvider, identity.providerUserId, identity.providerUnionId, identity.providerUnionId).first<SocialAccount>();
    await db.prepare("UPDATE member_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE state_hash = ? AND consumed_at IS NULL").bind(stateHash).requireChanges("授权状态已经使用").run();
    if (!account) return Response.redirect(destination(requestUrl.origin, "/account/login", "not-linked", rawProvider), 302);
    const response = Response.redirect(destination(requestUrl.origin, safeOAuthReturnTo(saved.return_to, "/account"), "login-success", rawProvider), 302);
    response.headers.set("set-cookie", await createMemberSession(account.member_id));
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch {
    const viewer = await getPreviewMemberIdentity().catch(() => null);
    return Response.redirect(destination(requestUrl.origin, viewer ? "/account" : "/account/login", "failed", rawProvider), 302);
  }
}
