export const MEMBER_OAUTH_STATE_COOKIE = "pusy-oauth-state";
const OAUTH_STATE_SECONDS = 10 * 60;

function secureCookie() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function cookieValue(cookieHeader: string, name: string) {
  const part = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  if (!part) return "";
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return "";
  }
}

export function createOAuthStateCookie(state: string) {
  return `${MEMBER_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${OAUTH_STATE_SECONDS}${secureCookie()}`;
}

export function clearOAuthStateCookie() {
  return `${MEMBER_OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie()}`;
}

export function oauthStateMatchesBrowser(cookieHeader: string, state: string) {
  if (!state) return false;
  return cookieValue(cookieHeader, MEMBER_OAUTH_STATE_COOKIE) === state;
}
