const localCatalog = require("../data/products");
const { request } = require("./request");

const CACHE_KEY = "pusy_catalog_v2";
let products = readCache();

function readCache() {
  try {
    const cached = wx.getStorageSync(CACHE_KEY);
    if (cached && Array.isArray(cached.products) && cached.products.length) return cached.products;
  } catch (error) {
    // Storage is not available during some component test and startup contexts.
  }
  return localCatalog.products;
}

function categoriesFor(items) {
  return ["全部", ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))];
}

function snapshot(source = "cache") {
  return { products, categories: categoriesFor(products), source };
}

function findProduct(id) {
  const matched = products.find((product) => product.id === id) || localCatalog.products.find((product) => product.id === id);
  return matched || {
    id,
    name: "商品暂不可用",
    subtitle: "商品可能已下架或更新",
    category: "商品",
    priceFen: 0,
    priceText: "—",
    image: "/assets/01.jpg",
    images: ["/assets/01.jpg"],
    description: "请返回商品目录重新选择。",
    usage: "",
    highlights: [],
    stock: 0,
    inventoryVerified: true,
    purchasable: false,
  };
}

async function refreshCatalog() {
  try {
    const body = await request("/api/miniprogram/products");
    if (!body || !Array.isArray(body.products) || !body.products.length) throw new Error("商品数据为空");
    products = body.products;
    wx.setStorageSync(CACHE_KEY, { products, savedAt: Date.now() });
    return snapshot("api");
  } catch (error) {
    if (!products.length) products = localCatalog.products;
    return { ...snapshot(products === localCatalog.products ? "preview" : "cache"), error: error.message };
  }
}

module.exports = { findProduct, refreshCatalog, snapshot };
