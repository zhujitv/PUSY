import { clearPreviewMemberCookie, revokeCurrentMemberSession } from "../../../lib/preview-member-auth";

export async function GET(request: Request) {
  await revokeCurrentMemberSession();
  const response = Response.redirect(new URL("/account/login", request.url), 302);
  response.headers.set("set-cookie", clearPreviewMemberCookie());
  return response;
}
