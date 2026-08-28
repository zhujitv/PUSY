import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../app/data/products.generated.json", import.meta.url), "utf8"));
const audit = JSON.parse(await readFile(new URL("../scripts/catalog-ingredients.zh-CN.json", import.meta.url), "utf8"));
const migration = await readFile(new URL("../db/migrations/2026-08-29-product-ingredients-zh-cn.sql", import.meta.url), "utf8");

test("全部商品都有已审计的中文成分或缺失来源说明", () => {
  assert.equal(catalog.length, 88);
  assert.equal(Object.keys(audit.products).length, catalog.length);
  assert.equal(Object.keys(audit.archivedProducts).length, 24);
  for (const product of catalog) {
    const entry = audit.products[product.slug];
    assert.ok(entry, `${product.slug} 缺少成分审计记录`);
    assert.equal(product.ingredients, entry.chinese, `${product.slug} 静态成分与审计数据不一致`);
    assert.ok(product.ingredients.trim(), `${product.slug} 成分说明为空`);
    assert.doesNotMatch(product.ingredients, /[А-Яа-яЁё]/, `${product.slug} 仍含俄文`);
  }
});

test("原站有配方的商品全部完成翻译，缺失配方不被编造", () => {
  const entries = Object.values(audit.products);
  assert.equal(entries.filter((entry) => entry.status === "已翻译").length, 75);
  assert.equal(entries.filter((entry) => entry.status === "套装说明").length, 5);
  assert.equal(entries.filter((entry) => entry.status === "礼盒说明").length, 3);
  assert.equal(entries.filter((entry) => entry.status === "材质说明").length, 3);
  assert.equal(entries.filter((entry) => entry.status === "待品牌确认").length, 2);
  for (const entry of entries.filter((item) => item.status !== "已翻译")) assert.equal(entry.source, null);
});

test("中文成分仅保留必要的国际标准缩写和色号", () => {
  const allowed = /\b(?:PEG|PPG|VP|VA|PCA|EDTA|BHT|PVP|DMDM|PBT|MIPA|CI)\b/gi;
  const entries = [
    ...catalog.map((product) => ({ slug: product.slug, ingredients: product.ingredients })),
    ...Object.entries(audit.archivedProducts).map(([slug, item]) => ({ slug, ingredients: item.chinese })),
  ];
  for (const entry of entries) {
    const withoutStandardCodes = entry.ingredients.replace(allowed, "");
    assert.doesNotMatch(withoutStandardCodes, /[A-Za-z]{3,}/, `${entry.slug} 仍含未翻译英文：${withoutStandardCodes.match(/[A-Za-z]{3,}/)?.[0]}`);
    assert.doesNotMatch(entry.ingredients, /[А-Яа-яЁё]/, `${entry.slug} 仍含俄文`);
  }
});

test("数据库迁移逐商品同步成分且不修改价格库存", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS product_ingredient_translation_backups/);
  assert.match(migration, /SET ingredients = t\.ingredients_zh/);
  assert.doesNotMatch(migration, /SET[\s\S]{0,200}\b(?:price|stock|inventory_verified)\s*=/i);
  const allSlugs = [...Object.keys(audit.products), ...Object.keys(audit.archivedProducts)];
  assert.equal(allSlugs.length, 112);
  for (const slug of allSlugs) assert.match(migration, new RegExp(`'${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
});
