import { readFile, writeFile } from "node:fs/promises";
import {
  applyProductTranslationOverrides,
  getProductTranslationAlias,
  getProductTranslationOverride,
  translateVariantGroup,
  translateVariantLabel,
} from "./catalog-translation-overrides.mjs";

const SOURCE = "https://pusy.beauty";
const OUTPUT = new URL("../app/data/products.generated.json", import.meta.url);
const CACHE = "/tmp/pusy-cn-translation-cache.json";
const concurrency = 6;
const existingProducts = JSON.parse(await readFile(OUTPUT, "utf8").catch(() => "[]"));
const existingBySlug = new Map(existingProducts.map((product) => [product.slug, product]));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "PUSY.CN catalog synchronizer" } });
      if (response.ok) return response.text();
      lastError = new Error(`${response.status} ${url}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt === attempts) break;
    await sleep(attempt * 700);
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message || lastError}`);
}

async function loadCache() {
  try { return JSON.parse(await readFile(CACHE, "utf8")); } catch { return {}; }
}

const translationCache = await loadCache();
async function translate(text) {
  const source = String(text || "").trim();
  if (!source) return "";
  if (translationCache[source]) return translationCache[source];
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ru");
  url.searchParams.set("tl", "zh-CN");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", source);
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        const result = payload[0].map((part) => part[0]).join("").trim();
        translationCache[source] = result;
        await sleep(80);
        return result;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(attempt * 900);
  }
  console.warn(`Translation fallback used after repeated failure: ${lastError?.message || lastError}`);
  return source;
}

function parseState(html) {
  const match = html.match(/<script[^>]+id=['"]requestContext['"][^>]*>\s*([\s\S]*?)<\/script>/);
  if (!match) throw new Error("requestContext not found");
  return JSON.parse(match[1]);
}

function categoryName(value = "", slug = "") {
  const category = `${value} ${slug}`.toLowerCase();
  if (category.includes("секрет") || category.includes("бокс")) return "神秘礼盒";
  if (/otpusk-dlya-sebya|vsye-vklycheno|krasivo-otdyhay/.test(category)) return "神秘礼盒";
  if (category.includes("набор") || category.includes("nabor") || category.includes("hodovoiy")) return "套装";
  if (category.includes("бров") || category.includes("brov")) return "眉妆";
  if (category.includes("румян") || /rumyana|blush/.test(category)) return "彩妆";
  if (category.includes("волос") || category.includes("hair")) return "头发护理";
  if (category.includes("дом") || category.includes("home") || category.includes("vanny")) return "家居";
  if (category.includes("аксесс") || /kosmetich|polotenca|kist/.test(category)) return "配件";
  if (category.includes("тело") || /tela|body|dusha|ruk|avtozagar/.test(category)) return "身体护理";
  if (category.includes("уход") || /lica|face|micell|umyv|tonik|piling|gidrofil|krem-dlya-lica/.test(category)) return "护肤";
  return "彩妆";
}

function characteristic(variant, slug) {
  return variant.characteristics?.find((item) => item.slug === slug)?.value || "";
}

async function normalizedVariants(groupingCharacteristics = []) {
  const groups = await Promise.all(groupingCharacteristics.map(async (group) => {
    const sourceGroupName = group.title || group.name || "规格";
    return {
      name: translateVariantGroup(sourceGroupName) || await translate(sourceGroupName),
      options: await Promise.all((group.values || group.options || group.characteristics || []).map(async (option) => {
        const sourceOptionName = option.title || option.value || option.name || "";
        return {
          label: translateVariantLabel(sourceOptionName) || await translate(sourceOptionName),
          sku: option.variant?.sku || option.sku || "",
          price: Number(option.variant?.finalPrice || option.finalPrice || 0),
          slug: option.variantUrl ? option.variantUrl.split("?")[0].split("/").pop() : undefined,
          image: option.image?.filePath || undefined,
          color: option.color || undefined,
        };
      })),
    };
  }));
  return groups
    .map((group) => ({ ...group, options: group.options.filter((option) => option.label) }))
    .filter((group) => group.options.length);
}

async function mapLimit(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

const sitemap = await fetchText(`${SOURCE}/sitemap.xml`);
const urls = [...sitemap.matchAll(/<loc>(https:\/\/pusy\.beauty\/products\/[^<]+)<\/loc>/g)].map((match) => match[1]);
console.log(`Found ${urls.length} product URLs`);

const rawProducts = await mapLimit(urls, async (url, index) => {
  const html = await fetchText(url);
  const state = parseState(html);
  const entry = Object.entries(state.extractorContext).find(([key]) => key.startsWith("ProductCardExtractorFactory--"));
  if (!entry) throw new Error(`Product extractor missing: ${url}`);
  const model = entry[1].payload;
  const variant = model.mainVariant;
  const slug = new URL(url).pathname.split("/").pop();
  const existing = existingBySlug.get(slug) || existingBySlug.get(getProductTranslationAlias(slug));
  const override = getProductTranslationOverride(slug);
  const description = override.description || existing?.description || await translate(variant.description || "");
  const usage = override.usage || existing?.usage || await translate(characteristic(variant, "sposob-primeneniya"));
  const name = override.name || existing?.name || await translate(variant.name);
  const images = (variant.mediaItems || []).filter((item) => item.type === "IMAGE" && item.payload?.filePath).sort((a, b) => a.displaySequence - b.displaySequence).map((item) => item.payload.filePath);
  console.log(`[${index + 1}/${urls.length}] ${variant.slug}`);
  return applyProductTranslationOverrides({
    slug,
    name,
    price: Number(variant.finalPrice || 0),
    oldPrice: variant.price && Number(variant.price) !== Number(variant.finalPrice) ? Number(variant.price) : undefined,
    image: images[0] || "",
    imageAlt: images[1] || images[0] || "",
    images,
    badge: variant.badges?.some((badge) => badge.label === "Новинка") ? "新品" : variant.badges?.some((badge) => badge.label === "Хит") ? "畅销" : variant.badges?.some((badge) => badge.label === "Акция") ? "优惠" : undefined,
    category: categoryName(variant.categoryName, variant.slug),
    description,
    sku: variant.sku || undefined,
    volume: characteristic(variant, "obieem").replace(/мл/gi, "毫升").replace(/\bг\b/gi, "克") || undefined,
    ingredients: existing?.ingredients || characteristic(variant, "sostav") || undefined,
    usage: usage || undefined,
    inventoryVerified: false,
    stock: 0,
    variants: await normalizedVariants(model.groupingCharacteristics),
  });
});

const products = rawProducts.sort((a, b) => a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "zh-CN"));
await writeFile(OUTPUT, `${JSON.stringify(products, null, 2)}\n`, "utf8");
await writeFile(CACHE, JSON.stringify(translationCache), "utf8");
console.log(`Wrote ${products.length} products to ${OUTPUT.pathname}`);
