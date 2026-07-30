import { readFile, writeFile } from "node:fs/promises";
import {
  applyLegacyVariantTranslationOverrides,
  applyProductTranslationOverrides,
} from "./catalog-translation-overrides.mjs";

const catalogPath = new URL("../app/data/products.generated.json", import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const corrected = catalog.map((product) => ({
  ...applyProductTranslationOverrides(product),
  variants: applyLegacyVariantTranslationOverrides(product.variants),
}));

await writeFile(catalogPath, `${JSON.stringify(corrected, null, 2)}\n`, "utf8");
console.log(`Applied curated Chinese translations to ${corrected.length} products.`);
