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
    title: "最近很喜欢这种不费力的通勤腮红",
    body: "早上赶时间的时候，我会先在手背上点一点 Honey，再用指腹拍到苹果肌。第一层颜色很淡，几乎不用担心下手重；想让气色明显一点，再薄薄叠一层就够了。它不是那种很抢眼的腮红，但和日常底妆放在一起很舒服。",
    skinType: "normal", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["显色", "质地", "便携"], cautions: "示例评分不代表真实用户评价；请按个人肤色和妆效调整用量。",
  }),
  post(2, "color", "lip-diary", "maslo-dlya-gub-purple-rozovyiy-100781", "/assets/34.webp", "2026-07-23T19:10:00+08:00", {
    title: "这支粉色唇油比我想象中更日常",
    body: "本来以为 Purple 会是很挑人的冷粉色，实际薄涂只是在原本唇色上加了一层透亮感。白天我通常只涂一遍，嘴唇看起来会比较饱满；叠两三遍颜色更明显，但头发也更容易黏到唇上。自然光下的粉调最好看。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["显色", "质地", "保湿"], cautions: "图片与文字为官方创作范例，实际显色会受原生唇色和光线影响。",
  }),
  post(3, "care", "real-empties", "gidrofilnoe-maslo-dlya-lica-pusy-110-ml-100733", "/assets/29.webp", "2026-07-24T21:30:00+08:00", {
    title: "卸妆油用到后面，我最在意的是乳化",
    body: "这瓶快用完时才发现，乳化做得够不够真的比按摩多久更重要。我一般干手干脸按两泵，重点带过鼻翼和下巴，再分两次加水，油感会慢慢变成白色乳液。冲完不会有厚重膜感，但眼妆我还是习惯单独卸，省得来回揉。",
    skinType: "combination", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "保湿"], cautions: "本帖用于展示空瓶模板，并非真实用户空瓶或已购评价。",
  }),
  post(4, "care", "body-care", "gel-dlya-dusha-pusy-home-shower-body-gel-tobacco-pepper-vanilla-12-100495", "/assets/12.webp", "2026-07-25T20:45:00+08:00", {
    title: "洗完澡以后，浴室里会留一点暖暖的香气",
    body: "这款沐浴露刚挤出来时胡椒感比较明显，起泡以后会慢慢变柔和，最后留下偏暖的香草味。泡沫不算特别夸张，但很好冲干净。留香没有香水那么久，差不多就是洗完澡到睡前这一段时间，我反而觉得这样刚好。",
    skinType: "normal", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["香气", "质地", "温和"], cautions: "香气感受具有主观性；敏感肌请先做局部测试。",
  }),
  post(5, "care", "hair-inspiration", "maska-dlya-volos-pusy-base-hair-500-g-100177", "/assets/15.webp", "2026-07-26T11:40:00+08:00", {
    title: "发尾打结的时候，我会把发膜多停两分钟",
    body: "我的发尾偏干，洗完头最容易在肩膀附近打结。Base Hair 发膜我只涂发中到发尾，平时停三四分钟，特别干的时候会多等两分钟。冲洗后湿发确实更好梳，不过用量太多会让头发没那么蓬松，细软发建议先少一点。",
    skinType: "dry", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "性价比"], cautions: "发质与染烫历史不同，使用频率请根据个人情况调整。",
  }),
  post(6, "color", "daily-makeup", "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769", "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp", "2026-07-27T09:15:00+08:00", {
    title: "灰粉腮红少量叠两层刚刚好",
    body: "Sleepy Morning 在瓶子里看着有点灰，上脸反而是很安静的粉色。我会先点一小滴，用海绵余粉慢慢拍开，第一层像天生的气色；第二层只加在靠近颧骨的位置。室内看很自然，阳光下会更偏粉，拍照也不会突然变成两团红。",
    skinType: "normal", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["显色", "质地", "持妆"], cautions: "示例不构成真实试用结论，显色因肤色与底妆而异。",
  }),
  post(7, "color", "lip-diary", "karandash-dlya-gub-pusy-cream-100460", "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp", "2026-07-28T18:50:00+08:00", {
    title: "最近画唇线只修嘴角，不再整圈描",
    body: "以前我会把整圈唇线都描得很完整，近看总觉得有点刻意。现在只用 Cream 修一下唇峰和嘴角，再往里面轻轻带两下，轮廓会干净很多。单用是雾面的，想柔和一点就叠透明唇油。笔尖偏细，第一次画别太用力。",
    skinType: "normal", usagePeriod: "first-use", scene: "special-occasion", rating: 4,
    highlights: ["显色", "便携", "持妆"], cautions: "请勿过度外扩唇线；本帖为发布格式示例。",
  }),
  post(8, "care", "real-empties", "rebrending-micellyarnaya-voda-pusy-300-ml-100192", "/products/yandex/6kd4m58sgctsvp2pp49hhnqkbl9qrtm2-34ba97bf2f.webp", "2026-07-29T22:05:00+08:00", {
    title: "一瓶卸妆水快见底时，才发现棉片用量差很多",
    body: "淡妆的时候，两张浸透的棉片基本够用；如果当天叠了防晒和粉底，我会用到三四张。我的习惯是敷几秒再轻轻带走，不来回擦。卸完脸上比较清爽，但睫毛膏还是交给眼唇卸妆，硬用棉片蹭反而费时间。",
    skinType: "combination", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["温和", "质地", "性价比"], cautions: "眼唇区域请使用适合自己的卸妆方式；本帖不是已购晒单。",
  }),
  post(9, "care", "body-care", "rebrending-uvlajnyayshchiiy-krem-dlya-ruk-pusy-tobacco-pepper-vanilla-13-100658", "/products/yandex/6mf7tkr9h7pqkrh5b68ngmm4gvzhxzwv-7e50bc3cc5.webp", "2026-07-30T16:25:00+08:00", {
    title: "放在办公桌上的护手霜，清爽比滋润更重要",
    body: "我最怕涂完护手霜立刻摸键盘，按键上全是油印。这支一次挤黄豆大小就够，按摩十几秒后手心不会滑，继续打字没什么负担。滋润度属于日常维护型，冬天手特别干可能不够，但春夏放在办公室随手补涂很合适。",
    skinType: "dry", usagePeriod: "one-week", scene: "work", rating: 4,
    highlights: ["质地", "香气", "便携"], cautions: "香气偏好因人而异；破损皮肤请谨慎使用。",
  }),
  post(10, "care", "hair-inspiration", "kondicioner-dlya-volos-pusy-prime-hair-400-ml-100173", "/products/yandex/qwjtzhzb49jkmdccn7mlg7drvmf5f28g-3a8a01f743.webp", "2026-07-31T20:10:00+08:00", {
    title: "护发素涂到发根，第二天真的很容易塌",
    body: "这瓶我第一次用得太豪迈，连靠近头皮的位置都带到了，第二天发根直接没精神。后来改成从耳朵下面开始涂，停两三分钟再冲，发尾顺滑度够了，头顶也还能保持蓬松。长发用量会比较快，短发一次不用挤太多。",
    skinType: "normal", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "性价比"], cautions: "用量过多可能影响蓬松感，请按发量调整。",
  }),
  post(11, "editorial", "daily-makeup", "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466", "/products/yandex/zjn8fdvmvdk8ls795pgph7fpd5v6q5pz-06f63ecad3.webp", "2026-08-01T12:05:00+08:00", {
    title: "闪片只点眼皮中间，反而更耐看",
    body: "Sand 的亮片在盒子里看起来很闪，我以前会铺满整个眼皮，结果白天有点过头。现在用指腹蘸一点，只按在上眼皮正中间，眨眼时才会亮一下。室内灯下很细，阳光下存在感更强。卸妆时要多敷一会儿，细闪才不会到处跑。",
    skinType: "normal", usagePeriod: "first-use", scene: "date", rating: 4,
    highlights: ["显色", "持妆", "便携"], cautions: "避免产品进入眼睛；本图为品牌素材，不是会员实拍。",
  }),
  post(12, "color", "lip-diary", "maslo-dlya-gub-red-krasnyiy-100784", "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp", "2026-08-02T19:35:00+08:00", {
    title: "红色唇油薄涂很好看，叠太多会比较抢眼",
    body: "Red 我更喜欢点在下唇中间，再用手指往外晕，出来是很透的莓果红，素颜也能用。直接叠两三层会变得很亮，更适合晚上。它的光泽感很好，但不属于完全不黏的质地，喝水后杯口还是会留一点颜色。",
    skinType: "normal", usagePeriod: "first-use", scene: "special-occasion", rating: 4,
    highlights: ["显色", "质地", "持妆"], cautions: "色彩显示受屏幕、光线和原生唇色影响。",
  }),
  post(13, "care", "real-empties", "gialuronovyiy-krem-dlya-lica-pusy-pusy-hyaluronic-face-cream-50-ml-8-100496", "/products/yandex/k47zztw2p5qjpkmxh6g4jqgvq9s5szvt-f9a85c796a.webp", "2026-08-03T10:50:00+08:00", {
    title: "空调房里，我会把面霜用量加一点点",
    body: "这罐面霜平时一颗珍珠大小就够，连续吹空调那几天，我会在脸颊多按一点。质地推开后有存在感，但不是厚厚糊在脸上的感觉。白天用太多会影响后续底妆，所以我更喜欢晚上涂。鼻翼容易出油的位置会主动绕开。",
    skinType: "dry", usagePeriod: "one-month", scene: "daily", rating: 4,
    highlights: ["保湿", "质地", "温和"], cautions: "本帖为写作模板，不代表真实空瓶或功效承诺。",
  }),
  post(14, "care", "body-care", "skrab-slaiym-dlya-tela-pusy-matcha-detox-100197", "/products/yandex/gtgw4pd8wqv56pmhn6g48x9cr5wtbsbn-cb3730cb5e.webp", "2026-08-04T21:15:00+08:00", {
    title: "身体磨砂不用很用力，冲完反而更舒服",
    body: "Matcha Detox 我会在皮肤完全打湿后用，手肘和膝盖多按摩几圈，其他地方轻轻带过。颗粒感能摸到，但没必要为了追求“搓干净”一直用力。冲掉以后皮肤会比较滑，我通常接着涂身体乳。一周一次对我来说刚好。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["质地", "温和", "香气"], cautions: "避免用于破损或敏感部位；请按个人耐受降低频率。",
  }),
  post(15, "care", "hair-inspiration", "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", "/products/yandex/9ljqdp62bm97wplgw622kqk8zb7jxslh-5afd9c93a3.webp", "2026-08-05T08:40:00+08:00", {
    title: "洗发水好不好用，我会等到第二天再判断",
    body: "刚吹完头发蓬松不算什么，我更在意睡一晚以后发根的状态。Base Hair 我一般洗两遍，第一遍带走油脂，第二遍泡沫会更丰富。冲洗速度挺快，香味也不会留得太重。我的头皮第二天下午会开始出油，属于正常范围。",
    skinType: "oily", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["温和", "香气", "性价比"], cautions: "头皮不适应停止使用并咨询专业人士；本帖为内容范例。",
  }),
  post(16, "editorial", "daily-makeup", "uvlajnyayshchiiy-mist-dlya-lica-pusy-moisturizing-face-mist-pusy-100-ml-100201", "/products/yandex/7f6z6xc4j2dqndprfkchgkzjgrmp4ngg-cc26326620.webp", "2026-08-05T17:55:00+08:00", {
    title: "妆前喷雾别贴太近，底妆会更均匀",
    body: "一开始我离脸太近连喷好几下，局部湿得像淋雨，粉底反而不好上。后来拉开差不多一臂距离，左右各按一次，等表面没那么湿再上妆，服帖度会自然很多。午后觉得干也能补，但别对着已经起皮的位置猛喷。",
    skinType: "combination", usagePeriod: "first-use", scene: "work", rating: 4,
    highlights: ["保湿", "便携", "温和"], cautions: "闭眼喷洒并避开吸入；示例不代表所有肤质结果。",
  }),
  post(17, "care", "body-care", "v-tube-gialuronovyiy-krem-gel-dlya-tela-pusy-hyaluronic-body-cream-gel-150-ml-100237", "/products/yandex/s48jqdqg4vhktdcm9c9q5zkjkbj49b2w-6f9c8e62c1.webp", "2026-08-06T20:20:00+08:00", {
    title: "身体乳好不好用，看涂完能不能马上穿睡衣",
    body: "我洗完澡最没耐心等身体乳慢慢吸收，所以很在意穿衣时会不会黏。这支凝露质地推开很快，薄薄涂一层，两三分钟后穿棉质睡衣基本不会粘。小腿干的时候会再补一层，滋润度会更够；一次抹太厚还是会有存在感。",
    skinType: "dry", usagePeriod: "one-week", scene: "daily", rating: 4,
    highlights: ["保湿", "质地", "香气"], cautions: "避免在不耐受部位继续使用；本帖不是会员体验报告。",
  }),
  post(18, "care", "hair-inspiration", "nesmyvaemyiy-krem-spreiy-dlya-volos-pusy-base-hair-200-ml-100223", "/products/yandex/7w6c5ncwrvvtr4qjzvmzgjjhcszk8glg-1019b6f672.webp", "2026-08-07T09:30:00+08:00", {
    title: "免洗喷雾我只喷发尾，少一点更自然",
    body: "头发半干的时候，我会先喷在手心，再抓到发尾，这样比直接对着头发按更容易控制用量。吹干后毛躁感会收一点，梳起来也顺手。喷多了发尾会有重量，所以细软发真的从一下开始就好，觉得不够再加。",
    skinType: "normal", usagePeriod: "first-use", scene: "daily", rating: 4,
    highlights: ["质地", "便携", "温和"], cautions: "避开发根并从少量开始；本帖图片为商品素材。",
  }),
];
