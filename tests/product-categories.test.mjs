import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("商品分类拥有独立数据表、层级、排序和启停状态", async () => {
  const migration = await read("db/migrations/2026-07-30-zzzzzzzzzz-product-categories.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS product_categories/);
  assert.match(migration, /parent_id INTEGER REFERENCES product_categories/);
  assert.match(migration, /sort_order INTEGER NOT NULL/);
  assert.match(migration, /status IN \('active', 'disabled'\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS category_id/);
  assert.match(migration, /UPDATE products p\s+SET category_id = c\.id/s);
});

test("分类管理支持新增、改名同步、循环保护和安全删除", async () => {
  const [api, permissions] = await Promise.all([
    read("app/api/admin/route.ts"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(api, /action === "create-product-category"/);
  assert.match(api, /action === "update-product-category"/);
  assert.match(api, /WITH RECURSIVE descendants/);
  assert.match(api, /UPDATE products SET category = \?, category_id = \?/);
  assert.match(api, /该分类仍有关联商品/);
  assert.match(api, /该分类仍有下级分类/);
  assert.match(permissions, /"delete-product-category": "products\.manage"/);
});

test("后台商品中心提供分类视图、筛选和受控分类选择", async () => {
  const [admin, products] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/ProductManagement.tsx"),
  ]);
  assert.match(admin, /categories=\{data\?\.productCategories/);
  assert.match(products, /分类管理/);
  assert.match(products, /categoryFilter/);
  assert.match(admin, /name="categoryId"/);
  assert.match(products, /category\.product_count > 0/);
});
