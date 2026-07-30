import { readFile, writeFile } from "node:fs/promises";

const auditPath = new URL("./catalog-ingredients.zh-CN.json", import.meta.url);
const outputPath = new URL("../db/migrations/2026-07-30-zzzzzzzzzzzzzz-product-ingredients-zh-cn.sql", import.meta.url);
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const entries = Object.entries({ ...(audit.products || {}), ...(audit.archivedProducts || {}) });
const sqlString = (value) => value === null
  ? "NULL"
  : `E'${String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "''")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .replaceAll("\n", "\\n")}'`;
const values = entries.map(([slug, item]) => `  (${sqlString(slug)}, ${sqlString(item.source)}, ${sqlString(item.chinese)}, ${sqlString(item.status)})`).join(",\n");

const sql = `CREATE TABLE IF NOT EXISTS product_ingredient_translation_backups (
  batch_id TEXT NOT NULL,
  product_id BIGINT NOT NULL,
  slug TEXT NOT NULL,
  ingredients TEXT,
  old_updated_at TEXT,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (batch_id, product_id)
);

CREATE TEMP TABLE product_ingredient_translation_payload (
  slug TEXT PRIMARY KEY,
  source_ingredients TEXT,
  ingredients_zh TEXT NOT NULL,
  translation_status TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO product_ingredient_translation_payload (slug, source_ingredients, ingredients_zh, translation_status) VALUES
${values};

DO $$
DECLARE
  payload_count INTEGER;
  missing_count INTEGER;
  changed_source_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO payload_count FROM product_ingredient_translation_payload;
  IF payload_count <> ${entries.length} THEN
    RAISE EXCEPTION 'Chinese ingredient payload count mismatch: %', payload_count;
  END IF;

  SELECT COUNT(*) INTO missing_count
  FROM product_ingredient_translation_payload t
  LEFT JOIN products p ON p.slug = t.slug
  WHERE p.id IS NULL;
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'Chinese ingredient payload contains % unknown product slugs', missing_count;
  END IF;

  SELECT COUNT(*) INTO changed_source_count
  FROM product_ingredient_translation_payload t
  JOIN products p ON p.slug = t.slug
  WHERE p.ingredients IS DISTINCT FROM t.ingredients_zh
    AND (
      (t.source_ingredients IS NOT NULL AND p.ingredients IS DISTINCT FROM t.source_ingredients)
      OR (t.source_ingredients IS NULL AND p.ingredients IS NOT NULL)
    );
  IF changed_source_count <> 0 THEN
    RAISE EXCEPTION 'Refusing to overwrite % product ingredient records changed after translation review', changed_source_count;
  END IF;
END $$;

INSERT INTO product_ingredient_translation_backups (batch_id, product_id, slug, ingredients, old_updated_at)
SELECT 'ingredients-zh-cn-v1', p.id, p.slug, p.ingredients, p.updated_at::TEXT
FROM products p
JOIN product_ingredient_translation_payload t ON t.slug = p.slug
ON CONFLICT (batch_id, product_id) DO NOTHING;

UPDATE products p
SET ingredients = t.ingredients_zh,
    updated_at = CURRENT_TIMESTAMP
FROM product_ingredient_translation_payload t
WHERE p.slug = t.slug
  AND p.ingredients IS DISTINCT FROM t.ingredients_zh;

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM product_ingredient_translation_payload t
  JOIN products p ON p.slug = t.slug
  WHERE p.ingredients IS DISTINCT FROM t.ingredients_zh;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Chinese ingredient verification failed for % products', mismatch_count;
  END IF;
END $$;
`;

await writeFile(outputPath, sql, "utf8");
console.log(`Wrote ${entries.length} product ingredient translations to ${outputPath.pathname}`);
