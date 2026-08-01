export type NavigationCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_name?: string | null;
  sort_order: number;
  product_count: number;
};

export const fallbackNavigationCategories: NavigationCategory[] = [
  { id: 1, name: "彩妆", slug: "makiyazh", parent_id: null, sort_order: 10, product_count: 0 },
  { id: 2, name: "眉妆", slug: "brows", parent_id: null, sort_order: 20, product_count: 0 },
  { id: 3, name: "护肤", slug: "uhod", parent_id: null, sort_order: 30, product_count: 0 },
  { id: 4, name: "身体护理", slug: "uhod-1", parent_id: null, sort_order: 50, product_count: 0 },
  { id: 5, name: "头发护理", slug: "hair", parent_id: null, sort_order: 60, product_count: 0 },
  { id: 6, name: "套装", slug: "nabory", parent_id: null, sort_order: 70, product_count: 0 },
  { id: 7, name: "神秘礼盒", slug: "sekretnye-boksy", parent_id: null, sort_order: 80, product_count: 0 },
  { id: 8, name: "家居", slug: "dlya-doma", parent_id: null, sort_order: 90, product_count: 0 },
  { id: 9, name: "配件", slug: "accessories", parent_id: null, sort_order: 100, product_count: 0 },
];

export function storefrontNavItems(categories: NavigationCategory[]) {
  const hasLiveCounts = categories.some((category) => category.product_count > 0);
  const managed = categories.filter((category) => category.parent_id === null && category.slug !== "gift-card" && (!hasLiveCounts || category.product_count > 0)).map((category) => [category.name, `/catalog/${category.slug}`] as const);
  return [["全部商品", "/catalog/products"] as const, ...managed, ["新品", "/collections/novinki"] as const, ["畅销", "/catalog/hity"] as const, ["礼品卡", "/gift-card"] as const, ["社区", "/community"] as const];
}
