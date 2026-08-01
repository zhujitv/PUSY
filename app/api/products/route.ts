import { getPublicProducts } from "../../../db/public-products";
import { safeServerError } from "../../../lib/request-security";

export async function GET() {
  try {
    return Response.json({ products: await getPublicProducts() });
  } catch {
    return safeServerError("读取商品失败，请稍后再试");
  }
}
