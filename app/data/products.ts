export type Product = {
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  imageAlt?: string;
  badge?: string;
  category: string;
  description: string;
};

export const RUB_TO_CNY = 0.09;

export function formatCnyFromRub(rubles: number) {
  return `${(rubles * RUB_TO_CNY).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} 元`;
}

export const products: Product[] = [
  { slug: "karandash-dlya-broveiy-s-refilom-medium-brown-100758", name: "可替换芯眉笔 Dark Brown", price: 890, image: "/assets/16.webp", imageAlt: "/assets/18.webp", category: "眉妆", description: "纤细笔芯轻松勾勒自然眉形，顺滑显色，适合日常快速打造精致眉妆。" },
  { slug: "gidrofilnoe-maslo-dlya-lica-pusy-110-ml-100733", name: "轻盈面部卸妆油", price: 990, image: "/assets/21.webp", imageAlt: "/assets/33.webp", badge: "新品", category: "护肤", description: "轻盈油感配方，遇水迅速乳化，温和卸除彩妆与日常污垢，洗后清爽不紧绷。" },
  { slug: "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693", name: "Ice Baby 慕斯高光", price: 990, image: "/assets/20.webp", imageAlt: "/assets/34.webp", badge: "新品", category: "彩妆", description: "柔软慕斯质地与细腻珠光，为面部带来通透、自然的闪耀效果。" },
  { slug: "nabor-dlya-vosstanovleniya-volos-pusy-prime-your-prime-era-kit-100678", name: "Prime 修护头发套装", price: 3590, image: "/assets/19.webp", imageAlt: "/assets/15.webp", badge: "新品", category: "头发护理", description: "从清洁到修护的完整组合，帮助头发保持柔顺、光泽与轻盈质感。" },
  { slug: "sekretnyiy-boks-siyaiy-bez-sprosa-3-100738", name: "「无需许可，自在闪耀」神秘礼盒", price: 1990, oldPrice: 2660, image: "/assets/25.webp", imageAlt: "/assets/36.webp", badge: "新品", category: "神秘礼盒", description: "由 PÚSY 精心搭配的惊喜组合，打开礼盒，发现属于你的闪耀时刻。" },
  { slug: "sekretnyiy-boks-vsye-vklycheno-m-100729", name: "「全部包含」神秘礼盒", price: 1990, oldPrice: 2560, image: "/assets/23.webp", imageAlt: "/assets/30.webp", badge: "新品", category: "神秘礼盒", description: "彩妆、护理与生活方式单品的随机惊喜搭配，适合送给自己或重要的人。" },
  { slug: "sekretnyiy-boks-otpusk-dlya-sebya-s-100731", name: "「给自己放个假」神秘礼盒", price: 1990, oldPrice: 2560, image: "/assets/22.webp", imageAlt: "/assets/28.webp", badge: "新品", category: "神秘礼盒", description: "轻松愉悦的夏日主题礼盒，让日常护理也像一次短暂假期。" },
  { slug: "nabor-hodovoiy-letniiy-vaiyb-100687", name: "「美丽随身」限定套装", price: 5490, oldPrice: 6050, image: "/assets/32.webp", imageAlt: "/assets/05.webp", badge: "新品", category: "套装", description: "人气彩妆与便携化妆包组合，出门在外也能快速完成精致妆容。" },
  { slug: "kapsulnaya-tush-dlya-resnic-black-100670", name: "Black 胶囊睫毛膏", price: 990, image: "/assets/24.webp", imageAlt: "/assets/10.webp", category: "彩妆", description: "轻盈包裹每一根睫毛，打造清晰、纤长的黑色睫毛效果。" },
  { slug: "jele-dlya-gub-autumn-1-100675", name: "Winter 唇部果冻", price: 790, image: "/assets/17.webp", imageAlt: "/assets/06.webp", category: "彩妆", description: "水润果冻质地，为双唇增添通透光泽，同时保持柔软舒适。" },
  { slug: "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", name: "BASE HAIR 丰盈修护洗发水", price: 590, image: "/assets/19.webp", imageAlt: "/assets/15.webp", category: "头发护理", description: "温和洁净发丝与头皮，为日常护理带来轻盈蓬松的基础。" },
  { slug: "pusy-home-sol-dlya-vanny-bath-salt-400g-100160", name: "PÚSY HOME 香氛浴盐", price: 890, image: "/assets/14.webp", imageAlt: "/assets/13.webp", category: "家居", description: "烟草、胡椒与香草交织的温暖气息，把普通沐浴变成放松仪式。" },
];

export const categoryNames: Record<string, string> = {
  products: "全部商品", accessories: "配件", brows: "眉妆", "dlya-doma": "家居", face: "面部彩妆", hair: "头发护理", hity: "畅销单品", makiyazh: "彩妆", nabory: "套装", "sekretnye-boksy": "神秘礼盒", uhod: "护肤", "uhod-1": "身体护理",
  novinki: "新品", "vse-tovary": "全部商品", hits: "畅销单品", "karandashi-dlya-gub": "唇线笔", "geli-dlya-brovej": "眉毛定型啫喱", "kremovye-rumyana": "奶油腮红", shampuni: "洗发水", kosmetichki: "化妆包", "maslo-dlya-gub": "唇油",
};

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug) ?? products[0];
}
