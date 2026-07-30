import { headers } from "next/headers";
import { getStoreDb } from "../db/store";
import { sha256 } from "./payments/crypto";

export const PREVIEW_MEMBER_COOKIE = "pusy-member-session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export type PreviewMemberIdentity = { email: string; displayName: string; memberId: number };
export type IssuedMemberSession = { token: string; expiresAt: string; maxAge: number };

function secureCookie() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function sessionTokenFromCookie(cookieHeader: string) {
  const part = cookieHeader.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${PREVIEW_MEMBER_COOKIE}=`));
  if (!part) return "";
  try { return decodeURIComponent(part.slice(PREVIEW_MEMBER_COOKIE.length + 1)); } catch { return ""; }
}

async function identityFromToken(token: string): Promise<PreviewMemberIdentity | null> {
  if (!token) return null;
  const db = await getStoreDb();
  const tokenHash = await sha256(token);
  const member = await db.prepare(`
    SELECT m.id, m.name, m.email
    FROM member_sessions s
    JOIN members m ON m.id = s.member_id
    WHERE s.token_hash = ? AND s.expires_at::timestamp > CURRENT_TIMESTAMP AND m.status != 'blocked'
    LIMIT 1
  `).bind(tokenHash).first<{ id: number; name: string; email: string }>();
  return member ? { memberId: member.id, email: member.email, displayName: member.name } : null;
}

export async function getPreviewMemberIdentity(): Promise<PreviewMemberIdentity | null> {
  return identityFromToken(sessionTokenFromCookie((await headers()).get("cookie") ?? ""));
}

export async function getMemberIdentityFromRequest(request: Request): Promise<PreviewMemberIdentity | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? "";
  return identityFromToken(bearer || sessionTokenFromCookie(request.headers.get("cookie") ?? ""));
}

export async function issueMemberSession(memberId: number): Promise<IssuedMemberSession> {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const db = await getStoreDb();
  await db.prepare("DELETE FROM member_sessions WHERE expires_at::timestamp <= CURRENT_TIMESTAMP").run();
  await db.prepare("INSERT INTO member_sessions (token_hash, member_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, memberId, expiresAt).run();
  return { token, expiresAt, maxAge: SESSION_SECONDS };
}

export async function createMemberSession(memberId: number) {
  const session = await issueMemberSession(memberId);
  return `${PREVIEW_MEMBER_COOKIE}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session.maxAge}${secureCookie()}`;
}

export async function revokeCurrentMemberSession() {
  const token = sessionTokenFromCookie((await headers()).get("cookie") ?? "");
  if (!token) return;
  const db = await getStoreDb();
  await db.prepare("DELETE FROM member_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function clearPreviewMemberCookie() {
  return `${PREVIEW_MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie()}`;
}
