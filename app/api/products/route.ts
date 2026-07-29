import { getStoreDb, type DbProduct } from "../../../db/store";

export async function GET() {
  try {
    const db = await getStoreDb();
    const result = await db.prepare("SELECT * FROM products WHERE status = 'active' ORDER BY id DESC").all<DbProduct>();
    return Response.json({ products: result.results.map((row) => ({ slug: row.slug, name: row.name, category: row.category, description: row.description, image: row.image, imageAlt: row.image_alt ?? undefined, images: JSON.parse(row.images_json || "[]"), badge: row.badge ?? undefined, price: row.price, oldPrice: row.old_price ?? undefined, stock: row.stock, inventoryVerified: Boolean(row.inventory_verified), variants: JSON.parse(row.variants_json || "[]"), sku: row.sku ?? undefined, volume: row.volume ?? undefined, ingredients: row.ingredients ?? undefined, usage: row.usage ?? undefined })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取商品失败" }, { status: 500 });
  }
}
