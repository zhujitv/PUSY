import { getStoreDb } from "./store";

export type PublicProductCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_name: string | null;
  sort_order: number;
  product_count: number;
};

export async function getPublicProductCategories() {
  const db = await getStoreDb();
  const result = await db.prepare("SELECT c.id, c.name, c.slug, c.parent_id, parent.name AS parent_name, c.sort_order, COUNT(p.id)::INTEGER AS product_count FROM product_categories c LEFT JOIN product_categories parent ON parent.id = c.parent_id LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active' WHERE c.status = 'active' GROUP BY c.id, parent.name ORDER BY c.sort_order, c.id").all<PublicProductCategory>();
  return result.results;
}
