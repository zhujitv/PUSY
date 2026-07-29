import { chatGPTSignOutPath } from "../../chatgpt-auth";
import { clearPreviewMemberCookie } from "../../../lib/preview-member-auth";

export function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.redirect(new URL(chatGPTSignOutPath("/"), request.url));
  }
  const response = Response.redirect(new URL("/account/login", request.url), 302);
  response.headers.set("set-cookie", clearPreviewMemberCookie());
  return response;
}
