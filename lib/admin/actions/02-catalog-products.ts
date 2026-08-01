import { notifyProductChange } from "../../growth/automations";

const yuanToStored = (value: unknown) => Math.round(Number(value) / 0.12);
const validImagePath = (value: string) => /^\/(assets|products)\/[A-Za-z0-9_./-]+$/.test(value) || /^https:\/\/avatars\.mds\.yandex\.net\/get-yastore\//.test(value);
const normalizeManagedSlug = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const createManagedSlug = (value: unknown, prefix: "category" | "product") => normalizeManagedSlug(value) || prefix + "-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleCatalogProductAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db, actor } = context;
  if (action === "create-product-category" || action === "update-product-category") {
      const id = Number(payload.id);
      const name = String(payload.name ?? "").trim().slice(0, 60);
      const description = String(payload.description ?? "").trim().slice(0, 500);
      const sortOrder = Math.min(9999, Math.max(0, Math.round(Number(payload.sortOrder ?? 0))));
      const status = String(payload.status ?? "active");
      const parentId = payload.parentId ? Number(payload.parentId) : null;
      if (!name || !Number.isFinite(sortOrder) || !["active", "disabled"].includes(status)) return Response.json({ error: "请完整填写分类名称和状态" }, { status: 400 });
      if (action === "update-product-category" && (!Number.isInteger(id) || id < 1)) return Response.json({ error: "分类编号无效" }, { status: 400 });
      if (parentId && (!Number.isInteger(parentId) || parentId < 1 || parentId === id)) return Response.json({ error: "上级分类无效" }, { status: 400 });
      const previous = action === "update-product-category" ? await db.prepare("SELECT name, slug FROM product_categories WHERE id = ? LIMIT 1").bind(id).first<{ name: string; slug: string }>() : null;
      if (action === "update-product-category" && !previous) return Response.json({ error: "分类不存在" }, { status: 404 });
      const duplicate = await db.prepare("SELECT id FROM product_categories WHERE name = ? AND id <> ? LIMIT 1").bind(name, action === "update-product-category" ? id : 0).first();
      if (duplicate) return Response.json({ error: "分类名称已存在" }, { status: 409 });
      if (parentId) {
        const parent = await db.prepare("SELECT id FROM product_categories WHERE id = ? LIMIT 1").bind(parentId).first();
        if (!parent) return Response.json({ error: "上级分类不存在" }, { status: 400 });
        if (action === "update-product-category") {
          const descendant = await db.prepare("WITH RECURSIVE descendants AS (SELECT id FROM product_categories WHERE parent_id = ? UNION ALL SELECT c.id FROM product_categories c JOIN descendants d ON c.parent_id = d.id) SELECT id FROM descendants WHERE id = ? LIMIT 1").bind(id, parentId).first();
          if (descendant) return Response.json({ error: "不能把分类移动到自己的下级分类中" }, { status: 409 });
        }
      }
      if (action === "create-product-category") {
        const slug = createManagedSlug(name, "category");
        const created = await db.prepare("INSERT INTO product_categories (name, slug, parent_id, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id").bind(name, slug, parentId, description, sortOrder, status).first<{ id: number }>();
        payload.id = created?.id ?? "";
      } else {
        await db.batch([
          db.prepare("UPDATE product_categories SET name = ?, parent_id = ?, description = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, parentId, description, sortOrder, status, id).requireChanges("分类不存在"),
          db.prepare("UPDATE products SET category = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ? OR (category_id IS NULL AND category = ?)").bind(name, id, id, previous?.name ?? name),
        ]);
      }
    } else if (action === "delete-product-category") {
      const id = Number(payload.id);
      if (!Number.isInteger(id) || id < 1) return Response.json({ error: "分类编号无效" }, { status: 400 });
      const usage = await db.prepare("SELECT (SELECT COUNT(*) FROM products WHERE category_id = ?)::INTEGER AS product_count, (SELECT COUNT(*) FROM product_categories WHERE parent_id = ?)::INTEGER AS child_count").bind(id, id).first<{ product_count: number; child_count: number }>();
      if ((usage?.product_count ?? 0) > 0) return Response.json({ error: "该分类仍有关联商品，请先调整商品分类或停用分类" }, { status: 409 });
      if ((usage?.child_count ?? 0) > 0) return Response.json({ error: "该分类仍有下级分类，请先调整下级分类" }, { status: 409 });
      await db.prepare("DELETE FROM product_categories WHERE id = ?").bind(id).requireChanges("分类不存在").run();
    } else if (action === "bulk-import-products") {
      const items = Array.isArray(payload.products) ? payload.products.slice(0, 200) as Record<string, unknown>[] : [];
      if (!items.length) return Response.json({ error: "没有可导入的商品" }, { status: 400 });
      const statements = [];
      const categoryRows = await db.prepare("SELECT id, name FROM product_categories WHERE status = 'active'").all<{ id: number; name: string }>();
      const categoryIds = new Map(categoryRows.results.map((category) => [category.name, category.id]));
      for (const item of items) {
        const name = String(item.name ?? "").trim();
        const slug = createManagedSlug(item.slug || `${String(item.sku ?? "")} ${name}`, "product");
        const category = String(item.category ?? "").trim();
        const categoryId = categoryIds.get(category);
        const image = String(item.image ?? "").trim();
        const price = yuanToStored(item.price);
        if (!slug || !name || !categoryId || !validImagePath(image) || !Number.isFinite(price)) return Response.json({ error: `商品 ${name || slug || "未知"} 的必填信息、分类或图片地址无效` }, { status: 400 });
        statements.push(db.prepare("INSERT INTO products (slug, name, category, category_id, description, image, image_alt, badge, price, old_price, stock, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category = excluded.category, category_id = excluded.category_id, description = excluded.description, image = excluded.image, image_alt = excluded.image_alt, badge = excluded.badge, price = excluded.price, old_price = excluded.old_price, stock = excluded.stock, inventory_verified = excluded.inventory_verified, sku = excluded.sku, volume = excluded.volume, ingredients = excluded.ingredients, usage = excluded.usage, status = excluded.status, updated_at = CURRENT_TIMESTAMP").bind(slug, name, category, categoryId, String(item.description ?? ""), image, String(item.imageAlt ?? "") || null, String(item.badge ?? "") || null, price, item.oldPrice ? yuanToStored(item.oldPrice) : null, Math.max(0, Math.round(Number(item.stock ?? 0))), item.inventoryVerified ? 1 : 0, String(item.sku ?? "") || null, String(item.volume ?? "") || null, String(item.ingredients ?? "") || null, String(item.usage ?? "") || null, String(item.status ?? "active")));
      }
      await db.batch(statements);
      return Response.json({ ok: true, imported: statements.length });
    } else if (action === "create-product" || action === "update-product") {
      const name = String(payload.name ?? "").trim();
      const categoryId = Number(payload.categoryId);
      const categoryRow = Number.isInteger(categoryId) && categoryId > 0 ? await db.prepare("SELECT id, name, status FROM product_categories WHERE id = ? LIMIT 1").bind(categoryId).first<{ id: number; name: string; status: string }>() : null;
      const currentProduct = action === "update-product" ? await db.prepare("SELECT slug, name, price, stock, category_id FROM products WHERE id = ? LIMIT 1").bind(Number(payload.id)).first<{ slug: string; name: string; price: number; stock: number; category_id: number | null }>() : null;
      let slug = currentProduct?.slug ?? createManagedSlug(`${String(payload.sku ?? "")} ${name}`, "product");
      if (action === "create-product") {
        const slugExists = await db.prepare("SELECT id FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
        if (slugExists) slug = `${slug.slice(0, 72)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 7)}`;
      }
      const category = categoryRow?.name ?? "";
      const image = String(payload.image ?? "").trim();
      const price = yuanToStored(payload.price);
      const categoryAllowed = categoryRow && (categoryRow.status === "active" || currentProduct?.category_id === categoryRow.id);
      if (!name || !slug || !categoryAllowed || !validImagePath(image) || !Number.isFinite(price) || price < 0) return Response.json({ error: "请完整填写商品信息，选择已启用分类，并使用站内图片或允许的历史图片地址" }, { status: 400 });
      const stock = Math.max(0, Math.round(Number(payload.stock ?? 0)));
      const values = [slug, name, category, categoryId, String(payload.description ?? ""), image, String(payload.imageAlt ?? "") || null, String(payload.badge ?? "") || null, price, payload.oldPrice ? yuanToStored(payload.oldPrice) : null, stock, Math.max(0, Math.round(Number(payload.lowStockThreshold ?? 10))), payload.inventoryVerified ? 1 : 0, String(payload.sku ?? "") || null, String(payload.volume ?? "") || null, String(payload.ingredients ?? "") || null, String(payload.usage ?? "") || null, String(payload.status ?? "active")];
      if (action === "create-product") await db.prepare("INSERT INTO products (slug, name, category, category_id, description, image, image_alt, badge, price, old_price, stock, low_stock_threshold, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...values).run();
      else {
        await db.prepare("UPDATE products SET slug = ?, name = ?, category = ?, category_id = ?, description = ?, image = ?, image_alt = ?, badge = ?, price = ?, old_price = ?, stock = ?, low_stock_threshold = ?, inventory_verified = ?, sku = ?, volume = ?, ingredients = ?, usage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(...values, Number(payload.id)).run();
        if (currentProduct) await notifyProductChange({ slug, name, oldPrice: currentProduct.price, newPrice: price, oldStock: currentProduct.stock, newStock: stock, changeToken: crypto.randomUUID() }).catch(() => undefined);
      }
    } else if (action === "archive-product") {
      await db.prepare("UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(payload.id)).run();
    } else if (action === "update-product-inventory") {
      const id = Number(payload.id);
      const stock = Math.max(0, Math.round(Number(payload.stock ?? 0)));
      const lowStockThreshold = Math.max(0, Math.round(Number(payload.lowStockThreshold ?? 10)));
      if (!Number.isInteger(id) || id < 1 || !Number.isFinite(stock)) return Response.json({ error: "商品库存信息无效" }, { status: 400 });
      const previous = await db.prepare("SELECT slug, name, price, stock FROM products WHERE id = ? LIMIT 1").bind(id).first<{ slug: string; name: string; price: number; stock: number }>();
      const result = await db.prepare("UPDATE products SET stock = ?, low_stock_threshold = ?, inventory_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(stock, lowStockThreshold, payload.inventoryVerified ? 1 : 0, id).run();
      if (!result.meta.changes) return Response.json({ error: "商品不存在" }, { status: 404 });
      if (previous) {
        const referenceId = `admin:${crypto.randomUUID()}`;
        await db.prepare("INSERT INTO inventory_movements (product_slug, movement_type, quantity, stock_after, reference_id, actor) VALUES (?, 'adjust', ?, ?, ?, ?)").bind(previous.slug, stock - previous.stock, stock, referenceId, actor.email).run();
        await notifyProductChange({ slug: previous.slug, name: previous.name, oldPrice: previous.price, newPrice: previous.price, oldStock: previous.stock, newStock: stock, changeToken: crypto.randomUUID() }).catch(() => undefined);
      }
  } else return false;
  return true;
}
