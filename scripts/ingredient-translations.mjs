import mapAL from "./ingredient-maps/a-l.json" with { type: "json" };
import mapMZ from "./ingredient-maps/m-z.json" with { type: "json" };

const ingredientMap = { ...mapAL, ...mapMZ };

const protectedCompounds = [
  [/1\s*,\s*2-Hexanediol/gi, "1,2-己二醇"],
  [/Propylene\s*,\s*Glycol/gi, "丙二醇"],
  [/VP\/VA\s*,\s*Copolymer/gi, "VP/VA 共聚物"],
  [/Acrylates\/C10-30 Alkyl\s+(?:Methacrylate|\n\s*Methacrylate)\s*,\s*Copolymer/gi, "丙烯酸（酯）类/C10-30 烷醇丙烯酸酯交联聚合物"],
  [/Acrylates\/C10-30 Alkyl\s*,\s*Methacrylate\s*,\s*Copolymer/gi, "丙烯酸（酯）类/C10-30 烷醇丙烯酸酯交联聚合物"],
  [/Disodium\s*;\s*EDTA/gi, "EDTA 二钠"],
];

const missingSourceCopy = {
  accessory: "本品为配件，不适用化妆品成分表；材质请以商品实物标签标注为准。",
  bundle: "本套装包含多件产品，完整成分请分别参见套装内各单品包装及对应商品页面。",
  mystery: "礼盒内容按所选规格随机组合，完整成分请以收到的各单品包装标注为准。",
  unpublished: "原品牌页面暂未公开完整成分表，请以中国销售实物包装的成分标注为准。",
};

function protectCompounds(value) {
  const protectedValues = [];
  let output = value;
  for (const [pattern, translation] of protectedCompounds) {
    output = output.replace(pattern, () => {
      const placeholder = `__PUSY_INGREDIENT_${protectedValues.length}__`;
      protectedValues.push(translation);
      return placeholder;
    });
  }
  return { output, protectedValues };
}

function normalizeToken(value) {
  return value.trim().replace(/[.。]+$/, "").replace(/\s+/g, " ");
}

export function ingredientFallback(product) {
  if (product.category === "配件") return missingSourceCopy.accessory;
  if (product.category === "套装") return missingSourceCopy.bundle;
  if (product.category === "神秘礼盒") return missingSourceCopy.mystery;
  return missingSourceCopy.unpublished;
}

export function translateIngredientList(source) {
  const raw = String(source || "").trim();
  if (!raw) return { translated: "", missing: [] };
  if (!/[A-Za-zА-Яа-яЁё]/.test(raw)) return { translated: raw, missing: [] };

  const { output, protectedValues } = protectCompounds(raw.replace(/\r/g, ""));
  const prepared = output
    .replace(/，/g, ",")
    .replace(/；/g, ";")
    .replace(/([A-Za-z0-9/)])\n(?=[A-Za-z])/g, "$1 ");
  const missing = [];
  const paragraphs = prepared.split(/\n+/).map((paragraph) => {
    const translated = paragraph.split(/[,;]+/).map((part) => {
      const token = normalizeToken(part);
      if (!token) return "";
      const placeholder = token.match(/^__PUSY_INGREDIENT_(\d+)__$/);
      if (placeholder) return protectedValues[Number(placeholder[1])] || "";
      const mapped = ingredientMap[token];
      if (!mapped) missing.push(token);
      return mapped || token;
    }).filter(Boolean);
    return translated.join("、");
  }).filter(Boolean);

  return { translated: paragraphs.join("\n"), missing: [...new Set(missing)] };
}

export function localizeProductIngredients(product) {
  const source = String(product.ingredients || "").trim();
  if (!source) return { ingredients: ingredientFallback(product), source: null, status: product.category === "套装" ? "套装说明" : product.category === "神秘礼盒" ? "礼盒说明" : product.category === "配件" ? "材质说明" : "待品牌确认", missing: [] };
  const result = translateIngredientList(source);
  return { ingredients: result.translated, source, status: "已翻译", missing: result.missing };
}

export { ingredientMap };
