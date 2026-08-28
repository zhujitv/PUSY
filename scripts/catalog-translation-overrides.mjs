import translations from "./catalog-translations.zh-CN.json" with { type: "json" };
import updateTranslations from "./catalog-translations.2026-08-29.zh-CN.json" with { type: "json" };
import { localizeProductIngredients } from "./ingredient-translations.mjs";

const allowedProductFields = ["name", "category", "description", "usage", "volume"];

export function applyProductTranslationOverrides(product) {
  const override = getProductTranslationOverride(product.slug);
  const curated = { ...product };
  for (const field of allowedProductFields) {
    if (Object.prototype.hasOwnProperty.call(override, field)) curated[field] = override[field] || undefined;
  }
  curated.name = cleanCatalogCopy(curated.name);
  curated.description = cleanCatalogCopy(curated.description);
  curated.usage = cleanCatalogCopy(curated.usage) || undefined;
  curated.volume = normalizeVolume(curated.volume);
  curated.ingredients = /[\u3400-\u9fff]/.test(String(curated.ingredients || ""))
    ? curated.ingredients
    : localizeProductIngredients(curated).ingredients;
  return curated;
}

export function getProductTranslationOverride(slug) {
  const alias = getProductTranslationAlias(slug);
  return {
    ...(alias ? translations.products?.[alias] : {}),
    ...translations.products?.[slug],
    ...updateTranslations.products?.[slug],
  };
}

export function getProductTranslationAlias(slug) {
  return updateTranslations.aliases?.[slug];
}

export function translateVariantGroup(source, fallback) {
  const key = String(source || "").trim();
  return updateTranslations.variantGroups?.[key] || translations.variantGroups?.[key] || fallback;
}

export function translateVariantLabel(source, fallback) {
  const key = String(source || "").trim();
  return updateTranslations.variantLabels?.[key] || translations.variantLabels?.[key] || fallback;
}

export function applyLegacyVariantTranslationOverrides(variants = []) {
  return variants.map((group) => ({
    ...group,
    name: translations.legacyVariantGroups?.[String(group.name || "").trim()] || group.name,
    options: (group.options || []).map((option) => ({
      ...option,
      label: translations.legacyVariantLabels?.[String(option.label || "").trim()] || option.label,
    })),
  }));
}

export function cleanCatalogCopy(value) {
  return String(value || "")
    .replace(/&lt;br\s*\/?&gt;|<br\s*\/?>/gi, "\n")
    .replace(/_\\?\*/g, "")
    .replace(/\\?\*_/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/普西/g, "PÚSY")
    .replace(/\bPUSY\b/g, "PÚSY")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeVolume(value) {
  return cleanCatalogCopy(value)
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\bмл\b/gi, "毫升")
    .replace(/\bг\b/gi, "克")
    .replace(/\s+(?=毫升|克)/g, "")
    .replace(/\s*;\s*/g, "；")
    .trim() || undefined;
}
