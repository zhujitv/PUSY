import { clearPreviewMemberCookie } from "../../../lib/preview-member-auth";

export function GET(request: Request) {
  const response = Response.redirect(new URL("/account/login", request.url), 302);
  response.headers.set("set-cookie", clearPreviewMemberCookie());
  return response;
}
