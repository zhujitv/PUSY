export type BlogPost = {
  slug: string;
  aliases: string[];
  title: string;
  tag: string;
  image: string;
  intro: string;
  sections: [string, string][];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "daily-pusy-makeup",
    aliases: ["01981b2b-ea79-77ad-80e6-8b2f1f808928"],
    title: "用 PÚSY 完成理想日常妆容",
    tag: "日常妆容",
    image: "https://avatars.mds.yandex.net/get-yastore/19825297/p4p852fdns572nlgxwk469vbxg7kfhkv/orig",
    intro: "一套轻盈、快速又能保留个人特色的日常妆容，从自然眉形、通透气色到舒适唇妆逐步完成。",
    sections: [["先整理眉形", "顺着原生眉毛的方向梳理轮廓，再用眉笔少量填补空隙。眉头保持轻盈，眉峰与眉尾稍微清晰，最后使用定型啫喱固定。"], ["用腮红带出气色", "把少量奶油腮红点在颧骨上方，用指腹或海绵轻拍晕开。边缘越柔和，妆效越自然，也更容易和底妆融合。"], ["用唇妆完成整体", "先沿自然唇线勾勒轮廓，再将颜色轻轻向内晕染，叠加唇油或唇部果冻，让日常妆容保持舒适光泽。"]],
  },
  {
    slug: "five-brow-gels",
    aliases: ["01981b2d-54d8-765e-8906-afec86d506ad"],
    title: "PÚSY 五款眉胶：不同妆效怎么选",
    tag: "眉妆指南",
    image: "https://avatars.mds.yandex.net/get-yastore/19825297/d98hr6s6wfsj7vg6dqcxfxft4jdkbkj9/orig",
    intro: "透明定型、蓬松毛流和层压感需要不同的质地与刷法。先确定希望保留的眉毛状态，再选择对应产品。",
    sections: [["自然透明定型", "适合日常通勤和原生眉毛较整齐的人。刷头先带走多余膏体，再从眉头向眉尾顺着毛流薄薄梳开。"], ["蓬松与毛流感", "想要更明显的立体毛流，可以分区向上梳理，并在眉尾改变角度。等待第一层稍微成膜后再局部叠加，避免一次使用过量。"], ["层压感与强定型", "需要整日维持清晰眉形时，可先逆向带到眉毛根部，再顺向压平。卸妆时充分湿敷并温和清洁，减少拉扯。"]],
  },
  {
    slug: "morning-puffiness",
    aliases: ["01981b32-12e9-7a71-929d-fb7801521ff9"],
    title: "晨起浮肿是什么，为什么有时醒来像小鱼",
    tag: "护理知识",
    image: "https://avatars.mds.yandex.net/get-yastore/19297885/km5g6vpmwzglbwk68jtsrdh9b4v7429x/orig",
    intro: "晨起面部看起来浮肿，常与睡眠、前一晚的饮食和短暂的液体分布变化有关。温和护理比用力按摩更重要。",
    sections: [["先给身体一点时间", "起床后保持正常活动并补充适量水分，很多短暂浮肿会逐渐缓解。避免为了快速消肿而长时间冰敷或用力揉搓眼周。"], ["让护肤步骤更轻柔", "清洁后使用清爽保湿产品，以轻拍方式涂抹。使用按摩工具时保持足够润滑、控制力度，并避开皮肤破损或不适区域。"], ["留意持续或异常变化", "如果浮肿反复出现、持续不退，或伴随疼痛、呼吸不适等症状，应及时咨询医疗专业人员，而不是仅依赖护肤产品。"]],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug || post.aliases.includes(slug));
}
