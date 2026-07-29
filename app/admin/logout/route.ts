import { clearAdminSessionCookie } from "../../../lib/admin-auth";

export function GET(request: Request) {
  const response = Response.redirect(new URL("/admin/login", request.url), 302);
  response.headers.set("set-cookie", clearAdminSessionCookie());
  response.headers.set("cache-control", "no-store");
  return response;
}
