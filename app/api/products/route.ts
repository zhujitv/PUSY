import { getStoreDb, type DbProduct } from "../../../db/store";
import { products as catalogProducts } from "../../data/products";

function localMedia(row: DbProduct) {
  const catalog = catalogProducts.find((product) => product.slug === row.slug);
  const images = JSON.parse(row.images_json || "[]") as string[];
  const legacy = [row.image, row.image_alt, ...images].some((image) => image?.startsWith("https://avatars.mds.yandex.net/get-yastore/"));
  return legacy && catalog ? { image: catalog.image, imageAlt: catalog.imageAlt, images: catalog.images ?? [catalog.image] } : { image: row.image, imageAlt: row.image_alt ?? undefined, images };
}

export async function GET() {
  try {
    const db = await getStoreDb();
    const result = await db.prepare("SELECT * FROM products WHERE status = 'active' ORDER BY id DESC").all<DbProduct>();
    return Response.json({ products: result.results.map((row) => ({ slug: row.slug, name: row.name, category: row.category, description: row.description, ...localMedia(row), badge: row.badge ?? undefined, price: row.price, oldPrice: row.old_price ?? undefined, stock: row.stock, inventoryVerified: Boolean(row.inventory_verified), variants: JSON.parse(row.variants_json || "[]"), sku: row.sku ?? undefined, volume: row.volume ?? undefined, ingredients: row.ingredients ?? undefined, usage: row.usage ?? undefined })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取商品失败" }, { status: 500 });
  }
}
