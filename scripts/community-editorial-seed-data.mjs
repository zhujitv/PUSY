export const editorialSeedActor = "system:community-editorial-seed-v1";

export const editorialProfiles = [
  { key: "editorial", email: "community-editorial@system.pusy.invalid", publicId: "MBR-PUSYEDIT0001", displayName: "PÚSY 编辑部", bio: "官方示例内容与社区创作指南。", officialLabel: "官方示例" },
  { key: "color", email: "community-color@system.pusy.invalid", publicId: "MBR-COLORLAB0001", displayName: "色彩灵感", bio: "记录妆容配色、质地与使用场景。", officialLabel: "官方示例" },
  { key: "care", email: "community-care@system.pusy.invalid", publicId: "MBR-CARENOTE0001", displayName: "护理笔记", bio: "整理护肤、身体与发丝护理灵感。", officialLabel: "官方示例" },
];

const post = (sequence, profileKey, topicSlug, productSlug, mediaPath, publishedAt, content) => ({
  id: `PST-SEED2026${String(sequence).padStart(4, "0")}`,
  mediaId: `MED-SEED2026${String(sequence).padStart(4, "0")}`,
  clientRequestId: `70000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
  profileKey,
  topicSlug,
  productSlug,
  mediaPath,
  publishedAt,
  ...content,
});

export const editorialPosts = [
  post(1, "color", "daily-makeup", "kremovye-rumyana-pusy-honey-25-gr-5-100362", "/assets/31.webp", "2026-07-22T10:20:00+08:00", {
    title: "官方示例｜低饱和通勤妆怎么写",
    body: "【官方示例内容】先记录场景，再写颜色与手法：薄涂 Honey 奶油腮红，从苹果肌向外晕开，保留皮肤本身的光泽。真实发布时，请替换成自己的肤质、用量和照片。",
    skinType: "normal", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["显色", "质地", "便携"], cautions: "示例评分不代表真实用户评价；请按个人肤色和妆效调整用量。",
  }),
  post(2, "color", "lip-diary", "maslo-dlya-gub-purple-rozovyiy-100781", "/assets/34.webp", "2026-07-23T19:10:00+08:00", {
    title: "官方示例｜冷调粉唇色日记",
    body: "【官方示例内容】唇色日记可以同时写底色、叠涂和光线：Purple 粉色唇油薄涂偏清透，叠涂后光泽更明显。真实分享时建议补充自然光照片与原生唇色。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["显色", "质地", "保湿"], cautions: "图片与文字为官方创作范例，实际显色会受原生唇色和光线影响。",
  }),
  post(3, "care", "real-empties", "gidrofilnoe-maslo-dlya-lica-pusy-110-ml-100733", "/assets/29.webp", "2026-07-24T21:30:00+08:00", {
    title: "官方示例｜空瓶记录要写哪些细节",
    body: "【官方示例内容】一篇有参考价值的空瓶记录，可以写清用量、乳化方式和后续肤感。示例：卸妆油干手干脸按摩后加水乳化，再以温水洗净，不把“洗得干净”等同于“越紧绷越好”。",
    skinType: "combination", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "保湿"], cautions: "本帖用于展示空瓶模板，并非真实用户空瓶或已购评价。",
  }),
  post(4, "care", "body-care", "gel-dlya-dusha-pusy-home-shower-body-gel-tobacco-pepper-vanilla-12-100495", "/assets/12.webp", "2026-07-25T20:45:00+08:00", {
    title: "官方示例｜把沐浴香气写具体",
    body: "【官方示例内容】与其只写“很好闻”，不如描述香气出现的顺序、停留时间和使用场景。示例可记录：洗浴时的香气、冲洗后的洁净感，以及是否会继续叠加同系列身体护理。",
    skinType: "normal", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["香气", "质地", "温和"], cautions: "香气感受具有主观性；敏感肌请先做局部测试。",
  }),
  post(5, "care", "hair-inspiration", "maska-dlya-volos-pusy-base-hair-500-g-100177", "/assets/15.webp", "2026-07-26T11:40:00+08:00", {
    title: "官方示例｜发膜记录看发尾变化",
    body: "【官方示例内容】发丝护理建议固定拍摄位置与光线，重点观察发尾顺滑度、打结情况和吹干后的蓬松感。示例流程：洗发后避开发根涂抹，停留后充分冲洗。",
    skinType: "dry", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "性价比"], cautions: "发质与染烫历史不同，使用频率请根据个人情况调整。",
  }),
  post(6, "color", "daily-makeup", "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769", "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp", "2026-07-27T09:15:00+08:00", {
    title: "官方示例｜灰粉腮红的分层方法",
    body: "【官方示例内容】先点少量再向颧骨外侧拍开，等第一层贴合后再决定是否叠加。发布自己的妆容时，可以写明工具、用量和室内外显色差异。",
    skinType: "normal", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["显色", "质地", "持妆"], cautions: "示例不构成真实试用结论，显色因肤色与底妆而异。",
  }),
  post(7, "color", "lip-diary", "karandash-dlya-gub-pusy-strawberry-100464", "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp", "2026-07-28T18:50:00+08:00", {
    title: "官方示例｜先勾轮廓还是先填色",
    body: "【官方示例内容】唇线记录可以对比两种方法：先从唇峰和嘴角确定轮廓，再向内轻轻填色；或只修饰局部不对称。请在真实分享中注明是否叠加唇油。",
    skinType: "normal", usagePeriod: "first-use", scene: "special-occasion", rating: 4,
    highlights: ["显色", "便携", "持妆"], cautions: "请勿过度外扩唇线；本帖为发布格式示例。",
  }),
  post(8, "care", "real-empties", "rebrending-micellyarnaya-voda-pusy-300-ml-100192", "/products/yandex/6kd4m58sgctsvp2pp49hhnqkbl9qrtm2-34ba97bf2f.webp", "2026-07-29T22:05:00+08:00", {
    title: "官方示例｜卸妆水空瓶复盘",
    body: "【官方示例内容】空瓶复盘可记录棉片用量、眼唇与底妆的处理差异，以及擦拭后的肤感。避免仅用“好用”下结论，把过程写清更能帮助其他会员。",
    skinType: "combination", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["温和", "质地", "性价比"], cautions: "眼唇区域请使用适合自己的卸妆方式；本帖不是已购晒单。",
  }),
  post(9, "care", "body-care", "rebrending-uvlajnyayshchiiy-krem-dlya-ruk-pusy-tobacco-pepper-vanilla-13-100658", "/products/yandex/6mf7tkr9h7pqkrh5b68ngmm4gvzhxzwv-7e50bc3cc5.webp", "2026-07-30T16:25:00+08:00", {
    title: "官方示例｜护手霜的办公桌记录",
    body: "【官方示例内容】可以从吸收速度、键盘是否留痕、洗手后是否需要补涂三个角度记录护手霜。把场景写具体，比单独描述香味更有参考价值。",
    skinType: "dry", usagePeriod: "one-week", scene: "work", rating: 4,
    highlights: ["质地", "香气", "便携"], cautions: "香气偏好因人而异；破损皮肤请谨慎使用。",
  }),
  post(10, "care", "hair-inspiration", "kondicioner-dlya-volos-pusy-base-hair-750-ml-1-1-100579", "/products/yandex/k8z7jqr222dm986pb7p9gm8jrhlpr5mm-edad3ae99b.webp", "2026-07-31T20:10:00+08:00", {
    title: "官方示例｜护发素只涂发中到发尾",
    body: "【官方示例内容】护理记录需要交代使用位置。示例：挤出适量后只涂发中到发尾，梳理均匀再冲洗，并观察湿发梳开和吹干后的差别。",
    skinType: "normal", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "性价比"], cautions: "用量过多可能影响蓬松感，请按发量调整。",
  }),
  post(11, "editorial", "daily-makeup", "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466", "/products/yandex/zjn8fdvmvdk8ls795pgph7fpd5v6q5pz-06f63ecad3.webp", "2026-08-01T12:05:00+08:00", {
    title: "官方示例｜把闪耀眼影放在一个重点",
    body: "【官方示例内容】日常闪片妆可以只保留一个视觉重点：少量点在上眼皮中央或眼头，再记录自然光和室内灯下的差别。真实分享请使用自己的妆容照片。",
    skinType: "normal", usagePeriod: "first-use", scene: "date", rating: 4,
    highlights: ["显色", "持妆", "便携"], cautions: "避免产品进入眼睛；本图为品牌素材，不是会员实拍。",
  }),
  post(12, "color", "lip-diary", "maslo-dlya-gub-red-krasnyiy-100784", "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp", "2026-08-02T19:35:00+08:00", {
    title: "官方示例｜红色唇油的薄涂与叠涂",
    body: "【官方示例内容】同一颜色可用两张图对比薄涂和叠涂，并写明是否先用纸巾压掉润唇产品。这样的变量说明比单张精修图更有帮助。",
    skinType: "normal", usagePeriod: "first-use", scene: "special-occasion", rating: 4,
    highlights: ["显色", "质地", "持妆"], cautions: "色彩显示受屏幕、光线和原生唇色影响。",
  }),
  post(13, "care", "real-empties", "gialuronovyiy-krem-dlya-lica-pusy-pusy-hyaluronic-face-cream-50-ml-8-100496", "/products/yandex/k47zztw2p5qjpkmxh6g4jqgvq9s5szvt-f9a85c796a.webp", "2026-08-03T10:50:00+08:00", {
    title: "官方示例｜面霜空瓶不要只写季节",
    body: "【官方示例内容】除季节外，还可记录空调环境、前序精华、单次用量和白天夜间的差别。空瓶帖应区分事实记录与个人偏好，避免把个体感受写成普遍结论。",
    skinType: "dry", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["保湿", "质地", "温和"], cautions: "本帖为写作模板，不代表真实空瓶或功效承诺。",
  }),
  post(14, "care", "body-care", "skrab-slaiym-dlya-tela-pusy-matcha-detox-100197", "/products/yandex/gtgw4pd8wqv56pmhn6g48x9cr5wtbsbn-cb3730cb5e.webp", "2026-08-04T21:15:00+08:00", {
    title: "官方示例｜身体磨砂记录力度和频率",
    body: "【官方示例内容】身体磨砂分享应写明肌肤是否湿润、按摩力度、使用部位和频率。示例中还可以补充冲洗后是否继续使用身体乳。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "香气"], cautions: "避免用于破损或敏感部位；请按个人耐受降低频率。",
  }),
  post(15, "care", "hair-inspiration", "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", "/products/yandex/9ljqdp62bm97wplgw622kqk8zb7jxslh-5afd9c93a3.webp", "2026-08-05T08:40:00+08:00", {
    title: "官方示例｜洗发记录从头皮状态开始",
    body: "【官方示例内容】先写洗发前的出油程度，再记录清洁次数、泡沫与冲洗过程，最后观察隔天发根状态。不要只用即时蓬松感替代完整记录。",
    skinType: "oily", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["温和", "香气", "性价比"], cautions: "头皮不适应停止使用并咨询专业人士；本帖为内容范例。",
  }),
  post(16, "editorial", "daily-makeup", "uvlajnyayshchiiy-mist-dlya-lica-pusy-moisturizing-face-mist-pusy-100-ml-100201", "/products/yandex/7f6z6xc4j2dqndprfkchgkzjgrmp4ngg-cc26326620.webp", "2026-08-05T17:55:00+08:00", {
    title: "官方示例｜妆前喷雾记录距离与用量",
    body: "【官方示例内容】妆前步骤也值得记录：喷洒距离、按压次数、等待时间，以及后续底妆是否搓泥。把操作写清，其他会员才能复现你的方法。",
    skinType: "combination", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["保湿", "便携", "温和"], cautions: "闭眼喷洒并避开吸入；示例不代表所有肤质结果。",
  }),
  post(17, "care", "body-care", "v-tube-gialuronovyiy-krem-gel-dlya-tela-pusy-hyaluronic-body-cream-gel-150-ml-100237", "/products/yandex/s48jqdqg4vhktdcm9c9q5zkjkbj49b2w-6f9c8e62c1.webp", "2026-08-06T20:20:00+08:00", {
    title: "官方示例｜身体乳记录别漏掉衣物触感",
    body: "【官方示例内容】身体乳除了延展和吸收，还可以记录涂完多久穿衣、衣物是否黏附，以及第二天干燥部位的变化。场景越具体，内容越有用。",
    skinType: "dry", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["保湿", "质地", "香气"], cautions: "避免在不耐受部位继续使用；本帖不是会员体验报告。",
  }),
  post(18, "care", "hair-inspiration", "nesmyvaemyiy-krem-spreiy-dlya-volos-pusy-base-hair-200-ml-100223", "/products/yandex/7w6c5ncwrvvtr4qjzvmzgjjhcszk8glg-1019b6f672.webp", "2026-08-07T09:30:00+08:00", {
    title: "官方示例｜免洗喷雾的左右侧对比",
    body: "【官方示例内容】可把头发分成左右两侧，在相同湿度和吹风方式下只改变产品用量，对比毛躁、顺滑与发尾重量感。真实发布请保留未修饰的对比图。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["质地", "便携", "温和"], cautions: "避开发根并从少量开始；本帖图片为商品素材。",
  }),
];
