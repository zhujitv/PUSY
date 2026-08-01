import { products as catalogProducts, type Product, type ProductVariantGroup } from "../app/data/products";
import { getStoreDb, type DbProduct } from "./store";

const isLegacyYandexImage = (image?: string) => image?.startsWith("https://avatars.mds.yandex.net/get-yastore/") ?? false;

function localMedia(row: DbProduct) {
  const catalog = catalogProducts.find((product) => product.slug === row.slug);
  const images = JSON.parse(row.images_json || "[]") as string[];
  const legacy = [row.image, row.image_alt, ...images].some((image) => isLegacyYandexImage(image ?? undefined));
  return legacy && catalog
    ? { image: catalog.image, imageAlt: catalog.imageAlt, images: catalog.images ?? [catalog.image] }
    : { image: row.image, imageAlt: row.image_alt ?? undefined, images };
}

function localVariants(row: DbProduct) {
  const variants = JSON.parse(row.variants_json || "[]") as ProductVariantGroup[];
  const hasLegacyImage = variants.some((group) => group.options.some((option) => isLegacyYandexImage(option.image)));
  if (!hasLegacyImage) return variants;
  return catalogProducts.find((product) => product.slug === row.slug)?.variants ?? variants;
}

function serializeProduct(row: DbProduct): Product {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    ...localMedia(row),
    badge: row.badge ?? undefined,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    stock: row.stock,
    inventoryVerified: Boolean(row.inventory_verified),
    variants: localVariants(row),
    sku: row.sku ?? undefined,
    volume: row.volume ?? undefined,
    ingredients: row.ingredients ?? undefined,
    usage: row.usage ?? undefined,
  };
}

export async function getPublicProducts() {
  const db = await getStoreDb();
  const result = await db.prepare("SELECT * FROM products WHERE status = 'active' ORDER BY id DESC").all<DbProduct>();
  return result.results.map(serializeProduct);
}
