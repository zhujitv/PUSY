"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { formatCnyFromRub } from "../data/products";

export type AdminProduct = {
  id: number; slug: string; name: string; category: string; category_id?: number; description: string;
  image: string; image_alt?: string; badge?: string; price: number; old_price?: number; stock: number;
  low_stock_threshold: number; inventory_verified: number; sku?: string; volume?: string; ingredients?: string;
  usage?: string; status: string;
};

export type ProductCategory = {
  id: number; name: string; slug: string; parent_id?: number | null; parent_name?: string | null;
  description: string; sort_order: number; status: "active" | "disabled"; product_count: number;
};

type Props = {
  products: AdminProduct[];
  categories: ProductCategory[];
  query: string;
  canManage: boolean;
  canInventoryManage: boolean;
  onCreate: () => void;
  onImport: () => void;
  onEdit: (product: AdminProduct) => void;
  onAct: (payload: Record<string, unknown>) => Promise<boolean>;
};

export function ProductManagement({ products, categories, query, canManage, canInventoryManage, onCreate, onImport, onEdit, onAct }: Props) {
  const [view, setView] = useState<"products" | "categories">("products");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryEditor, setCategoryEditor] = useState<ProductCategory | "new" | null>(null);
  const normalized = query.trim().toLowerCase();
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = !normalized || `${product.name} ${product.slug} ${product.category} ${product.sku ?? ""} ${product.status}`.toLowerCase().includes(normalized);
    return matchesQuery && (categoryFilter === "all" || String(product.category_id) === categoryFilter) && (statusFilter === "all" || product.status === statusFilter);
  }), [products, normalized, categoryFilter, statusFilter]);
  const visibleCategories = useMemo(() => categories.filter((category) => !normalized || `${category.name} ${category.slug} ${category.parent_name ?? ""} ${category.status}`.toLowerCase().includes(normalized)), [categories, normalized]);
  const registeredIds = new Set(categories.map((category) => category.id));
  const uncategorized = products.filter((product) => !product.category_id || !registeredIds.has(product.category_id)).length;
  const lowStock = products.filter((product) => product.inventory_verified && product.stock <= product.low_stock_threshold && product.status === "active").length;

  async function deleteCategory(category: ProductCategory) {
    if (!window.confirm(`确认删除分类“${category.name}”？已关联商品或下级分类时系统会阻止删除。`)) return;
    if (await onAct({ action: "delete-product-category", id: category.id })) setCategoryEditor(null);
  }

  return <div className="product-admin-stack">
    <section className="product-admin-kpis" aria-label="商品管理概览">
      <article><span>全部商品</span><b>{products.length}</b><small>{products.filter((product) => product.status === "active").length} 件销售中</small></article>
      <article><span>启用分类</span><b>{categories.filter((category) => category.status === "active").length}</b><small>共 {categories.length} 个分类</small></article>
      <article className={lowStock ? "warning" : ""}><span>低库存</span><b>{lowStock}</b><small>已核验且达到预警值</small></article>
      <article className={uncategorized ? "warning" : ""}><span>待归类</span><b>{uncategorized}</b><small>未关联分类资产的商品</small></article>
    </section>

    <section className="admin-panel product-admin-panel">
      <div className="product-admin-toolbar">
        <div className="product-admin-tabs" role="tablist" aria-label="商品中心视图">
          <button role="tab" aria-selected={view === "products"} className={view === "products" ? "active" : ""} onClick={() => setView("products")}>商品列表</button>
          <button role="tab" aria-selected={view === "categories"} className={view === "categories" ? "active" : ""} onClick={() => setView("categories")}>分类管理</button>
        </div>
        <div className="admin-panel-actions">
          {view === "products" ? <><a className="admin-export" href="/api/admin/export?type=products">导出 CSV</a>{canManage && <><button onClick={onImport}>批量导入</button><button className="admin-primary" onClick={onCreate}>＋ 新建商品</button></>}</> : canManage && <button className="admin-primary" onClick={() => setCategoryEditor("new")}>＋ 新建分类</button>}
        </div>
      </div>

      {view === "products" ? <>
        <div className="product-admin-filters">
          <label>分类<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">全部分类</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.parent_name ? `${category.parent_name} / ` : ""}{category.name}{category.status === "disabled" ? "（停用）" : ""}</option>)}</select></label>
          <label>销售状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">全部状态</option><option value="active">销售中</option><option value="archived">已下架</option></select></label>
          <span>当前显示 {visibleProducts.length} / {products.length} 件商品</span>
        </div>
        <div className="admin-table-wrap"><table><thead><tr><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>核验状态</th><th>状态</th><th>操作</th></tr></thead><tbody>{visibleProducts.length ? visibleProducts.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><Image src={product.image} alt="" width={54} height={64} sizes="54px" /><span><b>{product.name}</b><small>{product.sku ? `SKU ${product.sku}` : `/${product.slug}`}</small></span></div></td><td><b>{product.category}</b>{!product.category_id && <small className="category-warning">待关联分类</small>}</td><td>{formatCnyFromRub(product.price)}</td><td className={product.inventory_verified && product.stock <= product.low_stock_threshold ? "low-stock" : ""}>{product.inventory_verified ? product.stock : "—"}<small>预警 ≤ {product.low_stock_threshold}</small></td><td>{product.inventory_verified ? "已核验" : "待核验"}</td><td>{product.status === "active" ? "销售中" : "已下架"}</td><td>{(canManage || canInventoryManage) && <button className="admin-text-button" onClick={() => onEdit(product)}>{canManage ? "编辑" : "更新库存"}</button>}{canManage && product.status === "active" && <button className="admin-text-button danger" onClick={() => void onAct({ action: "archive-product", id: product.id })}>下架</button>}</td></tr>) : <tr><td className="admin-empty" colSpan={7}>当前筛选条件下没有商品</td></tr>}</tbody></table></div>
      </> : <>
        <div className="category-admin-intro"><div><b>分类结构</b><p>支持一级、二级分类、前台链接标识、排序和启停；分类改名会同步更新所属商品。</p></div><span>{visibleCategories.length} 个分类</span></div>
        <div className="admin-table-wrap"><table><thead><tr><th>分类名称</th><th>链接标识</th><th>上级分类</th><th>商品数</th><th>排序</th><th>状态</th><th>操作</th></tr></thead><tbody>{visibleCategories.length ? visibleCategories.map((category) => <tr key={category.id}><td><b>{category.parent_id ? `↳ ${category.name}` : category.name}</b><small>{category.description || "暂无分类说明"}</small></td><td><code>/{category.slug}</code></td><td>{category.parent_name || "一级分类"}</td><td><b>{category.product_count}</b></td><td>{category.sort_order}</td><td><span className={`category-status ${category.status}`}>{category.status === "active" ? "已启用" : "已停用"}</span></td><td>{canManage ? <><button className="admin-text-button" onClick={() => setCategoryEditor(category)}>编辑</button><button className="admin-text-button danger" disabled={category.product_count > 0} title={category.product_count > 0 ? "有关联商品的分类不能删除" : undefined} onClick={() => void deleteCategory(category)}>删除</button></> : "—"}</td></tr>) : <tr><td className="admin-empty" colSpan={7}>还没有符合条件的分类</td></tr>}</tbody></table></div>
      </>}
    </section>

    {categoryEditor && <CategoryModal category={categoryEditor === "new" ? null : categoryEditor} categories={categories} onClose={() => setCategoryEditor(null)} onSave={async (payload) => { const ok = await onAct({ action: categoryEditor === "new" ? "create-product-category" : "update-product-category", id: categoryEditor === "new" ? undefined : categoryEditor.id, ...payload }); if (ok) setCategoryEditor(null); }} />}
  </div>;
}

function CategoryModal({ category, categories, onClose, onSave }: { category: ProductCategory | null; categories: ProductCategory[]; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const parentOptions = categories.filter((item) => item.id !== category?.id && !item.parent_id);
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); await onSave(values); setBusy(false); }}><div className="admin-panel-title"><div><p>商品分类</p><h2 id="category-modal-title">{category ? "编辑分类" : "新建分类"}</h2></div><button type="button" onClick={onClose} aria-label="关闭">×</button></div><div className="admin-form-grid"><label>分类名称<input name="name" defaultValue={category?.name ?? ""} maxLength={60} required autoFocus /></label><label>链接标识<input name="slug" defaultValue={category?.slug ?? ""} pattern="[a-z0-9-]+" placeholder="例如 lip-care" required /></label><label>上级分类<select name="parentId" defaultValue={category?.parent_id ?? ""}><option value="">一级分类</option>{parentOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>显示顺序<input name="sortOrder" type="number" min="0" max="9999" defaultValue={category?.sort_order ?? categories.length * 10 + 10} required /></label><label>状态<select name="status" defaultValue={category?.status ?? "active"}><option value="active">启用</option><option value="disabled">停用</option></select></label><label className="full">分类说明<textarea name="description" defaultValue={category?.description ?? ""} rows={4} maxLength={500} placeholder="说明该分类包含哪些商品，方便运营协作" /></label></div><p className="admin-help">停用分类后不可再分配给新商品；已有商品不会自动下架。</p><button className="admin-save" disabled={busy}>{busy ? "正在保存…" : "保存分类"}</button></form></div>;
}
