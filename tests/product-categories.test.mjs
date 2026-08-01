import test from "node:test";
import assert from "node:assert/strict";
import { readSource as read } from "./helpers/read-source.mjs";

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

test("链接标识由系统维护，后台不再要求运营人员填写", async () => {
  const [admin, categoriesUi, adminApi] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/ProductManagement.tsx"),
    read("app/api/admin/route.ts"),
  ]);
  assert.doesNotMatch(admin, /<label>链接标识/);
  assert.doesNotMatch(categoriesUi, /<label>链接标识/);
  assert.match(adminApi, /createManagedSlug/);
  assert.match(adminApi, /currentProduct\?\.slug/);
  assert.match(adminApi, /previous = action === "update-product-category"/);
  assert.doesNotMatch(adminApi, /payload\.slug/);
});

test("启用分类自动关联前台导航、分类页和站点地图", async () => {
  const [home, chrome, categoryPage, sitemap, categoriesApi] = await Promise.all([
    read("app/page.tsx"),
    read("app/components/SiteChrome.tsx"),
    read("app/catalog/[slug]/page.tsx"),
    read("app/sitemap.ts"),
    read("app/api/categories/route.ts"),
  ]);
  assert.match(home, /fetch\("\/api\/categories"\)/);
  assert.match(chrome, /fetch\("\/api\/categories"\)/);
  assert.match(categoryPage, /getPublicProductCategories/);
  assert.match(categoryPage, /managedCategory\?\.name/);
  assert.match(sitemap, /managedCategorySlugs/);
  assert.match(categoriesApi, /s-maxage=60/);
});
