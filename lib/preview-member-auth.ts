import { headers } from "next/headers";
import { getStoreDb } from "../db/store";

export const PREVIEW_MEMBER_COOKIE = "pusy-preview-member";
export const PREVIEW_VERIFICATION_CODE = process.env.MEMBER_VERIFICATION_CODE || "123456";

export type PreviewMemberIdentity = {
  email: string;
  displayName: string;
};

export async function getPreviewMemberIdentity(): Promise<PreviewMemberIdentity | null> {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PREVIEW_MEMBER_COOKIE}=`));
  if (!cookie) return null;

  let email = "";
  try {
    email = decodeURIComponent(cookie.slice(PREVIEW_MEMBER_COOKIE.length + 1)).trim().toLowerCase();
  } catch {
    return null;
  }
  if (!email) return null;

  const db = await getStoreDb();
  const member = await db
    .prepare("SELECT name, email FROM members WHERE lower(email) = ? AND status != 'blocked' LIMIT 1")
    .bind(email)
    .first<{ name: string; email: string }>();
  return member ? { email: member.email, displayName: member.name } : null;
}

export function previewMemberCookie(email: string) {
  return `${PREVIEW_MEMBER_COOKIE}=${encodeURIComponent(email.trim().toLowerCase())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

export function clearPreviewMemberCookie() {
  return `${PREVIEW_MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
