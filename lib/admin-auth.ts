import { headers } from "next/headers";
import { getStoreDb } from "../db/store";
import { permissionsForRole, validAdminRole, type AdminPermission, type AdminRole } from "./admin-permissions";

export const ADMIN_SESSION_COOKIE = "pusy-admin-session";

export type AdminIdentity = { id: string; email: string; displayName: string; role: AdminRole; permissions: AdminPermission[]; sessionVersion: number };
type AdminUserRow = { id: string; email: string; display_name: string; role: string; status: string; password_hash: string; password_salt: string; session_version: number };
const PASSWORD_ITERATIONS = 210_000;

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
  return Boolean(secret() && (process.env.ADMIN_PASSWORD ?? "").length >= 8);
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

async function passwordHash(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", bytes(password), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations: PASSWORD_ITERATIONS }, material, 256);
  return base64Url(new Uint8Array(result));
}

export async function createAdminPasswordHash(password: string) {
  if (password.length < 12) throw new Error("后台密码至少需要 12 位");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: await passwordHash(password, salt), salt: base64Url(salt) };
}

async function verifyStoredPassword(password: string, hash: string, salt: string) {
  try {
    return equal(await passwordHash(password, new Uint8Array(Buffer.from(salt, "base64url"))), hash);
  } catch {
    return false;
  }
}

function legacyOwner(): AdminIdentity {
  const email = (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase();
  return { id: "legacy-owner", email, displayName: email, role: "owner", permissions: permissionsForRole("owner"), sessionVersion: 0 };
}

async function sessionVersion(identity: AdminIdentity) {
  if (identity.id !== "legacy-owner") return String(identity.sessionVersion);
  const digest = await crypto.subtle.digest("SHA-256", bytes(`${secret()}:${process.env.ADMIN_PASSWORD ?? ""}`));
  return base64Url(new Uint8Array(digest)).slice(0, 24);
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase().slice(0, 160);
  const owner = legacyOwner();
  if ((!normalizedEmail || normalizedEmail === owner.email) && await verifyAdminPassword(password)) return owner;
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null;
  const db = await getStoreDb();
  const user = await db.prepare("SELECT id, email, display_name, role, status, password_hash, password_salt, session_version FROM admin_users WHERE email = ? LIMIT 1").bind(normalizedEmail).first<AdminUserRow>();
  if (!user || user.status !== "active" || !validAdminRole(user.role) || !await verifyStoredPassword(password, user.password_hash, user.password_salt)) return null;
  await db.prepare("UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role, permissions: permissionsForRole(user.role), sessionVersion: Number(user.session_version) };
}

export async function adminSessionCookie(identity: AdminIdentity) {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = base64Url(bytes(JSON.stringify({ id: identity.id, email: identity.email, displayName: identity.displayName, role: identity.role, version: await sessionVersion(identity), expires })));
  const signature = await sign(payload);
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(`${payload}.${signature}`)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookie()}`;
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (!adminAuthConfigured()) return null;
  const token = cookieValue((await headers()).get("cookie") ?? "", ADMIN_SESSION_COOKIE);
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !equal(signature, await sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: string; email?: string; displayName?: string; role?: string; version?: string; expires?: number };
    if (!parsed.email || !parsed.version || !parsed.expires || parsed.expires <= Date.now()) return null;
    const id = parsed.id || "legacy-owner";
    if (id === "legacy-owner") {
      const owner = { ...legacyOwner(), email: parsed.email };
      return equal(parsed.version, await sessionVersion(owner)) ? owner : null;
    }
    const db = await getStoreDb();
    const user = await db.prepare("SELECT id, email, display_name, role, status, password_hash, password_salt, session_version FROM admin_users WHERE id = ? LIMIT 1").bind(id).first<AdminUserRow>();
    if (!user || user.status !== "active" || !validAdminRole(user.role) || !equal(parsed.version, String(user.session_version))) return null;
    return { id: user.id, email: user.email, displayName: user.display_name, role: user.role, permissions: permissionsForRole(user.role), sessionVersion: Number(user.session_version) };
  } catch {
    return null;
  }
}

export function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie()}`;
}
