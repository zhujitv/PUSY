import QRCode from "qrcode";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { ensureReferralCode } from "../../../../lib/growth/member-program";
import { privateJson, safeServerError } from "../../../../lib/request-security";

export async function GET(request: Request) {
  try {
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    const code = await ensureReferralCode(viewer.memberId);
    const url = `${new URL(request.url).origin}/account/login?ref=${encodeURIComponent(code)}`;
    const image = await QRCode.toBuffer(url, { type: "png", width: 440, margin: 2, color: { dark: "#171316", light: "#ffffff" } });
    return new Response(new Uint8Array(image), { headers: { "content-type": "image/png", "cache-control": "private, max-age=300", "content-disposition": `inline; filename="pusy-invite-${code}.png"` } });
  } catch {
    return safeServerError("邀请码暂时无法生成，请稍后再试");
  }
}
