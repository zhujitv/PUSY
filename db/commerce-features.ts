import { getStoreDb } from "./store";

let schemaPromise: Promise<void> | null = null;

export async function ensureCommerceFeatureSchema() {
  schemaPromise ??= (async () => {
    const db = await getStoreDb();
    await db.batch([
      db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("announcement", "订单满 600.00 元免费配送"),
      db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("hero_eyebrow", "púsy × Ü"),
      db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("hero_title", "礼物飞进\n你的订单"),
      db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("hero_subtitle", "猜猜你会收到哪一份？"),
      db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("featured_title", "新品"),
    ]);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function getSiteContent() {
  await ensureCommerceFeatureSchema();
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT key, value, updated_at FROM site_content ORDER BY key").all<{ key: string; value: string; updated_at: string }>();
  return Object.fromEntries(rows.results.map((row) => [row.key, row.value]));
}
