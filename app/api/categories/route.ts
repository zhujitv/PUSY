import { getPublicProductCategories } from "../../../db/product-categories";
import { safeServerError } from "../../../lib/request-security";

export async function GET() {
  try {
    const categories = await getPublicProductCategories();
    return Response.json({ categories }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return safeServerError("读取商品分类失败，请稍后再试");
  }
}
