-- Curated Simplified Chinese catalog translations reviewed against https://pusy.beauty on 2026-07-30.
-- This migration intentionally leaves prices, SKU values, media, and all inventory fields unchanged.

CREATE TEMP TABLE catalog_translation_overrides (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  volume TEXT,
  usage TEXT,
  variants JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO catalog_translation_overrides (slug, name, category, description, volume, usage, variants)
SELECT slug, name, category, description, volume, usage, variants
FROM jsonb_to_recordset($catalog_data$[
  {
    "slug": "karandash-dlya-gub-pusy-strawberry-100464",
    "name": "Strawberry 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Strawberry 是一款冷调粉色，可为自然唇色增加鲜明度。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-gub-pusy-morning-100461",
    "name": "Morning 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Morning 是恰到好处的柔和粉色，为妆容增添清新感。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-gub-pusy-cream-100460",
    "name": "Cream 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Cream 是一款略带暖调的棕色，仿佛牛奶巧克力融化在双唇上。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "jele-dlya-gub-autumn-1-100675",
    "name": "Winter 果冻唇蜜",
    "category": "彩妆",
    "description": "浆果色泽，比亲吻后的唇色更动人。\n\nPÚSY Winter 唇冻是一款凝胶质地的保湿唇部产品，为双唇增添鲜明色泽与釉面般水润光泽。视觉上让双唇更饱满、平滑，呈现精致妆效且不黏腻。\n\n配方有助于修饰干燥和细小唇纹；可通过叠涂调节显色度：一层轻透，继续叠涂则色彩更浓郁，呈现饱满染唇效果。维生素 E 帮助柔润保湿并维持舒适感，让双唇四季都显得好看。\n\n可与唇线笔或染唇产品搭配，增强色彩并增加光泽。可用指腹或唇刷涂抹，选择你顺手的方式即可。",
    "volume": null,
    "usage": "用指尖将少量产品涂抹到嘴唇上。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "酒红色",
            "sku": "",
            "price": 0,
            "slug": "jele-dlya-gub-autumn-1-100675",
            "image": "/products/yandex/v45ntlxwnlbqrrf9bt4lpbm7g6k62pwq-278d456bab.webp",
            "color": "#C2C2C2"
          },
          {
            "label": "珊瑚色",
            "sku": "",
            "price": 0,
            "slug": "jele-dlya-gub-autumn-1-100675",
            "image": "/products/yandex/v45ntlxwnlbqrrf9bt4lpbm7g6k62pwq-278d456bab.webp",
            "color": "#F18D56"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "jele-dlya-gub-autumn-1-100675",
            "image": "/products/yandex/v45ntlxwnlbqrrf9bt4lpbm7g6k62pwq-278d456bab.webp",
            "color": "#744E35"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "jele-dlya-gub-autumn-1-100675",
            "image": "/products/yandex/v45ntlxwnlbqrrf9bt4lpbm7g6k62pwq-278d456bab.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
    "name": "Purple 粉色唇油",
    "category": "彩妆",
    "description": "一款为您的妆容增添表现力的色调，其质地呵护您的双唇。\n\nPÚSY Purple Lip Oil 打造玻璃光泽，底色略带冷色调，强调唇部形状并增加唇部深度。它看起来令人印象深刻，但佩戴起来仍然轻便舒适。油配方有助于软化双唇、平滑表面并在视觉上增强丰盈度。\n\n方便的涂抹器可让您准确、均匀地涂抹产品，只需几下即可打造整洁的妆容。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-black-chernyiy-100779",
    "name": "Black 黑色唇油",
    "category": "彩妆",
    "description": "富有表现力的色泽与唇部护理质地兼具。\n\nPÚSY Black 唇油呈现带冷调的镜面光泽，突出唇部轮廓与形状。配方帮助平滑双唇，并在视觉上增加丰盈感；樱桃利口酒香气增添大胆个性，让人想反复体验。\n\n方便的涂抹头可快速、利落地涂抹唇油，无需繁琐步骤。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-red-krasnyiy-100784",
    "name": "Red 红色唇油",
    "category": "彩妆",
    "description": "经典红色，同时呵护双唇。色泽凸显唇部魅力，质地则带来护理。\n\nPÚSY Red 唇油形成亮泽妆效，可搭配日常妆容。恰到好处的红色适合多种风格，令双唇看起来饱满迷人。\n\n配方温和护理娇嫩唇部，帮助改善干燥并维持柔润。唇油质地赋予光泽，营造视觉丰盈感。方便的涂抹头只需几下即可快速均匀上妆；成熟覆盆子的甜美香气，让人想反复使用。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-gub-pusy-passion-100463",
    "name": "Passion 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Passion 是一款奢华梅子色，适合喜欢饱满水润唇妆效果的人群。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "kapsulnaya-tush-dlya-resnic-black-100670",
    "name": "Black 温水可卸管状睫毛膏",
    "category": "彩妆",
    "description": "这款睫毛膏可打造根根分明、自然卷翘的睫毛妆效。膏体不结块、不掉屑，卷翘效果可维持一整天。更特别的是它的卸除方式。\n\n遇温水后，膏体会以小管状从睫毛上轻柔脱落，不流黑水、不晕染，也不会形成熊猫眼。\n\n提供经典黑和中性深棕两种色号。",
    "volume": "10毫升",
    "usage": "涂于洁净、干燥的睫毛，从根部向梢部刷涂。将睫毛膏均匀包裹每根睫毛，打造纤长丰盈妆效。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "kapsulnaya-tush-dlya-resnic-black-100670",
            "image": "/products/yandex/glr7qxrcgc8xlrsjzsw78n695nsjk5rb-99328fdaf9.webp",
            "color": "#000000"
          },
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "kapsulnaya-tush-dlya-resnic-black-100670",
            "image": "/products/yandex/glr7qxrcgc8xlrsjzsw78n695nsjk5rb-99328fdaf9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "klassicheskaya-tush-dlya-resnic-pusy-black-10-ml-100365",
    "name": "睫毛膏黑色",
    "category": "彩妆",
    "description": "PÚSY Choco Mascara Dark Chocolate 呈现如黑巧克力般浓郁的黑色，是经典黑色睫毛膏，也是 PÚSY 化妆包中的基础款。\n\n它不仅通过纤长、根根分明的睫毛突出眼神，也在日间给予睫毛护理。方便的刷头可细致包裹并拉长每根睫毛，特殊形状帮助自然卷翘。\n\n小烛树蜡帮助锁住睫毛水分，乳木果油和蜂蜜为睫毛补充滋润。膏体耐潮，不易印染、留痕或掉屑。\n\n适合深发色人群，也适合偏爱更鲜明睫妆的人。",
    "volume": null,
    "usage": "涂于洁净、干燥的睫毛，从根部向梢部刷涂。将睫毛膏均匀包裹每根睫毛，打造纤长丰盈妆效。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "浅棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-light-brown-10-ml-100363",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#C2C2C2"
          },
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-dark-brown-10-ml-100364",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#4B3323"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-black-10-ml-100365",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#000000"
          }
        ]
      }
    ]
  },
  {
    "slug": "termogel-dlya-resnic-pusy-black-5-ml-13-100413",
    "name": "Lash Fix 睫毛定型啫喱",
    "category": "彩妆",
    "description": "PÚSY Lash Fix Gel 是一款带来仿沙龙翘睫定型效果、自然突出睫毛的睫毛凝胶。它凸显睫毛本身的美，带来淡淡色泽，在视觉上拉长睫毛并固定卷翘度，却几乎没有明显妆感。\n\n配方持效超过 12 小时：凝胶不掉屑、不压塌睫毛，全天保持整洁效果。便捷刷头可从根部轻松包裹睫毛，均匀涂布产品并细致分开每根睫毛，呈现干净、细致的效果。\n\n淡淡色素让睫毛稍显深邃、更有神，同时保持自然，仿佛化了妆却不着痕迹。配方适合日常使用。当你不想用睫毛膏、却想让眼神更突出时，就用 PÚSY Lash Fix Gel。",
    "volume": "5毫升",
    "usage": "用刷头蘸取少量凝胶，从睫毛根部向梢部涂抹，并梳理出所需形状。",
    "variants": []
  },
  {
    "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
    "name": "Crystal Pink 浅粉色唇油",
    "category": "彩妆",
    "description": "一款为您的妆容增添表现力的色调，其质地呵护您的双唇。 PÚSY Crystal Pink Lip Oil 营造出玻璃般的光泽，带有轻微的冷色调底色，强调嘴唇的形状并增加嘴唇的深度。它看起来令人印象深刻，但佩戴起来仍然轻便舒适。\n\n油配方有助于软化双唇、平滑表面并在视觉上增强丰盈度。方便的涂抹器可让您准确、均匀地涂抹产品，只需几下即可打造整洁的妆容。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-plamper-dlya-gub-pusy-chili-100455",
    "name": "Chili 丰唇唇线笔",
    "category": "彩妆",
    "description": "打造醒目、持久唇妆组合并带轻微丰唇感的理想唇笔。\n\nPÚSY Chili 丰唇唇笔采用鲜明色调，立即令唇形更突出。柔软笔芯顺滑描画，勾勒均匀轮廓而不显干、不适。轻柔涂抹并晕开边缘可塑造唇部轮廓，也可清晰勾边打造更醒目妆容。\n\n轻微温热与细腻刺感带来视觉丰唇效果，使双唇看起来更饱满。\n\n配方持久服帖，全天不易结块或晕染。自动旋转式笔身无需削笔，随时可以使用。",
    "volume": null,
    "usage": "取少量产品涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Chili",
            "sku": "",
            "price": 0,
            "slug": "karandash-plamper-dlya-gub-pusy-chili-100455",
            "image": "/products/yandex/pthxbb8prc89th87kltgckgst7sxqdp2-a941ae9e3b.webp",
            "color": "#AC2216"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-gub-pusy-mommy-100462",
    "name": "Mommy 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Mommy 采用独特的灰玫瑰色，凸显妆容的精致与柔美。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "kremovye-rumyana-pusy-honey-25-gr-5-100362",
    "name": "Honey 奶油腮红",
    "category": "彩妆",
    "description": "PÚSY Honey 乳霜腮红为妆容增添清新与暖意，尤其适合暖调肤色。\n\n细腻质地易于涂抹在双颊，打造自然红润感，也可用于双唇和眼睑。持久配方全天保持清新妆效，不易结块或暗沉。\n\n小巧包装便于使用，让这款腮红成为快速打造清新妆容的实用单品。",
    "volume": null,
    "usage": "用手指、刷子或海绵涂抹腮红霜。分层涂抹产品以获得更鲜艳的色调。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Bloody Mary",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-blood-mary-25-gr-8-1-100361",
            "image": "/products/yandex/8ns5x7trfm24kjtvclj8l5z45nth6rkd-7da79bf88f.webp",
            "color": "#6B0729"
          },
          {
            "label": "Flower",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-flower-25-gr-9-100359",
            "image": "/products/yandex/n6jhlx2fltt847nbmdkmslk9657bdm9z-ec59ef7317.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "Honey",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-honey-25-gr-5-100362",
            "image": "/products/yandex/c2thzxtkmvhvkjxz9c2v675blbrskmn5-5b6a0f817d.webp",
            "color": "#F18D56"
          },
          {
            "label": "Pusyboy",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-pusyboy-25-gr-20-100360",
            "image": "/products/yandex/r6b4prrk2zv2g9z2f72c9stjhgn9x4hp-2896e9480e.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "kremovye-rumyana-pusy-flower-25-gr-9-100359",
    "name": "Flower 奶油腮红",
    "category": "彩妆",
    "description": "自然清新，一罐即可完成。\n\nPÚSY Flowers 乳霜腮红如同玫瑰花瓣轻触脸颊。细腻质地易于涂抹在双颊，打造自然红润感，也可用于双唇和眼睑。\n\n持久配方全天保持清新妆效，不易结块或暗沉。小巧包装便于使用，让这款腮红成为快速打造清新妆容的实用单品。",
    "volume": null,
    "usage": "用手指、刷子或海绵涂抹腮红霜。分层涂抹产品以获得更鲜艳的色调。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Bloody Mary",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-blood-mary-25-gr-8-1-100361",
            "image": "/products/yandex/8ns5x7trfm24kjtvclj8l5z45nth6rkd-7da79bf88f.webp",
            "color": "#6B0729"
          },
          {
            "label": "Flower",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-flower-25-gr-9-100359",
            "image": "/products/yandex/n6jhlx2fltt847nbmdkmslk9657bdm9z-ec59ef7317.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "Honey",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-honey-25-gr-5-100362",
            "image": "/products/yandex/c2thzxtkmvhvkjxz9c2v675blbrskmn5-5b6a0f817d.webp",
            "color": "#F18D56"
          },
          {
            "label": "Pusyboy",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-pusyboy-25-gr-20-100360",
            "image": "/products/yandex/r6b4prrk2zv2g9z2f72c9stjhgn9x4hp-2896e9480e.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "klassicheskaya-tush-dlya-resnic-pusy-light-brown-10-ml-100363",
    "name": "浅棕色睫毛膏",
    "category": "彩妆",
    "description": "PÚSY Choco Mascara White Mocha 是一款为浅发色人群设计的浅棕色睫毛膏。\n\n它不仅以纤长、根根分明的睫毛突出眼神，也在日间给予睫毛护理。方便的刷头可细致包裹并拉长每根睫毛，刷头形状帮助打造轻微卷翘效果。\n\n小烛树蜡帮助锁住睫毛水分，乳木果油和蜂蜜为睫毛补充滋润。膏体耐潮，不易印染、留痕或掉屑。\n\n适合浅发色人群，也适合希望自然强调睫毛的人。",
    "volume": null,
    "usage": "涂于洁净、干燥的睫毛，从根部向梢部刷涂。将睫毛膏均匀包裹每根睫毛，打造纤长丰盈妆效。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "浅棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-light-brown-10-ml-100363",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#C2C2C2"
          },
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-dark-brown-10-ml-100364",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#4B3323"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-black-10-ml-100365",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#000000"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
    "name": "Chocolate 巧克力色唇油",
    "category": "彩妆",
    "description": "有高级感的色泽，加上令双唇更显精致的护理质地。PÚSY Chocolate 唇油衬托自然唇色，增加色彩深度与亮泽妆效。这款裸色让整体妆容更完整、更有吸引力。\n\n唇油配方帮助柔润、平滑双唇，并在视觉上增加丰盈感；方便的涂抹头只需几下即可均匀、利落上妆。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-magic-flower-100469",
    "name": "Magic Flower 闪耀眼影",
    "category": "彩妆",
    "description": "闪亮双眸 PÚSY Magic Flower 是一朵迷人的暖粉色花朵，绽放紫金色光芒。\n\nPÚSY Magic Flower 的魔力在于其完美的配方：丰富的粉红色基底充当粘合剂，中等大小的闪光提供最大的反射表面。\n\n其结果是一种神奇的闪光效果，从粉色、蓝色到金色闪闪发光，就像温暖的粉色底色发出的火花一样闪烁。光泽并非来自于皮肤，而是来自于皮肤的深处。柔软的质地让您可以轻松均匀地涂抹产品，不会出现不均匀或脱落的情况。持久配方让您从第一次涂抹到最后一支舞都焕发光彩。",
    "volume": null,
    "usage": "用手指、刷子或涂抹器将眼影涂抹在眼睑上。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Dangerous",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-dangerous-100467",
            "image": "/products/yandex/ss5fmcr4r7dknx4xlfmvq5kzvs5cx8cw-bb7f8b8afb.webp",
            "color": "#F18D56"
          },
          {
            "label": "Magic Flower",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-magic-flower-100469",
            "image": "/products/yandex/9sfw68tl8hv525562q89plzqbqdfv7hw-4d660a3cc7.webp",
            "color": "#E86B90"
          },
          {
            "label": "Sand",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466",
            "image": "/products/yandex/zjn8fdvmvdk8ls795pgph7fpd5v6q5pz-06f63ecad3.webp",
            "color": "#D5A010"
          }
        ]
      }
    ]
  },
  {
    "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466",
    "name": "Sand 闪耀眼影",
    "category": "彩妆",
    "description": "让眼睛闪闪发光 PÚSY Sand 不仅仅是金色的闪光，而是温暖的光芒的集中，在日落时将眼睑变成闪亮的沙漠天鹅绒。\n\nPÚSY Sand 的魔力在于其完美的配方：轻盈、半透明的缎面基底可作为隐形粘合剂，不会给眼睑皮肤带来负担，而中等大小的金色亮片可提供最大程度的反光表面。\n\n其结果是一种温暖的、几乎“热”的光芒的错觉，没有粗俗的黄色色调。光泽并非来自于皮肤，而是来自于皮肤的深处。柔软的质地让您可以轻松均匀地涂抹产品，不会出现不均匀或脱落的情况。持久配方让您从第一次涂抹到最后一支舞都焕发光彩。",
    "volume": null,
    "usage": "用手指、刷子或涂抹器将眼影涂抹在眼睑上。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Dangerous",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-dangerous-100467",
            "image": "/products/yandex/ss5fmcr4r7dknx4xlfmvq5kzvs5cx8cw-bb7f8b8afb.webp",
            "color": "#F18D56"
          },
          {
            "label": "Magic Flower",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-magic-flower-100469",
            "image": "/products/yandex/9sfw68tl8hv525562q89plzqbqdfv7hw-4d660a3cc7.webp",
            "color": "#E86B90"
          },
          {
            "label": "Sand",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466",
            "image": "/products/yandex/zjn8fdvmvdk8ls795pgph7fpd5v6q5pz-06f63ecad3.webp",
            "color": "#D5A010"
          }
        ]
      }
    ]
  },
  {
    "slug": "klassicheskaya-tush-dlya-resnic-pusy-dark-brown-10-ml-100364",
    "name": "深棕色睫毛膏",
    "category": "彩妆",
    "description": "PÚSY Choco Mascara Milk Chocolate 呈现如牛奶巧克力中牛奶与可可比例般恰到好处的棕色。\n\n它不仅以纤长、根根分明的睫毛突出眼神，也在日间给予睫毛护理。方便的刷头可细致包裹并拉长每根睫毛，刷头形状帮助打造自然卷翘效果。\n\n小烛树蜡帮助锁住睫毛水分，乳木果油和蜂蜜为睫毛补充滋润。膏体耐潮，不易印染、留痕或掉屑。\n\n适合浅棕发色人群，也适合希望自然强调睫毛的人。",
    "volume": null,
    "usage": "涂于洁净、干燥的睫毛，从根部向梢部刷涂。将睫毛膏均匀包裹每根睫毛，打造纤长丰盈妆效。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "浅棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-light-brown-10-ml-100363",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#C2C2C2"
          },
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-dark-brown-10-ml-100364",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#4B3323"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "klassicheskaya-tush-dlya-resnic-pusy-black-10-ml-100365",
            "image": "/products/yandex/szqwmx97nvbj9flfwmqgzlpqxpz4g457-38ef2acac8.webp",
            "color": "#000000"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-gub-pusy-paradise-100459",
    "name": "Paradise 唇线笔",
    "category": "彩妆",
    "description": "打造时髦、持久唇妆组合的理想唇线笔。\n\nPÚSY Lip Liner Paradise 是一款层次丰富、略偏冷调却不过分的米色裸色，可凸显你的个性。轻柔描画并晕开边缘，可塑造唇部轮廓；也可勾勒清晰线条，打造更鲜明妆效。持久配方可维持全天，即使进食或饮用后也不易结块、晕染。柔滑质地形成天鹅绒般轻盈的覆盖，全天使用舒适。\n\nPÚSY LIP LINER 是想轻松快速凸显唇部美感人群的理想选择，让你每天都能享受利落精致的妆容。",
    "volume": null,
    "usage": "用唇线笔沿唇部轮廓描画，勾勒出所需唇形。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "裸米色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-paradise-100459",
            "image": "/products/yandex/67q2sh7v7cfxfxt9h67s5pv2mf95xpb7-1a2b8c5b00.webp",
            "color": "#DECDB6"
          },
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-cream-100460",
            "image": "/products/yandex/28mx6zjs756m2shk49bb8m2qwwlnwg9q-c1bba33ade.webp",
            "color": "#744E35"
          },
          {
            "label": "柔粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-morning-100461",
            "image": "/products/yandex/fzhz4fvt8qh8gc2z6rphcq25h4p5hhnd-007e457636.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-mommy-100462",
            "image": "/products/yandex/7g2h62j6jt8dr8k76snbd6wntx4klgvk-08632b3a79.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "梅子色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-passion-100463",
            "image": "/products/yandex/gdxfcgxx62nb2lx5j52c9rgvbkhvxnmf-fa4b947eea.webp",
            "color": "#6B0729"
          },
          {
            "label": "冷调粉色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-gub-pusy-strawberry-100464",
            "image": "/products/yandex/cgc5lrm25r8xhvbc9mfhp8mkwds9p68k-2d69895734.webp",
            "color": "#F28FBE"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
    "name": "Crystal 透明唇油",
    "category": "彩妆",
    "description": "透明色调可增强双唇的自然美感，质感每日呵护双唇。\n\nPÚSY 水晶唇油可打造光泽妆效，在视觉上使双唇更光滑、更整洁。这是最通用的选择，适合任何妆容 - 从简约到晚装。油配方可温和软化双唇，帮助应对干燥并带来舒适感。\n\n轻盈的质地增添光泽和丰盈感，方便的涂抹器让您只需轻轻涂抹几下即可涂抹产品 - 即使没有镜子。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-dangerous-100467",
    "name": "Dangerous 闪耀眼影",
    "category": "彩妆",
    "description": "PÚSY Dangerous 闪耀眼影，不只是一种色彩，更是一份“成为全场焦点”的宣言。\n\nPÚSY Dangerous 的魅力来自精心调配的配方：珊瑚色缎光基底承托中等颗粒的金色闪片，带来充分的反光效果。\n\n最终呈现炽热明亮的铜色调，流转金色火花，让双眸如被点燃。光泽并非浮在肌肤表面，而是仿佛从肌肤深处透出。柔软质地易于均匀铺开，不易斑驳或飞粉；持久配方让光彩从上妆一直延续到舞会落幕。",
    "volume": null,
    "usage": "用手指、刷子或涂抹器将眼影涂抹在眼睑上。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Dangerous",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-dangerous-100467",
            "image": "/products/yandex/ss5fmcr4r7dknx4xlfmvq5kzvs5cx8cw-bb7f8b8afb.webp",
            "color": "#F18D56"
          },
          {
            "label": "Magic Flower",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-magic-flower-100469",
            "image": "/products/yandex/9sfw68tl8hv525562q89plzqbqdfv7hw-4d660a3cc7.webp",
            "color": "#E86B90"
          },
          {
            "label": "Sand",
            "sku": "",
            "price": 0,
            "slug": "mercayshchie-teni-sparkly-dlya-vek-pusy-sand-100466",
            "image": "/products/yandex/zjn8fdvmvdk8ls795pgph7fpd5v6q5pz-06f63ecad3.webp",
            "color": "#D5A010"
          }
        ]
      }
    ]
  },
  {
    "slug": "maslo-dlya-gub-apricot-1-100778",
    "name": "Apricot 杏桃色唇油",
    "category": "彩妆",
    "description": "鲜活的杏桃色衬托双唇自然色泽，令妆容清新有活力。PÚSY Apricot 唇油形成亮泽涂层，使双唇更柔润，视觉上更饱满。\n\n配方温和护理唇部肌肤，帮助改善干燥，使双唇平滑、精致。轻盈质地带来光泽与舒适感；方便的涂抹头让你在一天中随时快速、均匀地涂抹唇油。",
    "volume": "4毫升",
    "usage": "使用涂抹头将唇油涂于双唇。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "杏桃色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-apricot-1-100778",
            "image": "/products/yandex/d54v4wxhrxtlng4fmzjhs85fncf725wf-7835a31972.webp",
            "color": "#F18D56"
          },
          {
            "label": "红色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-red-krasnyiy-100784",
            "image": "/products/yandex/jrf25gdq7gh2jwb4r6m5fvj8vp6kfxxf-ac90e1c7e7.webp",
            "color": "#AC2216"
          },
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
            "image": "/products/yandex/gdkw2bc9crrdgpfxwx96xlfj9g76g7fr-fbc7908d75.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-purple-rozovyiy-100781",
            "image": "/products/yandex/r6ccm6j86qsg4rmdgtmtj9pdnxfgk9tz-8537dd9687.webp",
            "color": "#E86B90"
          },
          {
            "label": "浅粉色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783",
            "image": "/products/yandex/xw4bhtgpx9k8wmjsl68xqq498fhtnmfj-5f248a533f.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "黑色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-black-chernyiy-100779",
            "image": "/products/yandex/nbr8v9tdxzmtq9nzrdtwsbtfgchs44zv-5dbda44f69.webp",
            "color": "#000000"
          },
          {
            "label": "巧克力色",
            "sku": "",
            "price": 0,
            "slug": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
            "image": "/products/yandex/d2nnc4c6tpxkznrbpl2d7n4tvlj2px6m-4ecb318ba9.webp",
            "color": "#4B3323"
          }
        ]
      }
    ]
  },
  {
    "slug": "kremovye-rumyana-pusy-blood-mary-25-gr-8-1-100361",
    "name": "Bloody Mary 奶油腮红",
    "category": "彩妆",
    "description": "PÚSY Bloody Mary 乳霜腮红轻轻一抹，即可呈现如寒冷天气后自然泛红的双颊妆效。\n\n细腻质地易于涂抹在双颊，打造自然红润感，也可用于双唇和眼睑。持久配方全天保持清新妆效，不易结块或暗沉。\n\n小巧包装便于使用，让这款腮红成为快速打造清新妆容的实用单品。",
    "volume": null,
    "usage": "用手指、刷子或海绵涂抹腮红霜。分层涂抹产品以获得更鲜艳的色调。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Bloody Mary",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-blood-mary-25-gr-8-1-100361",
            "image": "/products/yandex/8ns5x7trfm24kjtvclj8l5z45nth6rkd-7da79bf88f.webp",
            "color": "#6B0729"
          },
          {
            "label": "Flower",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-flower-25-gr-9-100359",
            "image": "/products/yandex/n6jhlx2fltt847nbmdkmslk9657bdm9z-ec59ef7317.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "Honey",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-honey-25-gr-5-100362",
            "image": "/products/yandex/c2thzxtkmvhvkjxz9c2v675blbrskmn5-5b6a0f817d.webp",
            "color": "#F18D56"
          },
          {
            "label": "Pusyboy",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-pusyboy-25-gr-20-100360",
            "image": "/products/yandex/r6b4prrk2zv2g9z2f72c9stjhgn9x4hp-2896e9480e.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693",
    "name": "Ice Baby 舒芙蕾高光",
    "category": "彩妆",
    "description": "这是一款空气感乳霜质地、闪耀度较高的高光。轻盈质地容易晕染，较大的闪光颗粒带来鲜明的多维闪耀效果。",
    "volume": null,
    "usage": "想要高密度闪耀效果，可用指腹涂抹高光舒芙蕾；想要柔和光泽，可用化妆刷涂抹。可用于任何需要提亮、增加闪耀感的位置。",
    "variants": []
  },
  {
    "slug": "jidkie-rumyana-dlya-lica-peachland-100768",
    "name": "Peachland 液体腮红",
    "category": "彩妆",
    "description": "这款腮红让面部看起来清新透亮，即使早晨不尽如人意，也能迅速提气色。\n\n轻盈的水感乳霜质地，只需用指腹、刷具或海绵轻轻几下即可晕开。上脸后自然融入肤色，仿佛肌肤原生红润。颜色可叠加：薄涂一层是适合日间的半透明红晕，再叠涂几次即可获得更浓郁的晚间妆效。\n\n一支即可用于面颊、颧骨、双唇和眼睑。柔软涂抹头每次取量适中，更省用量；小巧瓶身也方便随身放入包中。\n\n使用前摇匀，旋开带涂抹头的瓶盖，在双颊点上少量并晕开；想加深颜色时重复叠涂即可。",
    "volume": "5.5毫升",
    "usage": "使用前轻轻摇匀瓶身，用涂抹头点涂数下，再用海绵、化妆刷或指腹晕染开。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-toasty-korichnevyiy-100771",
            "image": "/products/yandex/sprfgp7774zsv8fbcgxhczqxwdh6p6qx-6bff06c23e.webp",
            "color": "#744E35"
          },
          {
            "label": "蜜桃色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-peachland-100768",
            "image": "/products/yandex/jslnm8thjtk6lfsq6jj6kjqx4qm8bm5x-98ebb15785.webp",
            "color": "#F18D56"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769",
            "image": "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-smoochies-rozovyiy-100770",
            "image": "/products/yandex/72v8z5rcn66594sh8ztglfk9g8s686bs-40ce5da6c0.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "kremovye-rumyana-pusy-pusyboy-25-gr-20-100360",
    "name": "Pusyboy 奶油腮红",
    "category": "彩妆",
    "description": "PÚSY Pusy Boy 乳霜腮红看似大胆，实际妆效十分细腻。显色度可自由调节，从自然冷调红晕到浓郁粉色，随当天心情叠加。\n\n细腻质地易于涂抹在双颊，打造自然红润感，也可用于双唇和眼睑。持久配方全天保持清新妆效，不易结块或暗沉。\n\n小巧包装便于使用，让这款腮红成为快速打造清新妆容的实用单品。",
    "volume": null,
    "usage": "用手指、刷子或海绵涂抹腮红霜。分层涂抹产品以获得更鲜艳的色调。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "Bloody Mary",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-blood-mary-25-gr-8-1-100361",
            "image": "/products/yandex/8ns5x7trfm24kjtvclj8l5z45nth6rkd-7da79bf88f.webp",
            "color": "#6B0729"
          },
          {
            "label": "Flower",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-flower-25-gr-9-100359",
            "image": "/products/yandex/n6jhlx2fltt847nbmdkmslk9657bdm9z-ec59ef7317.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "Honey",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-honey-25-gr-5-100362",
            "image": "/products/yandex/c2thzxtkmvhvkjxz9c2v675blbrskmn5-5b6a0f817d.webp",
            "color": "#F18D56"
          },
          {
            "label": "Pusyboy",
            "sku": "",
            "price": 0,
            "slug": "kremovye-rumyana-pusy-pusyboy-25-gr-20-100360",
            "image": "/products/yandex/r6b4prrk2zv2g9z2f72c9stjhgn9x4hp-2896e9480e.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769",
    "name": "Sleepy Morning 液体腮红（灰粉色）",
    "category": "彩妆",
    "description": "这款腮红让面部看起来清新透亮，即使早晨不尽如人意，也能迅速提气色。\n\n轻盈的水感乳霜质地，只需用指腹、刷具或海绵轻轻几下即可晕开。上脸后自然融入肤色，仿佛肌肤原生红润。颜色可叠加：薄涂一层是适合日间的半透明红晕，再叠涂几次即可获得更浓郁的晚间妆效。\n\n一支即可用于面颊、颧骨、双唇和眼睑。柔软涂抹头每次取量适中，更省用量；小巧瓶身也方便随身放入包中。\n\n使用前摇匀，旋开带涂抹头的瓶盖，在双颊点上少量并晕开；想加深颜色时重复叠涂即可。",
    "volume": "5.5毫升",
    "usage": "使用前轻轻摇匀瓶身，用涂抹头点涂数下，再用海绵、化妆刷或指腹晕染开。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-toasty-korichnevyiy-100771",
            "image": "/products/yandex/sprfgp7774zsv8fbcgxhczqxwdh6p6qx-6bff06c23e.webp",
            "color": "#744E35"
          },
          {
            "label": "蜜桃色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-peachland-100768",
            "image": "/products/yandex/jslnm8thjtk6lfsq6jj6kjqx4qm8bm5x-98ebb15785.webp",
            "color": "#F18D56"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769",
            "image": "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-smoochies-rozovyiy-100770",
            "image": "/products/yandex/72v8z5rcn66594sh8ztglfk9g8s686bs-40ce5da6c0.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "jidkie-rumyana-dlya-lica-smoochies-rozovyiy-100770",
    "name": "Smoochies 液体腮红（粉色）",
    "category": "彩妆",
    "description": "这款腮红让面部看起来清新透亮，即使早晨不尽如人意，也能迅速提气色。\n\n轻盈的水感乳霜质地，只需用指腹、刷具或海绵轻轻几下即可晕开。上脸后自然融入肤色，仿佛肌肤原生红润。颜色可叠加：薄涂一层是适合日间的半透明红晕，再叠涂几次即可获得更浓郁的晚间妆效。\n\n一支即可用于面颊、颧骨、双唇和眼睑。柔软涂抹头每次取量适中，更省用量；小巧瓶身也方便随身放入包中。\n\n使用前摇匀，旋开带涂抹头的瓶盖，在双颊点上少量并晕开；想加深颜色时重复叠涂即可。",
    "volume": "5.5毫升",
    "usage": "使用前轻轻摇匀瓶身，用涂抹头点涂数下，再用海绵、化妆刷或指腹晕染开。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-toasty-korichnevyiy-100771",
            "image": "/products/yandex/sprfgp7774zsv8fbcgxhczqxwdh6p6qx-6bff06c23e.webp",
            "color": "#744E35"
          },
          {
            "label": "蜜桃色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-peachland-100768",
            "image": "/products/yandex/jslnm8thjtk6lfsq6jj6kjqx4qm8bm5x-98ebb15785.webp",
            "color": "#F18D56"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769",
            "image": "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-smoochies-rozovyiy-100770",
            "image": "/products/yandex/72v8z5rcn66594sh8ztglfk9g8s686bs-40ce5da6c0.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "jidkie-rumyana-dlya-lica-toasty-korichnevyiy-100771",
    "name": "Toasty 液体腮红（棕色）",
    "category": "彩妆",
    "description": "这款腮红让面部看起来清新透亮，即使早晨不尽如人意，也能迅速提气色。\n\n轻盈的水感乳霜质地，只需用指腹、刷具或海绵轻轻几下即可晕开。上脸后自然融入肤色，仿佛肌肤原生红润。颜色可叠加：薄涂一层是适合日间的半透明红晕，再叠涂几次即可获得更浓郁的晚间妆效。\n\n一支即可用于面颊、颧骨、双唇和眼睑。柔软涂抹头每次取量适中，更省用量；小巧瓶身也方便随身放入包中。\n\n使用前摇匀，旋开带涂抹头的瓶盖，在双颊点上少量并晕开；想加深颜色时重复叠涂即可。",
    "volume": "5.5毫升",
    "usage": "使用前轻轻摇匀瓶身，用涂抹头点涂数下，再用海绵、化妆刷或指腹晕染开。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "棕色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-toasty-korichnevyiy-100771",
            "image": "/products/yandex/sprfgp7774zsv8fbcgxhczqxwdh6p6qx-6bff06c23e.webp",
            "color": "#744E35"
          },
          {
            "label": "蜜桃色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-peachland-100768",
            "image": "/products/yandex/jslnm8thjtk6lfsq6jj6kjqx4qm8bm5x-98ebb15785.webp",
            "color": "#F18D56"
          },
          {
            "label": "灰粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-sleepy-morning-pylnaya-roza-100769",
            "image": "/products/yandex/qlxn5wcdxg5xcp449hk6qljphc5h5txp-8c02c14270.webp",
            "color": "#EFA2B9"
          },
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "jidkie-rumyana-dlya-lica-smoochies-rozovyiy-100770",
            "image": "/products/yandex/72v8z5rcn66594sh8ztglfk9g8s686bs-40ce5da6c0.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "uvlajnyayshchiiy-mist-dlya-lica-pusy-moisturizing-face-mist-pusy-100-ml-100201",
    "name": "保湿面部喷雾",
    "category": "护肤",
    "description": "只需轻轻一喷，感受肌肤重新焕发活力与光泽。PÚSY 面部喷雾，是即刻清新与深层补水的小秘诀。\n\n透明质酸深入肌肤，由内而外带来弹润与清新感；神经酰胺形成无形屏障，帮助牢牢锁住水分，并保护肌肤免受城市环境压力及其他不利环境因素影响。\n\n黄瓜水与椰子水的组合帮助清新、调理肌肤，恢复令人向往的自然光泽。\n\n小巧便携，可轻松放入手袋。即使在妆容之上也可使用，随时迅速补水并带来清新感。早晨用来唤醒肌肤，办公室里用来提振状态，运动后用来清新……想喷就喷！轻轻一喷，就能感受肌肤焕发活力。",
    "volume": "100毫升",
    "usage": "距面部15—20厘米处喷洒适量产品，静待完全吸收。可在一天中按需使用。",
    "variants": []
  },
  {
    "slug": "gialuronovyiy-krem-dlya-lica-pusy-pusy-hyaluronic-face-cream-50-ml-8-100496",
    "name": "玻尿酸面霜",
    "category": "护肤",
    "description": "PÚSY 透明质酸面霜不只是化妆包里的一瓶面霜，更是日常护肤的基础。\n\n它为后续妆容和肌肤光泽打好底。透明质酸为肌肤补充水分，提升弹润感，令肌肤焕发光泽。\n\n可可脂、乳木果油和荷荷巴油的奢华组合带来如 SPA 般的滋养，帮助深度柔润肌肤，赋予柔软细腻、舒适的肤感。适合需要加强保湿的干性肌肤，也适合希望提升光泽和精致度的中性肌肤。",
    "volume": "100毫升",
    "usage": "将面霜涂抹在干净干燥的脸上，并轻轻按摩。早上和/或晚上使用。",
    "variants": []
  },
  {
    "slug": "rebrending-micellyarnaya-voda-pusy-300-ml-100192",
    "name": "胶束卸妆水",
    "category": "护肤",
    "description": "PÚSY Micellar Water 胶束卸妆水可温和快速地卸除彩妆，不留黏腻薄膜，也不会令肌肤干燥，让肌肤呈现舒缓、休息后的状态。\n\n黄瓜、迷迭香、椴树和薄荷复合成分共同调理、保湿并舒缓肌肤，留下清新感。泛醇深度保湿并帮助缓解刺激，仿佛为肌肤包裹一层保护云。金松水提取物帮助调节肌肤平衡、收敛毛孔、改善气色，带来如呼吸新鲜空气般的清爽感。\n\n配方不含刺激性成分，适合各种肤质。把日常护肤变成简单愉悦的护理仪式，每天维持肌肤的洁净与美丽。",
    "volume": "300毫升",
    "usage": "将化妆棉用胶束水浸湿，敷在皮肤上10-30秒，然后轻轻擦拭面部和颈部皮肤，去除彩妆和杂质。使用后，用温水或皮肤清洁剂冲洗。适合日常使用。",
    "variants": []
  },
  {
    "slug": "rebrending-penka-dlya-umyvaniya-pusy150ml-100227",
    "name": "洁面泡沫",
    "category": "护肤",
    "description": "Gentle Face Foam 洁面泡沫可为日常护理提供温和而有效的清洁。它轻柔清洁面部和颈部肌肤，去除污垢与多余皮脂，洗后留下清新、舒适的感受。\n\n含发酵燕麦、海带和温和表面活性剂的配方有助于深入清洁毛孔、减轻炎症，并维持肌肤适宜的水润状态。适合问题肌肤，清洁后不会令肌肤过度干燥，也不破坏天然保护屏障。\n\n内置硅胶刷头可进行轻柔按摩与温和去角质，增强清洁效果并让护理过程更舒适。适合每天早晚使用。",
    "volume": "150毫升",
    "usage": "将所需量的产品涂抹在硅胶刷上，并按摩整个面部表面。用温水冲洗。适合日常使用。",
    "variants": []
  },
  {
    "slug": "rebrending-piling-skatka-pusy100ml-100193",
    "name": "面部温和去角质凝胶",
    "category": "护肤",
    "description": "PÚSY 搓泥型去角质凝胶，专为喜欢轻松、愉悦护理肌肤的人设计。\n\n只需轻柔触碰和打圈按摩，便能温和带走老废角质，让肌肤轻松焕新，不造成微小损伤、泛红或负担。没有粗糙磨砂颗粒，只有温和的肤感变化。使用后，肌肤纹理更加平滑，粗糙不均得到改善，肤色也显得清新均匀。去角质后的肌肤光滑洁净，为后续护理做好准备，让精华和面霜更易吸收并充分发挥作用。\n\nPÚSY 搓泥型去角质凝胶，适合想给肌肤多一点细致呵护的时候。",
    "volume": "100毫升",
    "usage": "将产品涂抹在洁净、干燥的皮肤上并停留 1-2 分钟。以打圈方式按摩，不要拉伸皮肤，避开眼睛周围区域。用水彻底冲洗。建议每周使用该产品不超过1-2次。",
    "variants": []
  },
  {
    "slug": "rebrending-gialuronovaya-emulsiya-dlya-lica-pusy50ml-100191",
    "name": "面部玻尿酸乳液",
    "category": "护肤",
    "description": "PÚSY Hyaluronic Emulsion 透明质酸面部乳液，不只是护肤中的一个步骤，更是让肌肤看起来休息充分、细致，并由内而外焕发光泽的私藏秘诀。\n\n富含透明质酸、蜗牛黏蛋白、维生素B3和神经酰胺的配方，帮助密集补水、修护脂质屏障，并改善肌肤纹理与肤色不均。轻盈丝滑的质地在肌肤上融化，不留黏腻感或油光。肌肤因此更加平滑细致，适合后续上妆，使粉底更均匀服帖、不易搓泥，妆效也更持久。\n\n可在面霜前使用以加强保湿，也可用于妆前准备。",
    "volume": "50毫升",
    "usage": "将少量乳液均匀涂抹在之前清洁且干燥的面部和颈部皮肤上。静置直至完全干燥。对于油性和混合性皮肤来说，它完全满足了基本的日常补水需求。对于干燥缺水的肌肤，可作为保湿的第一步使用。不需要冲洗。",
    "variants": []
  },
  {
    "slug": "gidrofilnoe-maslo-dlya-lica-pusy-110-ml-100733",
    "name": "面部卸妆油",
    "category": "护肤",
    "description": "该油提供温和而有效的清洁作用，溶解彩妆、防晒霜和皮脂，而不会堵塞毛孔。该产品含有轻质油复合物，可温和呵护肌肤，防止出现干燥感。",
    "volume": "110毫升",
    "usage": "将所需量涂抹在干燥的皮肤上并按摩。加水继续乳化直至彩妆完全卸除，然后用温水彻底冲洗干净。为了完成清洁，建议使用凝胶或泡沫清洁剂。不建议在眼睛周围区域使用该产品。",
    "variants": []
  },
  {
    "slug": "gel-massajer-pusy-refresh-face-gel-75-ml-26-100375",
    "name": "Refresh 面部滚珠按摩凝胶",
    "category": "护肤",
    "description": "这款产品专为早晨脸部显得没精神时准备。PÚSY 按摩滚珠凝胶有助于快速缓解浮肿、焕活肌肤，使面部恢复休息充足般的状态，即使睡眠不足也适用。\n\n配方针对浮肿、疲态和暗沉肤色。咖啡因与植物提取物有助于减轻浮肿、提升肌肤活力，按摩滚珠可均匀涂布产品并增强按摩引流效果。滚动几下后，面部轮廓看起来更清晰，肌肤更显清新透亮。\n\n质地滋润却轻盈，易于推开并快速吸收，不留黏腻感，同时带来舒适清凉感。早晨可用于快速护理；晚上则可留在肌肤上过夜，以加强并延长护理效果。",
    "volume": "75毫升",
    "usage": "使用前，将滚珠部件旋转至听到咔嗒声。轻压包装，将少量凝胶挤在面部肌肤上，再用滚珠沿按摩线从面部中央向外侧滚动涂开。需要时可再次轻压包装补充凝胶。按摩结束后，用湿化妆棉擦去余量，或用温水洗净。",
    "variants": []
  },
  {
    "slug": "ochishchayshchiiy-gel-dlya-umyvaniya-pusy-purifying-facial-cleanser-pusy-110-ml-1-1-100481",
    "name": "净澈洁面啫喱",
    "category": "护肤",
    "description": "PÚSY 洁面凝胶是一款适合日常护理的温和洁面乳。它可以去除杂质和多余的皮脂，而不破坏皮肤的自然平衡，让您感觉清新干净。\n\n与水接触后，凝胶可轻松铺展在皮肤上并形成柔软的泡沫，提供温和有效的清洁效果，而不会过度干燥。\n\n含有泛醇和洋甘菊水的配方有助于保持洗后的舒适感，而海带提取物则可舒缓肌肤并保持其自然柔软和弹性。",
    "volume": "110毫升",
    "usage": "将少量凝胶涂抹在湿润的面部皮肤上，轻轻按摩，避开眼睛周围区域，然后用清水彻底冲洗。",
    "variants": []
  },
  {
    "slug": "kokosovaya-micellyarnaya-voda-pusy-100-ml-micellar-cocowater-pusy-100-ml-100171",
    "name": "椰子胶束卸妆水",
    "category": "护肤",
    "description": "PÚSY 椰子胶束卸妆水可温和清除彩妆与日常污垢。\n\n配方可细致卸除面部、眼部和唇部彩妆，不破坏肌肤自然平衡。以椰子水和温和胶束为基础，在清洁时带来清新感，不会令肌肤过度干燥。\n\n使用后肌肤洁净舒适，不紧绷、不黏腻，也不易感到刺激。适合包括敏感肌在内的各种肤质。",
    "volume": "100毫升",
    "usage": "将产品涂抹在化妆棉上，轻轻清洁脸部、眼睛和嘴唇的皮肤。用水冲洗",
    "variants": []
  },
  {
    "slug": "rebrending-utrenniiy-ohlajdayshchiiy-tonik-dlya-koji-lica-i-shei-pusy150ml-100232",
    "name": "晨间清凉爽肤水",
    "category": "护肤",
    "description": "PÚSY 晨间清凉爽肤水是一款具有清凉、清新效果的高效护理产品，帮助肌肤为活力满满的一天做好准备，带来清新、焕亮的状态。\n\n这款面部淋巴引流爽肤水兼具保湿作用，有助于改善浮肿。它带来提拉感，减轻肿胀和疲惫痕迹，改善肌肤状态，恢复健康气色。",
    "volume": "150毫升",
    "usage": null,
    "variants": []
  },
  {
    "slug": "gel-dlya-dusha-pusy-home-shower-body-gel-tobacco-pepper-vanilla-12-100495",
    "name": "沐浴露",
    "category": "身体护理",
    "description": "PÚSY Shower Body Gel 是一款香氛沐浴露，可温和清洁肌肤，每次使用后都留下细致柔润的肤感。它能轻柔去除污垢，不会令肌肤过度干燥，并带来清新、柔软的感受。\n\n含泛醇、梨果仙人掌提取物和西兰花汁的配方帮助肌肤保持舒适、光滑，甘油则有助于维持沐浴后的水润感。丰盈细腻的泡沫易于在肌肤上铺开，把普通淋浴变成放松的护理仪式。\n\nTobacco Pepper Vanilla 香气由深沉烟草、温暖香草与辛香胡椒交织而成，营造香氛护理体验。适合各种肤质及日常使用。PÚSY Shower Body Gel，让清洁也成为一种享受。",
    "volume": "230毫升",
    "usage": "取少量沐浴露涂于湿润肌肤或浴球（浴花）上，以按摩方式涂遍全身，再用清水冲洗。",
    "variants": []
  },
  {
    "slug": "pena-dlya-vanny-psy-bath-foam-200-ml-100187",
    "name": "泡泡浴液",
    "category": "家居",
    "description": "仿佛在浴室里触碰一朵云。Bath Foam 沐浴泡泡带来彻底放松的片刻。绵密泡沫充盈浴缸，散发柔和香气，并温和呵护肌肤。\n\n含泛醇和甘油的配方有助于预防干燥，使肌肤更显柔润丝滑。不含SLS和对羟基苯甲酸酯，也适合敏感肌肤。\n\n沉浸在芬芳的SPA沐浴仪式中，闭上双眼，让一整天的疲惫重新归零。",
    "volume": "200毫升",
    "usage": null,
    "variants": []
  },
  {
    "slug": "pusy-home-sol-dlya-vanny-bath-salt-400g-100160",
    "name": "浴盐",
    "category": "家居",
    "description": "PÚSY Bath Salt，让浴缸成为属于你的宁静与愉悦空间。海盐与粉红喜马拉雅盐的组合为水中注入天然矿物质，帮助身体放松，缓解漫长一天后的疲劳与紧张。\n\n浴盐温和软化肌肤，让你在泡澡时就感到轻松舒适。Tobacco Pepper Vanilla 香气以温暖舒适的气息包裹身体：烟草、香草与辛香胡椒交织出安宁、深度放松的氛围，把一次普通泡澡变成完整的SPA仪式。",
    "volume": "400克",
    "usage": "在浴缸中注入温水 (36–40°C)。添加 150-200 克盐，等待晶体完全溶解。洗澡15-25分钟，然后洗掉剩余的盐分。",
    "variants": []
  },
  {
    "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
    "name": "Super Fix 眉毛强力定型啫喱",
    "category": "眉妆",
    "description": "广受欢迎的 Brow Fix Gel 眉毛定型凝胶，是打造利落眉形的秘密。即使难以驾驭的眉毛，也能帮助梳理定型，并维持一整天。\n\n含维生素B5的配方不仅可靠定型，也能滋养并强韧眉毛，使其保持健康、细致的状态。适合日常使用，无论雨天、炎热天气还是运动时，都能帮助眉形保持整齐。\n\n凝胶逐根固定眉毛，不粘结、不留白屑。透明质地适配各种眉色，超细刷头能均匀梳理眉毛，打造如沙龙整理后的效果。",
    "volume": "5毫升",
    "usage": "用刷子在眉毛上涂抹少量凝胶，使眉毛呈现所需的形状。静置直至完全干燥。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
            "image": "/products/yandex/6g65dkrjdfgc7xgxsqngm8vnqtc8j2mt-94e286be02.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "低饱和浅绿色",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp",
            "color": "#C2C2C2"
          }
        ]
      },
      {
        "name": "定型时长",
        "options": [
          {
            "label": "最长12小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp"
          },
          {
            "label": "最长24小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/49rlqt9j59v6nwq7qp9pqzqhwjxwgvqb-f070da103e.webp",
            "color": "#EFE8DC"
          },
          {
            "label": "最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
            "image": "/products/yandex/4v2424shq9grftr2bq8lpsfgtbc2sqxg-2ea3a3f1ab.webp"
          },
          {
            "label": "超强定型，最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
            "image": "/products/yandex/lw5z929wzmc8h4bhxbffmltc7mgt52tw-b221cb5c3e.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
    "name": "粗硬眉毛强力定型啫喱",
    "category": "眉妆",
    "description": "专为浓密、粗硬和难以驾驭的眉毛打造。PÚSY Strong Fix Brow Gel 强力定型眉胶，会成为你的新宠。\n\n无需沙龙护理，即可打造最长 48 小时的仿沙龙眉形定型效果。使用舒适，不留白屑；便捷的双面刷头可让产品均匀覆盖，并细致梳理每一根眉毛。",
    "volume": "5毫升",
    "usage": null,
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
            "image": "/products/yandex/6g65dkrjdfgc7xgxsqngm8vnqtc8j2mt-94e286be02.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "低饱和浅绿色",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp",
            "color": "#C2C2C2"
          }
        ]
      },
      {
        "name": "定型时长",
        "options": [
          {
            "label": "最长12小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp"
          },
          {
            "label": "最长24小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/49rlqt9j59v6nwq7qp9pqzqhwjxwgvqb-f070da103e.webp",
            "color": "#EFE8DC"
          },
          {
            "label": "最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
            "image": "/products/yandex/4v2424shq9grftr2bq8lpsfgtbc2sqxg-2ea3a3f1ab.webp"
          },
          {
            "label": "超强定型，最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
            "image": "/products/yandex/lw5z929wzmc8h4bhxbffmltc7mgt52tw-b221cb5c3e.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "karandash-dlya-broveiy-s-refilom-medium-brown-100758",
    "name": "眉笔带笔芯 深棕色",
    "category": "眉妆",
    "description": "认识一下你的理想眉笔。\n\n0.8 毫米超细笔芯可画出仿真毛流般的细线，填补眉毛稀疏处，令眉形自然利落。新手也易上手：笔芯始终保持尖细，无需削笔；柔软眉刷可及时晕开笔触、梳理眉毛，呈现自然整洁的妆效。\n\nDark Brown 是浓郁的冷调棕色，适合深发色人群。\n\n配方持妆最长可达 24 小时，从早到晚保持眉形，无需反复补妆。\n\n笔芯用完后不必更换整支眉笔，只需换上替换芯即可。",
    "volume": null,
    "usage": "沿着毛发生长的方向短而轻地涂抹。填充稀疏区域并刷涂以获得自然效果。\n\n更换笔芯：逆时针拧下用过的笔芯。插入新的并稍微顺时针旋转将其固定。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-broveiy-s-refilom-medium-brown-100758",
            "image": "/products/yandex/95ckqhmb8bqmbw9n5vttg4r5rxnnv9fk-9928132662.webp",
            "color": "#4B3323"
          },
          {
            "label": "浅棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-broveiy-s-refilom-medium-brown-100758",
            "image": "/products/yandex/zdmppdhhf8p2bqd6vhbbmp7lwjw2zssg-fedc514fd2.webp",
            "color": "#A67148"
          },
          {
            "label": "中棕色",
            "sku": "",
            "price": 0,
            "slug": "karandash-dlya-broveiy-s-refilom-medium-brown-100758",
            "image": "/products/yandex/z6sfj9xnkcz2pl79qw22zbpdg6wqzhtf-40336f2a61.webp",
            "color": "#744E35"
          }
        ]
      }
    ]
  },
  {
    "slug": "refil-karandasha-dlya-broveiy-light-brown-100757",
    "name": "眉笔替换芯 深棕色",
    "category": "眉妆",
    "description": "一支笔身，可反复更换笔芯。替换芯同样采用 0.8 毫米超细笔芯，能逐根勾勒眉毛、填补稀疏部位，呈现自然利落的眉形。配方持妆最长可达 24 小时，笔芯用量节省，经久耐用。\n\nDark Brown 是浓郁的冷调深棕色，适合深色头发人群。\n\n旋下用完的笔芯，装入新笔芯，眉笔即可继续使用。",
    "volume": null,
    "usage": "沿眉毛生长方向，用短而轻的笔触描画，填补稀疏部位，再用眉刷梳理，使妆效更自然。\n\n更换笔芯：逆时针旋下用完的笔芯，装入新笔芯，再轻轻顺时针旋转固定。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "深棕色",
            "sku": "",
            "price": 0,
            "slug": "refil-karandasha-dlya-broveiy-light-brown-100757",
            "image": "/products/yandex/v7bzk2rzktlk5cpssvmnc5qwr8xcctxb-8b14f9226d.webp",
            "color": "#4B3323"
          },
          {
            "label": "浅棕色",
            "sku": "",
            "price": 0,
            "slug": "refil-karandasha-dlya-broveiy-light-brown-100757",
            "image": "/products/yandex/qjcxccmzvgrmzncbntkg79lfql9cfdgk-cb149c98c5.webp",
            "color": "#A67148"
          },
          {
            "label": "中棕色",
            "sku": "",
            "price": 0,
            "slug": "refil-karandasha-dlya-broveiy-light-brown-100757",
            "image": "/products/yandex/22qchggdnfnlqhkqhb6d4rl2v8hgdw94-e1587b22c4.webp",
            "color": "#744E35"
          }
        ]
      }
    ]
  },
  {
    "slug": "gel-dlya-ukladki-broveiy-pusy-brow-fix-professional-15ml-10-100535",
    "name": "眉毛定型凝胶",
    "category": "眉妆",
    "description": "专业定型与护理，一瓶兼得。Brow Fix Gel PRO 眉毛定型凝胶专为专业人士打造，也适合日常使用。透明配方含维生素 B5，帮助强韧眉毛、促进生长，并提供可靠定型而不粘结眉毛。\n\n轻盈质地在肌肤上自然不显痕迹，可呈现仿沙龙眉毛定型效果，最长维持 48 小时。15 毫升大容量罐装搭配细小斜角刷，即使较难梳理的眉毛也能精准定型，突出自然弧度与眉形。\n\nBrow Fix Gel PRO 集大容量、护理与专业妆效于一体，随时都能使用。",
    "volume": "15毫升",
    "usage": "在眉毛上涂抹少量凝胶，赋予眉毛所需的形状。静置直至完全干燥。用水或专用卸妆液冲洗。适合日常使用",
    "variants": []
  },
  {
    "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
    "name": "修护型眉毛定型啫喱",
    "category": "眉妆",
    "description": "一次涂抹，同时实现密集护理与自然定型。PÚSY Healthy Fix Brow Gel 可轻柔、细致地固定眉毛，保留自然妆效，同时作为完整的眉毛护理产品发挥作用。\n\n含生物素和肽的配方帮助强韧眉毛、修护受损眉毛并维持健康状态。锯棕榈、茶树和鼠尾草提取物帮助滋养保湿、减轻炎症，并为更强韧、更浓密的眉毛生长营造舒适条件。\n\n适合日常使用，不留白屑，全天保持眉毛整洁有型。",
    "volume": "5毫升",
    "usage": "用刷子在眉毛上涂抹少量凝胶，使眉毛呈现所需的形状。静置直至完全干燥。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/6g65dkrjdfgc7xgxsqngm8vnqtc8j2mt-94e286be02.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "低饱和浅绿色",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp",
            "color": "#C2C2C2"
          }
        ]
      },
      {
        "name": "定型时长",
        "options": [
          {
            "label": "最长12小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp"
          },
          {
            "label": "最长24小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/49rlqt9j59v6nwq7qp9pqzqhwjxwgvqb-f070da103e.webp",
            "color": "#EFE8DC"
          },
          {
            "label": "最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
            "image": "/products/yandex/4v2424shq9grftr2bq8lpsfgtbc2sqxg-2ea3a3f1ab.webp"
          },
          {
            "label": "超强定型，最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
            "image": "/products/yandex/lw5z929wzmc8h4bhxbffmltc7mgt52tw-b221cb5c3e.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "fiksiruyshchiiy-gel-dlya-broveiy-pusy-lamination-5-ml-5-1-100619",
    "name": "Lamination 眉毛定型啫喱",
    "category": "眉妆",
    "description": "Lamination 眉毛定型凝胶，以适合日常使用的便捷形式呈现仿沙龙眉毛定型效果。一次梳理定型，之后无需反复整理。\n\n凝胶贴合眉毛并固定毛流方向，帮助塑造清晰眉形，无需到店护理也能保持利落妆效。\n\n超强定型最长可达 48 小时，适合长时间外出或活动安排。\n\n迷你刷头配有短而有弹性的刷毛，可精准控制眉毛走向，从自然眉形到更利落的线条感均可轻松打造。配方快速成膜，不粘结眉毛，也不留白屑。\n\n适合各种眉型，定型后自然不显痕迹，日间无需反复调整。",
    "volume": "5毫升",
    "usage": "用刷子在眉毛上涂抹少量凝胶，使眉毛呈现所需的形状。静置直至完全干燥。适合日常使用。",
    "variants": []
  },
  {
    "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
    "name": "透明眉毛定型啫喱",
    "category": "眉妆",
    "description": "广受欢迎的 Brow Fix Gel 眉毛定型凝胶，是打造利落眉形的秘密。即使难以驾驭的眉毛，也能帮助梳理定型，并维持一整天。\n\n含维生素B5的配方不仅可靠定型，也能滋养并强韧眉毛，使其保持健康、细致的状态。适合日常使用，无论雨天、炎热天气还是运动时，都能帮助眉形保持整齐。\n\n凝胶逐根固定眉毛，不粘结、不留白屑。透明质地适配各种眉色，超细刷头能均匀梳理眉毛，打造如沙龙整理后的效果。",
    "volume": "5毫升",
    "usage": "在眉毛上涂抹少量凝胶，赋予眉毛所需的形状。静置直至完全干燥。用水或专用卸妆液冲洗。适合日常使用。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "透明",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/6g65dkrjdfgc7xgxsqngm8vnqtc8j2mt-94e286be02.webp",
            "color": "#FFFFFF"
          },
          {
            "label": "低饱和浅绿色",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp",
            "color": "#C2C2C2"
          }
        ]
      },
      {
        "name": "定型时长",
        "options": [
          {
            "label": "最长12小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-vosstanavlivayshchiiy-gel-fiksator-dlya-broveiy-pusy-5-ml-13-100346",
            "image": "/products/yandex/klbbvm9l6k2xqxfrfw4cxjmc9lmczbtq-e13e5a569c.webp"
          },
          {
            "label": "最长24小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347",
            "image": "/products/yandex/49rlqt9j59v6nwq7qp9pqzqhwjxwgvqb-f070da103e.webp",
            "color": "#EFE8DC"
          },
          {
            "label": "最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-5-ml-10-100344",
            "image": "/products/yandex/4v2424shq9grftr2bq8lpsfgtbc2sqxg-2ea3a3f1ab.webp"
          },
          {
            "label": "超强定型，最长48小时",
            "sku": "",
            "price": 0,
            "slug": "rebrending-prozrachnyiy-gel-fiksator-dlya-jestkih-broveiy-pusy-5-ml-6-100345",
            "image": "/products/yandex/lw5z929wzmc8h4bhxbffmltc7mgt52tw-b221cb5c3e.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "prozrachnyiy-super-gel-fiksator-dlya-broveiy-super-fix-brow-gel-pusy-25-ml-13-100641",
    "name": "透明迷你强效眉毛定型啫喱",
    "category": "眉妆",
    "description": "为了让你能把喜爱的眉毛定型凝胶随身携带，超强定型眉胶现推出迷你规格：\n– 轻松装进任何手袋，随时取用；\n– 方便体验广受欢迎的 PÚSY 明星单品；\n– 品牌标识全新呈现，将风格与实用融于一瓶。\n\nPÚSY Brow Super Fix Gel 超强定型眉胶，是打造利落眉形的秘密。它能帮助梳理再难驾驭的眉毛，并让造型维持一整天，不黏腻、不紧绷，也不留白屑。\n\n含维生素B5的配方在可靠定型的同时呵护眉毛，帮助强韧眉毛并保持细致状态。适合日常使用，无论雨天、炎热天气还是运动时，都能帮助眉形保持整齐。",
    "volume": "2.5毫升",
    "usage": "用刷子在眉毛上涂抹少量凝胶，使眉毛呈现所需的形状。静置直至完全干燥。",
    "variants": []
  },
  {
    "slug": "mnogofunkcionalnaya-kist-pusy-touch-point-32-gr-100252",
    "name": "多功能刷",
    "category": "配件",
    "description": "PÚSY 多功能美妆刷，是处理膏霜类彩妆的全能助手：从粉底、遮瑕，到腮红、修容和高光均可使用。\n\n柔软而密实的刷毛可帮助产品均匀上妆，并实现自然、充分的晕染。\n\n一把刷具，解锁多种妆容。",
    "volume": null,
    "usage": "用刷具蘸取适量产品，以轻柔动作均匀涂抹于肌肤。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "灰粉色、白色",
            "sku": "",
            "price": 0,
            "slug": "mnogofunkcionalnaya-kist-pusy-touch-point-32-gr-100252",
            "image": "/products/yandex/bfnmkwxvt8m7b7tghd29s5rfjszjrfrm-5afbe510f9.webp",
            "color": "#C2C2C2"
          }
        ]
      }
    ]
  },
  {
    "slug": "kosmetichka-oblachko-pusy-100249",
    "name": "云朵化妆包",
    "category": "配件",
    "description": "给你的 PÚSY 瓶瓶罐罐一个云朵般的收纳空间！\n\n材质柔软、触感舒适，简约设计配合恰到好处的容量，适合收纳化妆品和配件。可靠的拉链便于使用，也能安心收纳。雪白表面易于清洁，用湿布轻轻擦拭即可。\n\n适合日常使用，也适合旅行携带。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "odnorazovye-netkanye-polotenca-dlya-lica-pusy-clean-girl-80sht-up-100224",
    "name": "一次性无纺布洗脸巾",
    "category": "配件",
    "description": "由无纺材料制成的一次性粘胶面巾提供细腻的皮肤护理。无绒质地可降低皮肤刺激的风险。\n\n毛巾由 100% 粘胶纤维制成，不含染料或颜料。",
    "volume": null,
    "usage": "用水或您最喜欢的清洁剂润湿毛巾，然后轻轻擦拭脸部。适合日常清洁面部杂质和去除淡妆，方便在家、水疗中心、旅行和健身房使用。不适合重复使用。",
    "variants": []
  },
  {
    "slug": "rebrending-uvlajnyayshchiiy-krem-dlya-ruk-pusy-tobacco-pepper-vanilla-13-100658",
    "name": "保湿护手霜",
    "category": "身体护理",
    "description": "便携规格，可轻松放入手袋、化妆包，也适合放在办公桌上，让手部护理始终触手可及。PÚSY 护手霜以轻盈舒适的质地，为双手提供密集滋养与保湿。\n\n它能迅速缓解干燥与紧绷，柔软肌肤，让双手恢复细致、健康有光泽的状态。玫瑰水、泛醇和乳木果油帮助修护肌肤，使其更平滑柔嫩；维生素E则帮助维持保护屏障，提升舒适感。\n\n乳霜易于涂开、迅速吸收，不留黏腻感或油膜，只留下柔软、细致的双手。",
    "volume": "30毫升",
    "usage": "将乳霜涂抹在清洁双手的皮肤上，并通过按摩动作使其均匀分布。",
    "variants": []
  },
  {
    "slug": "v-tube-gialuronovyiy-krem-gel-dlya-tela-pusy-hyaluronic-body-cream-gel-150-ml-100237",
    "name": "玻尿酸身体乳霜啫喱",
    "category": "身体护理",
    "description": "PÚSY Hyaluronic Body Cream-Gel 透明质酸身体乳霜啫喱，为重视舒适肤感的肌肤提供轻盈、愉悦的护理。丝滑质地易于在肌肤上涂开并迅速吸收，可快速缓解干燥与紧绷感，使肌肤柔软、光滑、细致，不留黏腻感或厚重感。\n\n透明质酸帮助肌肤维持适宜的水润状态，乳木果油、可可脂和西兰花油滋养肌肤并帮助提升弹性。维生素 E 帮助维持肌肤保护屏障，使肌肤在不同季节都呈现健康光泽。\n\n适合日常使用，可在沐浴后或白天肌肤需要舒适护理时涂抹。",
    "volume": "150毫升",
    "usage": "通过按摩动作将乳霜均匀涂抹到之前清洁过的湿或干身体皮肤上。留下直至完全吸收。供外用。不需要冲洗。",
    "variants": []
  },
  {
    "slug": "avtozagar-dlya-lica-pusy-magic-water-face-self-tanner-pusy-magic-water-100-ml-25-100566",
    "name": "Magic Water 面部免晒美黑喷雾",
    "category": "护肤",
    "description": "PÚSY Magic Water 面部免晒美黑喷雾，一瓶兼顾自然光泽与面部肌肤护理。新一代温和配方可呈现均匀、自然的美黑效果，不留斑驳，也不会令肌肤干燥，同时为肌肤补充水分。\n\n海带和积雪草天然提取物温和呵护肌肤，帮助提升弹润感；泛醇和透明质酸帮助肌肤保持健康、年轻的状态。\n\nMagic Water，轻轻一喷即可呈现美黑效果。",
    "volume": "100毫升",
    "usage": "为了获得均匀的晒黑效果，请在使用产品之前用轻微的去角质或磨砂膏彻底清洁皮肤。将美黑喷雾喷在清洁干燥的面部皮肤上，距离 20-30 厘米。请记住，自晒黑不是一种涂抹后可以立即洗掉的颜料，不要喷得太靠近皮肤。使用后，请勿触摸脸部或用水冲洗产品。等到完全干燥。涂抹后 2-6 小时，肤色将开始显现。为了保持效果，每周使用美黑剂 2-3 次。开始使用 2-3 次喷雾，然后选择最佳用量以达到所需的晒黑强度。",
    "variants": []
  },
  {
    "slug": "skrab-slaiym-dlya-tela-pusy-matcha-detox-100197",
    "name": "Matcha Detox 身体史莱姆磨砂膏",
    "category": "身体护理",
    "description": "PÚSY Matcha Detox 史莱姆身体磨砂膏二合一：把放松的触感体验与专业身体护理装进一个可爱的罐子里。\n\n磨砂膏温和去除老废角质，让肌肤呈现清新、健康光泽。令人愉悦的史莱姆触感让人忍不住想用手捏一捏，把单调的清洁过程变成一段冥想般的体验，帮助舒缓漫长一天后的紧张。抹茶如同肌肤的超级食物，帮助改善瑕疵，令肌肤更有活力、焕发健康光泽，如同做完SPA。大豆油和大麻籽油深度滋养并帮助修护肌肤，使其平滑有弹性。\n\nPÚSY Matcha Detox 史莱姆身体磨砂膏，是你的专属自爱仪式：给肌肤一场净澈护理，也给自己片刻愉悦。",
    "volume": "250克",
    "usage": "在湿润的皮肤上涂抹少量磨砂膏。用手指或专用刷子轻轻按摩身体几分钟，然后用温水冲洗。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "绿色",
            "sku": "",
            "price": 0,
            "slug": "skrab-slaiym-dlya-tela-pusy-matcha-detox-100197",
            "image": "/products/yandex/6vr54mg2cqbmd64vwdwjgkt5r285qsd2-cccda5c2ab.webp",
            "color": "#C2C2C2"
          }
        ]
      }
    ]
  },
  {
    "slug": "skrab-dlya-tela-pusy-body-shimmering-scrub-250gr-100195",
    "name": "闪亮身体磨砂膏",
    "category": "身体护理",
    "description": "PÚSY Body Shimmering Scrub 身体闪耀磨砂膏，让肌肤仿佛自带一层光泽滤镜。细腻质地在肌肤上融化，把清洁变成真正的美肤仪式。\n\n糖粒与创新的球形蓖麻油颗粒温和而有效地去除老废角质，展现肌肤的光滑柔软，不易造成损伤或刺激。乳木果油滋养肌肤，使其更显紧致、富有弹性；西兰花油则帮助抵御外部环境影响，维持细致状态。\n\n最后的点睛之笔，是让人忍不住反复进行这场护理仪式的闪耀微粒。它们为肌肤带来自然轻盈的光泽，仿佛刚度假归来，或刚完成一场SPA护理。",
    "volume": "250克",
    "usage": "轻轻地将磨砂膏涂在潮湿的身体皮肤上。用手指或特殊的刷子以打圈的方式按摩几分钟。用水冲洗。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "金色",
            "sku": "",
            "price": 0,
            "slug": "skrab-dlya-tela-pusy-body-shimmering-scrub-250gr-100195",
            "image": "/products/yandex/92ft77w2jldbdkznk9pzhktctwmvl9l5-16d4733cdb.webp",
            "color": "#D5A010"
          }
        ]
      }
    ]
  },
  {
    "slug": "mercayshchiiy-spreiy-dlya-tela-pusy-shine-100ml-100250",
    "name": "闪亮身体喷雾",
    "category": "身体护理",
    "description": "闪耀亮片身体喷雾是一款多效身体喷雾，不仅能为肌肤带来惊艳且持久的闪耀光泽，也能同时呵护肌肤。喷后不留油腻或黏腻感，能迅速干燥，肤感轻盈，并且不易沾染衣物。\n\n配方含维生素B5，有助改善肌肤外观并支持肌肤修护；其中的玫瑰水有助提升肌肤弹润感，缓解干燥与脱屑，使肌肤柔软、光滑、细腻如丝绒。瓶身配有便捷喷头，适合各种肤质。",
    "volume": "100毫升",
    "usage": "将喷雾从 20-30 厘米的距离均匀喷洒到之前清洁并干燥的皮肤上，等待完全吸收。",
    "variants": []
  },
  {
    "slug": "skrab-slaiym-dlya-tela-pusy-slime-scrub-250-g-100196",
    "name": "身体史莱姆磨砂膏",
    "category": "身体护理",
    "description": "PÚSY Slime Scrub 史莱姆身体磨砂膏，让身体护理成为享受，也让肌肤如丝般顺滑。黏弹的史莱姆质地令人忍不住想在手中轻揉；即使用量很少，也能轻松涂开全身，把清洁变成愉悦的护理仪式，同时更加省用量。\n\n糖质基底温和而有效地去除老废角质，展现肌肤自然光泽，不易造成损伤或刺激。甜杏仁油滋养肌肤，杏核油令肌肤柔软、丝滑且不黏腻；泛醇、角鲨烷和芦荟的组合则帮助修护肌肤，并长时间保持水润感。\n\nPÚSY Slime Scrub 是你专属的身体宠爱仪式：每一罐都带来平滑肌肤、自然光泽与愉悦体验。",
    "volume": "250克",
    "usage": "轻轻地将磨砂膏涂在潮湿的身体皮肤上。用手指或特殊的刷子以打圈的方式按摩几分钟。用水冲洗。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "粉色",
            "sku": "",
            "price": 0,
            "slug": "skrab-slaiym-dlya-tela-pusy-slime-scrub-250-g-100196",
            "image": "/products/yandex/p85thgvvlk556q8s4fmsv4c5dkpdgkff-4da9c12a17.webp",
            "color": "#E86B90"
          }
        ]
      }
    ]
  },
  {
    "slug": "skrab-slaiym-dlya-tela-pusy-tropic-enzymes-100198",
    "name": "Tropic Enzymes 身体史莱姆磨砂膏",
    "category": "身体护理",
    "description": "PÚSY Tropic Enzymes 史莱姆身体磨砂膏，为浴室带来一份令人向往的热带清新。\n\n准备体验焕新魔法，让每一秒护理都像在巴厘岛度假。令人愉悦的史莱姆触感，让人忍不住想用手捏一捏；它把单调的清洁变成一段冥想般的体验，帮助舒缓漫长一天后的紧张。\n\n温和酶成分细致而有效地去除老废角质，促进肌肤更新，使肌肤平滑、细腻如丝绒。椰子油和桃油组成的丰润复合物为肌肤补充水分，留下丝滑柔软的肤感；木瓜和芒果提取物为肌肤补充维生素，其中木瓜帮助保湿提亮，芒果帮助滋养修护。\n\nPÚSY Tropic Enzymes 史莱姆身体磨砂膏，是你的专属自爱仪式：给予肌肤悉心护理，也给你热带般的愉悦。",
    "volume": "250克",
    "usage": "在湿润的皮肤上涂抹少量磨砂膏。用手指或专用刷子轻轻按摩身体几分钟，然后用温水冲洗。",
    "variants": [
      {
        "name": "色号",
        "options": [
          {
            "label": "橙色",
            "sku": "",
            "price": 0,
            "slug": "skrab-slaiym-dlya-tela-pusy-tropic-enzymes-100198",
            "image": "/products/yandex/wz6zwqlh4ckm7wl5z6n5kj67qk748pfs-35796fdac8.webp",
            "color": "#E96425"
          }
        ]
      }
    ]
  },
  {
    "slug": "muss-avtozagar-dlya-tela-pusy-body-tan-mousse-body-tan-mousse-pusy-200-ml-4-100590",
    "name": "身体免晒美黑慕斯",
    "category": "身体护理",
    "description": "PÚSY 身体免晒美黑慕斯，一瓶兼顾均匀美黑与温和护理。\n\n轻盈蓬松的质地易于涂开并迅速吸收，为肌肤带来自然金色调，不留斑驳、条纹或黏腻感。\n\n含天然提取物的配方深度保湿并帮助修护肌肤。泛醇和透明质酸复合物帮助维持肌肤水分，并促进肌肤更新。芒果和木瓜提取物温和去除老废角质、带来清新感，使肌肤更加柔软、光滑。椴树花水和丝柏纯露帮助舒缓肌肤、减轻泛红，使肌肤呈现细致的哑光状态。",
    "volume": "200毫升",
    "usage": "为使显色均匀，使用前先用身体磨砂产品彻底清洁肌肤，再涂身体乳保湿。摇匀瓶身，将少量慕斯挤在上色手套上，以平缓的打圈方式从下向上均匀涂开，等待完全吸收。在产品完全干燥前避免接触水或衣物等织物表面。建议4—6小时后使用清洁产品洗去自晒黑慕斯。显色效果视肤质可维持5—10天；如需更深色泽，可重复操作。",
    "variants": []
  },
  {
    "slug": "uvlajnyayshchiiy-krem-dlya-ruk-pusy-ginger-verveine-100763",
    "name": "生姜马鞭草保湿护手霜",
    "category": "身体护理",
    "description": "柠檬雪葩爱上了姜饼，于是便有了 Ginger Verveine。\n\n前调先展开柠檬与马鞭草的清新气息，随后温暖的生姜浮现，尾调则变得柔和、甜美，并带有香草气息。\n\n轻盈质地数秒吸收，不会在手机屏幕、咖啡杯或键盘上留下油膜或痕迹。涂完护手霜，就能立即继续你的美好生活。\n\n注意：这款香气会让你寻找各种理由再次涂抹。0%评判，100%理解。",
    "volume": "30毫升",
    "usage": "将乳霜涂抹在清洁双手的皮肤上，并通过按摩动作使其均匀分布。",
    "variants": []
  },
  {
    "slug": "pitatelnaya-krem-maska-dlya-ruk-pusy-100188",
    "name": "滋养手膜霜",
    "category": "身体护理",
    "description": "PÚSY 手部霜膜采用融化般的质地，迅速缓解干燥与紧绷，让双手肌肤恢复柔软、舒适与细致状态。\n\n富含红没药醇以及乳木果油、椰子油和澳洲坚果油复合物，深度滋养并帮助修护肌肤，同时形成无形保护屏障。它有助于锁住肌肤水分、抵御外部环境影响，使用后即让双手更显光滑、滋润与柔韧。\n\n轻盈质地迅速吸收，不留膜感或油腻感。无论晚间集中护理还是白天随时使用都很舒适，尤其适合手部肌肤需要快速修护时。\n\n当双手急需呵护、又希望立即改善肤感时，PÚSY 手部霜膜就是你的SOS护理。",
    "volume": "50毫升",
    "usage": "取适量手部霜膜，涂于预先清洁并擦干的双手，均匀涂开，等待活性成分吸收。",
    "variants": []
  },
  {
    "slug": "sekretnyiy-boks-vsye-vklycheno-m-100729",
    "name": "“一应俱全”神秘礼盒",
    "category": "神秘礼盒",
    "description": "“全包式”不只属于精彩的度假酒店，也属于我们的秘密礼盒！\n\n礼盒中装有适合各种夏日时刻的彩妆与护理产品——从活力假期到露天派对，都能派上用场。\n\n里面有什么？最令人愉悦的惊喜当然不该提前剧透。但我们保证，没有一件产品是随意放进去的。这只礼盒属于那些准备尽情度假、漂亮出场，也不愿委屈自己的人。\n\nS号礼盒含4件正装明星单品，M号含6件，L号则有10件——这还是我们克制后的结果。\n\n唯一没有装进去的是大海，不过我们正在想办法。\n\n*图片所示产品仅供展示，可能与礼盒实际内容不同。",
    "volume": null,
    "usage": null,
    "variants": [
      {
        "name": "尺寸",
        "options": [
          {
            "label": "S",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-vsye-vklycheno-m-100729",
            "image": "/products/yandex/rbzmntwjfqwp8nw62lnpksdpnpt4jl9h-5b2d098a6a.webp"
          },
          {
            "label": "M",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-vsye-vklycheno-m-100729",
            "image": "/products/yandex/rbzmntwjfqwp8nw62lnpksdpnpt4jl9h-5b2d098a6a.webp"
          },
          {
            "label": "L",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-vsye-vklycheno-m-100729",
            "image": "/products/yandex/rbzmntwjfqwp8nw62lnpksdpnpt4jl9h-5b2d098a6a.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "sekretnyiy-boks-otpusk-dlya-sebya-s-100731",
    "name": "“给自己放个假”神秘礼盒",
    "category": "神秘礼盒",
    "description": "今天不打算工作，但一定要美美的！\n\n盒内装有 PÚSY 人气彩妆单品，适合各种夏日场景：从临时起意的约会，到让人忍不住立刻分享的照片。\n\n里面到底有什么？我们只能透露：这里集齐了旅行、约会或出门前最先放进化妆包的那些必备单品。\n\n按假期规模来选：S号含4件正装，M号含6件，L号则有整整10件人气彩妆。\n\n*图片所示产品仅供展示，可能与礼盒实际内容不同。",
    "volume": null,
    "usage": null,
    "variants": [
      {
        "name": "尺寸",
        "options": [
          {
            "label": "S",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-otpusk-dlya-sebya-s-100731",
            "image": "/products/yandex/cxcs2bgqbn2g4b97m659b6xtwknltkcm-bc6ea6d1eb.webp"
          },
          {
            "label": "M",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-otpusk-dlya-sebya-s-100731",
            "image": "/products/yandex/cxcs2bgqbn2g4b97m659b6xtwknltkcm-bc6ea6d1eb.webp"
          },
          {
            "label": "L",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-otpusk-dlya-sebya-s-100731",
            "image": "/products/yandex/cxcs2bgqbn2g4b97m659b6xtwknltkcm-bc6ea6d1eb.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "sekretnyiy-boks-siyaiy-bez-sprosa-3-100738",
    "name": "“尽情闪耀”神秘礼盒",
    "category": "神秘礼盒",
    "description": "这是一盒 PÚSY 正装护理明星单品，献给那些不需要特别理由也懂得享受生活的人。\n\n里面到底有什么？暂时保密。不过我们正式建议：让干燥、暗沉，以及总把自我护理推迟到以后的习惯，一起放个假。\n\nS号礼盒含4件正装护理产品，M号含6件，L号则有10罐。\n\n*图片所示产品仅供展示，可能与礼盒实际内容不同。",
    "volume": null,
    "usage": null,
    "variants": [
      {
        "name": "尺寸",
        "options": [
          {
            "label": "S",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-siyaiy-bez-sprosa-3-100738",
            "image": "/products/yandex/kxqpgnttjrjqqk9d6zmgfc59z7cjc9nv-e0763fd30e.webp"
          },
          {
            "label": "M",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-siyaiy-bez-sprosa-3-100738",
            "image": "/products/yandex/kxqpgnttjrjqqk9d6zmgfc59z7cjc9nv-e0763fd30e.webp"
          },
          {
            "label": "L",
            "sku": "",
            "price": 0,
            "slug": "sekretnyiy-boks-siyaiy-bez-sprosa-3-100738",
            "image": "/products/yandex/kxqpgnttjrjqqk9d6zmgfc59z7cjc9nv-e0763fd30e.webp"
          }
        ]
      }
    ]
  },
  {
    "slug": "hodovoiy-nabor-im-100688",
    "name": "“美丽随手可得”随行彩妆套装",
    "category": "套装",
    "description": "这是一套方便随身携带的全能彩妆组合，适合旅行、外宿，或直接放进包中，让你随时快速完成利落妆容。\n\n套装包含打造轻盈而有表现力妆容所需的一切：Brow Fix Gel 梳理并固定眉毛，Choco Mascara 拉长并分明睫毛，Chili 丰唇唇笔让唇形更鲜明，Spring 唇冻增添淡淡色泽与水润光泽，化妆包则方便收纳这些产品，让它们随时触手可及。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-hodovoiy-bazovyiy-100685",
    "name": "“轻松变美”彩妆套装",
    "category": "套装",
    "description": "三款产品，打造快速轻松的日常妆容，在不过度堆叠妆感的同时突出自然美。\n\nBrow Fix Gel 让眉毛整齐定型并维持一整天，不粘结；睫毛膏塑造根根分明、自然卷翘的睫毛效果，不结块、不掉屑；Summer 唇冻带来淡粉色泽和水润光泽，让双唇更显平滑、细致。\n\n当你想要快速、舒适而真正轻盈的夏日妆容时，这套组合恰到好处。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-hodovoiy-dlya-tela-100686",
    "name": "“我在SPA，稍后回电”身体护理套装",
    "category": "套装",
    "description": "这是一套从温和清洁、细腻平滑到舒适保湿都齐全的身体护理仪式。\n\n香氛沐浴露温和清洁，史莱姆身体磨砂膏轻柔去角质、展现肌肤自然光泽，透明质酸身体霜凝胶则为护理收尾，让肌肤柔软、光滑、细腻，不黏腻也不厚重。\n\n从清洁到滋养与保湿，每一步都给予身体用心呵护：愉悦的护理过程、宜人的香气，以及让人忍不住想触碰的肌肤。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-lichiko-freshik-100684",
    "name": "“派对不留痕”焕肤套装",
    "category": "套装",
    "description": "这是一套随时可用的护肤流程，适合需要清新、补水和恢复倦容的肌肤。\n\n三款产品协同护理：清凉爽肤水带来清新感，并帮助改善浮肿；含咖啡因与植物提取物的按摩啫喱帮助减轻肿胀，让面部看起来更清爽；含蜗牛黏蛋白、维生素B3和神经酰胺的透明质酸乳液密集补水，使肌肤更平滑、更显细致。\n\n轻盈质地可迅速吸收，不给肌肤增加负担，只留下舒适、清新与自然光泽，不黏腻。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-hodovoiy-letniiy-vaiyb-100687",
    "name": "“今夏闪耀”夏日彩妆套装",
    "category": "套装",
    "description": "这是一套轻盈的夏日基础组合，适合不想让妆容给面部增加负担、只需突出自然美的日子。让你看起来清新动人，仿佛睡饱了、坠入爱河，又刚刚晒出一点健康气色。\n\n套装中的每件产品都服务于自然透亮的妆效：面部喷雾即刻清新并滋润肌肤；睫毛膏令睫毛根根分明、自然卷翘；Crystal 唇油增添镜面光泽与细致感；Morning 唇线笔则轻柔勾勒唇部轮廓，为整体妆容增添清新气息。\n\n不厚重、不多余，也不需要复杂步骤——妆容如夏日般轻松。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-dlya-tela-i-rasslableniya-plys-vaiyb-100676",
    "name": "“Plus Vibe”身体放松套装",
    "category": "套装",
    "description": "",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "nabor-dlya-vosstanovleniya-volos-pusy-prime-your-prime-era-kit-100678",
    "name": "Prime Hair 修护套装",
    "category": "套装",
    "description": "一套完整的护发流程，让头发始终保持如沙龙护理后的状态，适合各种发质和长度。\n\nProtein & Oil Therapy 蛋白与油脂护理配方，旨在带来沙龙造型般的顺滑感。蛋白成分帮助强韧发丝，油脂帮助抚平毛躁并增强光泽。柔和的麝香香草气息会留在发间。\n\n套装内还配有一根丝滑发圈：不拉扯头发，也不易留下勒痕，让人想天天佩戴。",
    "volume": "洗发水、护发素：各400毫升；发膜：250毫升",
    "usage": "步骤1：洗发水\n涂抹于湿发，按摩头皮1—2分钟后，用温水冲洗。如头发较脏，可重复一次。\n\n步骤2：护发素\n均匀涂抹于发中至发梢，停留2—5分钟后冲洗。\n\n步骤3：发膜\n均匀涂抹于发中至发梢，停留15—20分钟后冲洗。",
    "variants": []
  },
  {
    "slug": "maska-dlya-volos-pusy-base-hair-500-g-100177",
    "name": "Base Hair 发膜",
    "category": "头发护理",
    "description": "Base Hair 修护发膜是居家打造沙龙般发质的基础护理，一罐集强韧、滋养和保湿于一体。\n\n椰子油和澳洲坚果油包裹发丝，提供深层滋润并帮助减少断裂。水解角蛋白作用于发丝内部，帮助抚平发丝结构，使头发更显柔顺。泛醇和维生素 E 则赋予弹性与镜面般光泽。配方深度护理却不压塌发丝；使用后头发更丰盈、顺滑、易于打理，缩短造型时间。\n\n持续使用角蛋白发膜有助于改善受损发质，恢复光泽与健康发感。适合干燥、染后及受损发质，也适合希望提升光泽的人群。",
    "volume": "500毫升",
    "usage": "将发膜涂在湿发上，沿发丝全长均匀涂开，重点护理发梢。为获得更好效果，可使用宽齿梳梳匀。停留 15–20 分钟后，用温水彻底冲洗。",
    "variants": []
  },
  {
    "slug": "kondicioner-dlya-volos-pusy-base-hair-750-ml-1-1-100579",
    "name": "Base Hair 护发素",
    "category": "头发护理",
    "description": "Base Hair 护发素是日常头发保湿护理的基础，也是让秀发呈现顺滑与光泽的秘诀。乳木果油和摩洛哥坚果油仿佛以柔软丝绒包裹每一缕发丝，赋予柔软度与弹性。\n\n泛醇、维生素 E 和芒果提取物如同为秀发准备的营养组合，帮助强韧发丝，并带来自然活力光泽。护发素质地不会压塌或粘结发丝，只留下易梳理、轻盈流动的发感。\n\n适合每日使用，为日常护发增添一份精致光泽。",
    "volume": null,
    "usage": null,
    "variants": []
  },
  {
    "slug": "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595",
    "name": "Base Hair 洗发水",
    "category": "头发护理",
    "description": "日常头发清洁的基础。Base Hair 洗发水不仅清洁头发，也帮助发丝呈现强韧感与丰盈感。\n\n温和配方细致清洁，不会令头发过度干燥或增加负担。绿茶纯露带来头皮清新舒适的感受，小麦蛋白则帮助发丝从内而外更显强韧、有弹性。泛醇和芦荟让头发触感柔软，并呈现即使在暗光下也清晰可见的自然光泽。\n\n一瓶兼顾清洁、保湿与细致护发。",
    "volume": "750毫升",
    "usage": null,
    "variants": []
  },
  {
    "slug": "nesmyvaemyiy-krem-spreiy-dlya-volos-pusy-base-hair-200-ml-100223",
    "name": "Base Hair 免洗护发霜喷雾",
    "category": "头发护理",
    "description": "即刻缓解干燥：富含有益活性成分的配方迅速发挥作用，从第一次喷洒起就带来深层润泽感。\n\n喷雾仿佛为每根发丝覆上一层隐形丝绸，让梳子顺畅滑过，减少拉扯的不适；头发变得柔软、顺滑、易打理，如同刚做完沙龙护理。它带来的不是黏腻或油亮，而是由内而外的自然健康光泽。\n\n发丝会随着光线自然闪耀，仿佛广告画面。对染后、干燥和受损发质尤其适用：喷雾温和包裹发梢，滋养头发并帮助锁住水分。",
    "volume": "200毫升",
    "usage": "使用前摇匀瓶身，均匀喷洒在洁净的湿发上。使用宽齿梳从发梢开始，逐步向发根轻柔梳理。随后按平时习惯吹干并造型。",
    "variants": []
  },
  {
    "slug": "maska-dlya-volos-pusy-prime-hair-250-ml-100178",
    "name": "Prime Hair 发膜",
    "category": "头发护理",
    "description": "PÚSY Prime Hair 发膜是一款密集修护与滋养护理，适合希望获得顺滑、丰盈和充分滋养发感时使用。\n\nProtein & Oil Therapy 配方含澳洲坚果油和阿比西尼亚海甘蓝籽油，帮助柔软发丝、减少干燥，使发丝全长看起来更具光泽、更加柔顺。水解角蛋白、小麦蛋白和泛醇帮助强韧发丝、维持结构并修护受损部位。石榴、木瓜和燕麦提取物改善发丝质感，赋予柔软与弹性。\n\n建议每周使用 1–2 次，适合所有发质。",
    "volume": "250毫升",
    "usage": "将发膜涂在湿发上，沿发丝全长均匀涂开，重点护理发梢。为获得更好效果，可使用宽齿梳梳匀。停留 15–20 分钟后，用温水彻底冲洗。",
    "variants": []
  },
  {
    "slug": "kondicioner-dlya-volos-pusy-prime-hair-400-ml-100173",
    "name": "Prime Hair 护发素",
    "category": "头发护理",
    "description": "PÚSY Prime Hair 护发素在不增加负担的同时为头发补充营养和水分，使其更柔软、顺滑、易于打理。\n\nProtein & Oil Therapy 配方含泛醇及大米、小麦和火麻蛋白，帮助强韧发丝并维持发丝全长的丰盈度。牛油果油、摩洛哥坚果油和乳木果油复合物滋养头发，赋予柔滑与光泽。蓝莓和桃子提取物有助于减少断裂和暗沉；配方中的氨基酸从内帮助维持发丝弹性和健康外观。\n\n适合所有发质。",
    "volume": "400毫升",
    "usage": "洗发后将护发素涂抹在湿润的头发上。将产品分布在整个长度上，包括末端。为了获得最佳效果，请使用宽齿梳子。停留 2-5 分钟以恢复和保湿，然后用温水冲洗。",
    "variants": []
  },
  {
    "slug": "shampun-dlya-volos-pusy-prime-hair-400-ml-100203",
    "name": "Prime Hair 洗发水",
    "category": "头发护理",
    "description": "PÚSY Prime Hair 洗发水可温和清洁头皮和头发，维持头皮自然舒适感，也不会令发丝全长过度干燥。\n\nProtein & Oil Therapy 配方含泛醇以及大米、小麦和火麻植物蛋白，帮助强韧发丝结构、减少断裂，并维持顺滑与弹性。海带、金盏花和山金车提取物帮助柔润、呵护头皮，同时赋予头发自然光泽与细致发感。\n\n适合各种发质及经常使用，不含硫酸盐和对羟基苯甲酸酯。",
    "volume": "400毫升",
    "usage": "将少量洗发水涂抹在湿润的头发上。轻轻按摩头皮并沿着头发的长度分布，停留 1-2 分钟。用温水彻底冲洗。如有必要，请重复。为了获得最佳效果，请使用 PÚSY 保湿护发素。",
    "variants": []
  }
]$catalog_data$::JSONB) AS item(
  slug TEXT,
  name TEXT,
  category TEXT,
  description TEXT,
  volume TEXT,
  usage TEXT,
  variants JSONB
);

DO $translation_checks$
DECLARE
  missing_products TEXT;
  missing_categories TEXT;
BEGIN
  SELECT string_agg(o.slug, ', ' ORDER BY o.slug)
  INTO missing_products
  FROM catalog_translation_overrides AS o
  LEFT JOIN products AS p ON p.slug = o.slug
  WHERE p.id IS NULL;

  IF missing_products IS NOT NULL THEN
    RAISE EXCEPTION 'Catalog translation migration references missing products: %', missing_products;
  END IF;

  SELECT string_agg(DISTINCT o.category, ', ' ORDER BY o.category)
  INTO missing_categories
  FROM catalog_translation_overrides AS o
  LEFT JOIN product_categories AS c ON c.name = o.category
  WHERE c.id IS NULL;

  IF missing_categories IS NOT NULL THEN
    RAISE EXCEPTION 'Catalog translation migration references missing categories: %', missing_categories;
  END IF;
END
$translation_checks$;

UPDATE products AS p
SET
  name = o.name,
  category = o.category,
  category_id = c.id,
  description = o.description,
  volume = o.volume,
  usage = o.usage,
  variants_json = o.variants::TEXT,
  updated_at = CURRENT_TIMESTAMP
FROM catalog_translation_overrides AS o
JOIN product_categories AS c ON c.name = o.category
WHERE p.slug = o.slug;
