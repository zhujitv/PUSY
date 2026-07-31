import { ensureCommerceFeatureSchema } from "../../../db/commerce-features";
import { ensureMember } from "../../../db/member-account";
import { getStoreDb } from "../../../db/store";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../lib/request-security";

async function identity() {
  return getPreviewMemberIdentity();
}

function reviewImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  const images: string[] = [];
  for (const item of value.slice(0, 3)) {
    const data = String(item ?? "");
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) throw new Error("评价图片格式无效");
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 400_000) throw new Error("单张评价图片不能超过 400KB");
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp) throw new Error("评价图片内容无效");
    images.push(data);
  }
  if (images.reduce((total, image) => total + image.length, 0) > 1_200_000) throw new Error("评价图片总大小不能超过 1.2MB");
  return images;
}

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
    if (!slug) return Response.json({ error: "缺少商品标识" }, { status: 400 });
    await ensureCommerceFeatureSchema();
    const db = await getStoreDb();
    const [reviews, summary] = await Promise.all([
      db.prepare("SELECT id, reviewer_name, rating, title, body, verified_purchase, images_json, created_at FROM product_reviews WHERE product_slug = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 100").bind(slug).all(),
      db.prepare("SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average FROM product_reviews WHERE product_slug = ? AND status = 'approved'").bind(slug).first<{ count: number; average: number }>(),
    ]);
    return Response.json({ reviews: reviews.results, summary: { count: Number(summary?.count ?? 0), average: Number(summary?.average ?? 0) } });
  } catch {
    return safeServerError("读取评价失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "reviews", 10, 3600)) return rateLimitResponse();
    const viewer = await identity();
    if (!viewer) return Response.json({ error: "请先登录会员账户后评价" }, { status: 401 });
    const payload = await request.json() as Record<string, unknown>;
    const slug = String(payload.slug ?? "").trim();
    const rating = Math.round(Number(payload.rating));
    const title = String(payload.title ?? "").trim().slice(0, 80);
    const body = String(payload.body ?? "").trim().slice(0, 1000);
    const images = reviewImages(payload.images);
    if (!slug || rating < 1 || rating > 5 || body.length < 6) return Response.json({ error: "请选择评分，并填写至少 6 个字的使用感受" }, { status: 400 });
    await ensureCommerceFeatureSchema();
    const member = await ensureMember(viewer);
    if (member.status === "blocked") return Response.json({ error: "该会员账户已停用" }, { status: 403 });
    const db = await getStoreDb();
    const product = await db.prepare("SELECT slug FROM products WHERE slug = ? AND status = 'active' LIMIT 1").bind(slug).first();
    if (!product) return Response.json({ error: "商品不存在或已下架" }, { status: 404 });
    const existing = await db.prepare("SELECT id FROM product_reviews WHERE product_slug = ? AND member_id = ? AND status != 'rejected' LIMIT 1").bind(slug, member.id).first();
    if (existing) return Response.json({ error: "你已经评价过这件商品，评价正在展示或审核中" }, { status: 409 });
    const purchase = await db.prepare("SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.member_id = ? AND oi.product_slug = ? AND o.status NOT IN ('已取消','待付款','支付失败') LIMIT 1").bind(member.id, slug).first();
    await db.prepare("INSERT INTO product_reviews (product_slug, member_id, reviewer_name, rating, title, body, verified_purchase, images_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')").bind(slug, member.id, member.name, rating, title, body, purchase ? 1 : 0, JSON.stringify(images)).run();
    return Response.json({ ok: true, message: images.length ? "图片评价已提交，审核通过后将获得任务积分" : "评价已提交，审核通过后会公开显示" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/评价图片/.test(message)) return Response.json({ error: message }, { status: 400 });
    return safeServerError("提交评价失败，请稍后再试");
  }
}
