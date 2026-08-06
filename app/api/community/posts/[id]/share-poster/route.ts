import QRCode from "qrcode";
import { getCommunityPost } from "../../../../../../lib/community/posts";
import { safeServerError } from "../../../../../../lib/request-security";

export const runtime = "nodejs";

function xml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function lines(value: string, max = 18) {
  const characters = Array.from(value.trim());
  return [characters.slice(0, max).join(""), characters.slice(max, max * 2).join("")].filter(Boolean);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id.toUpperCase();
    if (!/^PST-[A-Z0-9]{12}$/.test(id)) return new Response("分享标识无效", { status: 400 });
    const post = await getCommunityPost(id);
    if (!post || post.status !== "approved") return new Response("分享不存在", { status: 404 });
    const source = new URL(request.url).searchParams.get("source") === "copy_link" ? "copy_link" : "wechat";
    const shareUrl = `${new URL(request.url).origin}/community/posts/${id}?source=${source}`;
    const qr = await QRCode.toDataURL(shareUrl, { type: "image/png", width: 620, margin: 1, color: { dark: "#2c1b23", light: "#fff8f5" } });
    const titleLines = lines(post.title || post.body, 16);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8f5"/><stop offset="1" stop-color="#f6dce7"/></linearGradient></defs>
      <rect width="900" height="1200" rx="48" fill="url(#bg)"/><circle cx="770" cy="140" r="180" fill="#ef91b7" opacity=".22"/><circle cx="100" cy="1000" r="240" fill="#fff" opacity=".58"/>
      <text x="76" y="110" fill="#b23b6d" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="24" letter-spacing="6">PÚSY BEAUTY CIRCLE</text>
      <text x="76" y="222" fill="#2c1b23" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="54" font-weight="600">${xml(titleLines[0] ?? "真实体验分享")}</text>
      ${titleLines[1] ? `<text x="76" y="292" fill="#2c1b23" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="54" font-weight="600">${xml(titleLines[1])}</text>` : ""}
      <rect x="76" y="356" width="748" height="2" fill="#d9acbe"/><text x="76" y="422" fill="#6f5862" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="27">来自 ${xml(post.author_name)} 的真实分享</text>
      <text x="76" y="500" fill="#5b444e" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="25">${xml(Array.from(post.body).slice(0, 28).join(""))}</text>
      <text x="76" y="542" fill="#5b444e" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="25">${xml(Array.from(post.body).slice(28, 56).join(""))}${post.body.length > 56 ? "…" : ""}</text>
      <rect x="76" y="730" width="310" height="310" rx="24" fill="#fff8f5"/><image href="${qr}" x="76" y="730" width="310" height="310"/>
      <text x="430" y="830" fill="#2c1b23" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="31" font-weight="600">微信扫码查看完整分享</text>
      <text x="430" y="882" fill="#7f6872" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="22">真实体验 · 社区审核 · 已购标识</text>
      <text x="76" y="1122" fill="#b23b6d" font-family="Helvetica, PingFang SC, Microsoft YaHei, sans-serif" font-size="25">pusy.cn/community</text>
    </svg>`;
    return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=300", "content-disposition": `inline; filename="pusy-community-${id}.svg"` } });
  } catch { return safeServerError("分享海报暂时无法生成，请稍后再试"); }
}
