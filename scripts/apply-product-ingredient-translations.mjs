import { readFile, writeFile } from "node:fs/promises";
import { localizeProductIngredients } from "./ingredient-translations.mjs";

const catalogPath = new URL("../app/data/products.generated.json", import.meta.url);
const auditPath = new URL("./catalog-ingredients.zh-CN.json", import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const existingAudit = await readFile(auditPath, "utf8").then(JSON.parse).catch(() => ({ products: {} }));
const audit = { version: 1, products: {}, archivedProducts: existingAudit.archivedProducts || {} };
const missing = [];

const translatedCatalog = catalog.map((product) => {
  const previous = existingAudit.products?.[product.slug];
  const sourceProduct = previous?.source && !/[A-Za-zА-Яа-яЁё]/.test(String(product.ingredients || ""))
    ? { ...product, ingredients: previous.source }
    : product;
  const localized = localizeProductIngredients(sourceProduct);
  if (localized.missing.length) missing.push({ slug: product.slug, tokens: localized.missing });
  audit.products[product.slug] = {
    source: localized.source,
    chinese: localized.ingredients,
    status: localized.status,
  };
  return { ...product, ingredients: localized.ingredients };
});

if (missing.length) {
  console.error(JSON.stringify(missing, null, 2));
  throw new Error(`仍有 ${missing.reduce((sum, item) => sum + item.tokens.length, 0)} 个成分名称未翻译`);
}

await writeFile(catalogPath, `${JSON.stringify(translatedCatalog, null, 2)}\n`, "utf8");
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Translated ingredients for ${translatedCatalog.length} products.`);
