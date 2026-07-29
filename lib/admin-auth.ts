import { headers } from "next/headers";

export const ADMIN_SESSION_COOKIE = "pusy-admin-session";

type AdminIdentity = { email: string; displayName: string };

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? "";
  return value.length >= 32 ? value : "";
}

function secureCookie() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function base64Url(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey("raw", bytes(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(value))));
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function cookieValue(cookieHeader: string, name: string) {
  const part = cookieHeader.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}

export function adminAuthConfigured() {
  return Boolean(secret() && (process.env.ADMIN_PASSWORD ?? "").length >= 12);
}

export async function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD ?? "";
  if (!adminAuthConfigured()) return false;
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", bytes(password)),
    crypto.subtle.digest("SHA-256", bytes(configured)),
  ]);
  return equal(base64Url(new Uint8Array(actual)), base64Url(new Uint8Array(expected)));
}

export async function adminSessionCookie() {
  const email = (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase();
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = base64Url(bytes(JSON.stringify({ email, expires })));
  const signature = await sign(payload);
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(`${payload}.${signature}`)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookie()}`;
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (!adminAuthConfigured()) return null;
  const token = cookieValue((await headers()).get("cookie") ?? "", ADMIN_SESSION_COOKIE);
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !equal(signature, await sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; expires?: number };
    if (!parsed.email || !parsed.expires || parsed.expires <= Date.now()) return null;
    return { email: parsed.email, displayName: parsed.email };
  } catch {
    return null;
  }
}

export function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie()}`;
}
