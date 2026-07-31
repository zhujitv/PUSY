import { rsaSign, rsaVerify } from "../payments/crypto";

export type SocialProvider = "wechat" | "alipay";
export type SocialIdentity = { providerUserId: string; providerUnionId: string };

export const socialProviderLabels: Record<SocialProvider, string> = {
  wechat: "微信",
  alipay: "支付宝",
};

export function isSocialProvider(value: string): value is SocialProvider {
  return value === "wechat" || value === "alipay";
}

function wechatConfig() {
  return {
    appId: process.env.WECHAT_OAUTH_APP_ID ?? "",
    appSecret: process.env.WECHAT_OAUTH_APP_SECRET ?? "",
  };
}

function alipayConfig() {
  return {
    appId: process.env.ALIPAY_OAUTH_APP_ID ?? "",
    privateKey: process.env.ALIPAY_OAUTH_PRIVATE_KEY ?? process.env.ALIPAY_PRIVATE_KEY ?? "",
    publicKey: process.env.ALIPAY_OAUTH_PUBLIC_KEY ?? process.env.ALIPAY_PUBLIC_KEY ?? "",
  };
}

export function socialProviderConfigured(provider: SocialProvider) {
  if (provider === "wechat") {
    const config = wechatConfig();
    return Boolean(config.appId && config.appSecret);
  }
  const config = alipayConfig();
  return Boolean(config.appId && config.privateKey && config.publicKey);
}

export function socialProviderAvailability() {
  return (["wechat", "alipay"] as const).map((provider) => ({
    provider,
    label: socialProviderLabels[provider],
    configured: socialProviderConfigured(provider),
  }));
}

export function safeOAuthReturnTo(value: string, fallback: string) {
  const candidate = value.trim().slice(0, 200);
  return /^\/account(?:\/login)?(?:\?[^#]*)?$/.test(candidate) ? candidate : fallback;
}

export function socialAuthorizationUrl(provider: SocialProvider, redirectUri: string, state: string) {
  if (!socialProviderConfigured(provider)) throw new Error(`${socialProviderLabels[provider]}授权尚未配置`);
  if (provider === "wechat") {
    const config = wechatConfig();
    const params = new URLSearchParams({ appid: config.appId, redirect_uri: redirectUri, response_type: "code", scope: "snsapi_login", state });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }
  const config = alipayConfig();
  const params = new URLSearchParams({ app_id: config.appId, scope: "auth_user", redirect_uri: redirectUri, state });
  return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params.toString()}`;
}

function timestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

function canonical(params: Record<string, string>) {
  return Object.keys(params).filter((key) => params[key] !== "" && key !== "sign" && key !== "sign_type").sort().map((key) => `${key}=${params[key]}`).join("&");
}

function responseSlice(raw: string, key: string) {
  const marker = `"${key}":`;
  const startMarker = raw.indexOf(marker);
  if (startMarker < 0) return "";
  const start = raw.indexOf("{", startMarker + marker.length);
  if (start < 0) return "";
  let depth = 0; let quoted = false; let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && quoted) { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return raw.slice(start, index + 1);
  }
  return "";
}

async function alipayOAuthToken(code: string) {
  const config = alipayConfig();
  const method = "alipay.system.oauth.token";
  const params: Record<string, string> = {
    app_id: config.appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: timestamp(),
    version: "1.0",
    grant_type: "authorization_code",
    code,
  };
  params.sign = await rsaSign(canonical(params), config.privateKey);
  const response = await fetch("https://openapi.alipay.com/gateway.do", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(params), cache: "no-store" });
  const raw = await response.text();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const responseKey = "alipay_system_oauth_token_response";
  const content = responseSlice(raw, responseKey);
  const signature = String(parsed.sign ?? "");
  if (!content || !signature || !await rsaVerify(content, signature, config.publicKey)) throw new Error("支付宝授权应答验签失败");
  const result = parsed[responseKey] as Record<string, unknown> | undefined;
  if (!response.ok || !result || (result.code && String(result.code) !== "10000")) throw new Error(String(result?.sub_msg ?? result?.msg ?? "支付宝授权失败"));
  return result;
}

export async function exchangeSocialAuthorization(provider: SocialProvider, code: string, redirectUri: string): Promise<SocialIdentity> {
  if (!socialProviderConfigured(provider)) throw new Error(`${socialProviderLabels[provider]}授权尚未配置`);
  if (provider === "wechat") {
    const config = wechatConfig();
    const params = new URLSearchParams({ appid: config.appId, secret: config.appSecret, code, grant_type: "authorization_code" });
    const response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`, { cache: "no-store" });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok || result.errcode || !result.openid) throw new Error(String(result.errmsg ?? "微信授权失败"));
    return { providerUserId: String(result.openid), providerUnionId: String(result.unionid ?? "") };
  }
  void redirectUri;
  const result = await alipayOAuthToken(code);
  const providerUserId = String(result.user_id ?? result.open_id ?? "");
  if (!providerUserId) throw new Error("支付宝授权未返回用户标识");
  return { providerUserId, providerUnionId: "" };
}
