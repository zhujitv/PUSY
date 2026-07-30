import { getStoreDb, type DbProduct } from "../../../../db/store";
import { products as fallbackProducts, RUB_TO_CNY, type Product } from "../../../data/products";
import { safeServerError } from "../../../../lib/request-security";

function parseImages(value: string | undefined, fallback: string) {
  try {
    const images = value ? JSON.parse(value) as string[] : [];
    return images.length ? images : [fallback];
  } catch {
    return [fallback];
  }
}

function absoluteMedia(origin: string, path: string | undefined, fallback: string) {
  const value = path || fallback;
  try { return new URL(value, origin).toString(); } catch { return new URL(fallback, origin).toString(); }
}

function money(amountFen: number) {
  const amount = amountFen / 100;
  return `¥${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function miniProduct(origin: string, product: Product & { images_json?: string }, preview = false) {
  const priceFen = Math.max(0, Math.round(product.price * RUB_TO_CNY * 100));
  const images = product.images ?? parseImages(product.images_json, product.image);
  return {
    id: product.slug,
    slug: product.slug,
    name: product.name,
    subtitle: product.description.slice(0, 42),
    category: product.category,
    priceFen,
    priceText: money(priceFen),
    badge: product.badge ?? "",
    image: absoluteMedia(origin, product.image, "/assets/01.jpg"),
    images: images.map((image) => absoluteMedia(origin, image, product.image)),
    volume: product.volume ?? "",
    description: product.description,
    usage: product.usage ?? "请以商品包装标注的使用说明为准。",
    highlights: [product.category, product.badge, product.volume].filter(Boolean).slice(0, 3),
    stock: preview ? 20 : Number(product.stock ?? 0),
    inventoryVerified: Boolean(product.inventoryVerified),
    purchasable: preview || Boolean(product.inventoryVerified && Number(product.stock ?? 0) > 0),
    sku: product.sku ?? "",
  };
}

function fromRow(row: DbProduct): Product & { images_json: string } {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    image: row.image,
    images_json: row.images_json,
    badge: row.badge ?? undefined,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    stock: row.stock,
    inventoryVerified: Boolean(row.inventory_verified),
    sku: row.sku ?? undefined,
    volume: row.volume ?? undefined,
    usage: row.usage ?? undefined,
  };
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  try {
    const db = await getStoreDb();
    const result = await db.prepare("SELECT * FROM products WHERE status = 'active' ORDER BY id DESC").all<DbProduct>();
    return Response.json({ products: result.results.map((row) => miniProduct(origin, fromRow(row))), source: "database" }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    if (!process.env.DATABASE_URL) return Response.json({ products: fallbackProducts.map((product) => miniProduct(origin, product, true)), source: "preview" }, { headers: { "cache-control": "no-store" } });
    return safeServerError("读取小程序商品失败，请稍后再试");
  }
}
