import catalog from "./products.generated.json";
import currentCollections from "./collections.2026-08-29.json";
import { giftCardAmountFromSlug, isGiftCardProductSlug as isGiftCardSlug } from "../../lib/shipping";

export type ProductVariantOption = {
  label: string;
  sku?: string;
  price?: number;
  slug?: string;
  image?: string;
  color?: string;
};

export type ProductVariantGroup = {
  name: string;
  options: ProductVariantOption[];
};

export type Product = {
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  imageAlt?: string;
  images?: string[];
  badge?: string;
  category: string;
  description: string;
  sku?: string;
  volume?: string;
  ingredients?: string;
  usage?: string;
  stock?: number;
  inventoryVerified?: boolean;
  variants?: ProductVariantGroup[];
};

export const RUB_TO_CNY = 0.12;

export function formatCnyFromRub(rubles: number) {
  return `${(rubles * RUB_TO_CNY).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} 元`;
}

export function isGiftCardProductSlug(slug: string) {
  return isGiftCardSlug(slug);
}

export function productDetailHref(product: Pick<Product, "slug" | "category">) {
  return product.category === "礼品卡" || isGiftCardProductSlug(product.slug) ? "/gift-card" : `/products/${product.slug}`;
}

export const products = catalog as Product[];

export const categoryNames: Record<string, string> = {
  products: "全部商品",
  accessories: "配件",
  brows: "眉妆",
  "dlya-doma": "家居",
  face: "面部护理",
  hair: "头发护理",
  hity: "畅销单品",
  makiyazh: "彩妆",
  nabory: "套装",
  "sekretnye-boksy": "神秘礼盒",
  uhod: "护肤",
  "uhod-1": "身体护理",
  novinki: "新品",
  "vse-tovary": "全部商品",
  hits: "畅销单品",
  "karandashi-dlya-gub": "唇线笔",
  "geli-dlya-brovej": "眉毛定型啫喱",
  "kremovye-rumyana": "奶油腮红",
  shampuni: "洗发水",
  kosmetichki: "化妆包",
  "maslo-dlya-gub": "唇油",
};

export const collectionNames: Record<string, string> = {
  "avtozagary-dlya-lica-i-tela": "面部与身体自助美黑",
  "balzam-dlya-gub": "润唇膏",
  "geli-dlya-brovej": "眉毛定型啫喱",
  "geli-i-penki-dlya-umyvaniya": "洁面啫喱与洁面泡沫",
  gift: "礼赠精选",
  hits: "畅销单品",
  "karandashi-dlya-gub": "唇线笔",
  "karandashi-plampery": "丰唇笔",
  "kondicionery-dlya-volos": "护发素",
  kosmetichki: "化妆包",
  "kremovye-rumyana": "奶油腮红",
  "kremy-dlya-ruk": "护手霜",
  "maski-dlya-volos": "发膜",
  "maslo-dlya-gub": "唇油",
  "micelyarnaya-voda": "卸妆水",
  novinki: "新品",
  shampuni: "洗发水",
  "skraby-dlya-tela": "身体磨砂",
  "skraby-slajmy": "果冻身体磨砂",
  teni: "眼影",
  "tushi-dlya-resnic": "睫毛膏",
  "vse-tovary": "全部商品",
  "zhele-dlya-gub": "唇部果冻",
  "cleansing-oil": "卸妆油",
  "emulsiya-dlya-lica": "面部乳液",
  "gel-dlya-umyvaniya-lica": "面部洁面啫喱",
  "koreiyskiiy-brend-kosmetiki": "精选彩妆品牌",
  "koreiyskiiy-uhod-za-volosami": "专业头发护理",
  "maslo-dlya-lica": "面部护理油",
  "mist-dlya-lica": "面部保湿喷雾",
  "molochko-dlya-umyvaniya": "洁面乳",
  "ochishchayshchaya-maska-dlya-lica": "清洁面膜",
  priority: "PÚSY 精选",
  "rumyana-v-sharikah": "腮红",
  "russkie-brendy-uhodovoiy-kosmetiki": "PÚSY 护理精选",
  "seconds-salon-hair-mask": "沙龙级发膜",
  "skrab-iz-kofe": "咖啡身体磨砂",
  "spreiy-dlya-tela-parfymirovannyiy": "香氛身体喷雾",
  "tush-burgundi": "酒红色睫毛膏",
  "tush-seraya": "灰色睫毛膏",
  "uvlajnyayshchie-maski-dlya-lica-v-domashnih-usloviyah": "居家保湿面膜",
  ...Object.fromEntries(Object.entries(currentCollections).map(([slug, collection]) => [slug, collection.name])),
};

const collectionMatchers: Record<string, RegExp> = {
  "avtozagary-dlya-lica-i-tela": /avtozagar|tan-mousse/,
  "balzam-dlya-gub": /balzam.*gub/,
  "geli-dlya-brovej": /gel.*brov|brov.*gel/,
  "geli-i-penki-dlya-umyvaniya": /gel.*umyv|penka.*umyv/,
  gift: /nabor|mini|kosmetichka/,
  "karandashi-dlya-gub": /karandash-dlya-gub/,
  "karandashi-plampery": /plamper/,
  "kondicionery-dlya-volos": /kondicioner/,
  kosmetichki: /kosmetichka/,
  "kremovye-rumyana": /kremovye-rumyana/,
  "kremy-dlya-ruk": /krem.*ruk/,
  "maski-dlya-volos": /maska.*volos|hair-mask/,
  "maslo-dlya-gub": /maslo-dlya-gub/,
  "micelyarnaya-voda": /micell|micellyar/,
  shampuni: /shampun/,
  "skraby-dlya-tela": /skrab.*tela|body.*scrub/,
  "skraby-slajmy": /skrab-slaiym/,
  teni: /teni/,
  "tushi-dlya-resnic": /tush|termogel/,
  "zhele-dlya-gub": /jele-dlya-gub/,
  "cleansing-oil": /gidrofil|maslo-dlya-lica/,
  "emulsiya-dlya-lica": /emulsiya/,
  "gel-dlya-umyvaniya-lica": /gel.*umyv/,
  "maslo-dlya-lica": /gidrofil|maslo-dlya-lica/,
  "mist-dlya-lica": /mist-dlya-lica/,
  "molochko-dlya-umyvaniya": /molochko.*umyv/,
  "ochishchayshchaya-maska-dlya-lica": /maska.*lica/,
  "rumyana-v-sharikah": /rumyana/,
  "seconds-salon-hair-mask": /maska.*volos|hair-mask/,
  "skrab-iz-kofe": /skrab/,
  "spreiy-dlya-tela-parfymirovannyiy": /spreiy-dlya-tela/,
  "tush-burgundi": /tush.*burgundi/,
  "tush-seraya": /tush.*ser/,
  "uvlajnyayshchie-maski-dlya-lica-v-domashnih-usloviyah": /maska.*lica/,
};

export function productsForCollection(slug: string) {
  const currentCollection = currentCollections[slug as keyof typeof currentCollections];
  if (currentCollection) {
    const productSlugs = new Set(currentCollection.products);
    return products.filter((product) => productSlugs.has(product.slug));
  }
  if (slug === "vse-tovary") return products;
  if (slug === "hits") return products.filter((product) => product.badge === "畅销");
  if (slug === "novinki") return products.filter((product) => product.badge === "新品");
  if (["priority", "koreiyskiiy-brend-kosmetiki", "russkie-brendy-uhodovoiy-kosmetiki"].includes(slug)) return products.slice(0, 16);
  if (slug === "koreiyskiiy-uhod-za-volosami") return products.filter((product) => product.category === "头发护理");
  const matcher = collectionMatchers[slug];
  return matcher ? products.filter((product) => matcher.test(product.slug)) : [];
}

export function getProduct(slug: string) {
  const giftCardAmount = giftCardAmountFromSlug(slug);
  if (giftCardAmount !== null) return { slug, name: "PÚSY 电子礼品卡", price: giftCardAmount, image: "/assets/41.webp", category: "礼品卡", description: "可用于 PÚSY 中国官方商城的记名电子礼品卡。", stock: 1, inventoryVerified: true } satisfies Product;
  return products.find((product) => product.slug === slug) ?? products[0];
}
