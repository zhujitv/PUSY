-- Move the default homepage campaign to the current foreign-site campaign.
-- Only untouched legacy defaults are replaced; operator-authored content is preserved.
UPDATE site_content SET value = '新品', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero_eyebrow' AND value = 'púsy × Ü';
UPDATE site_content SET value = '镜面唇釉', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero_title' AND value = E'礼物飞进\n你的订单';
UPDATE site_content SET value = '轻盈水光，持久显色。', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero_subtitle' AND value = '猜猜你会收到哪一份？';
UPDATE site_content SET value = '立即选购', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero_cta_label' AND value = '立即探索';
UPDATE site_content SET value = '/collections/novinki', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero_cta_url' AND value = '/catalog/products';
UPDATE site_content SET value = '返校季', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero2_eyebrow' AND value = 'PÚSY 神秘礼盒';
UPDATE site_content SET value = E'精选商品\n限时八折', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero2_title' AND value = E'装下这个夏天\n需要的一切';
UPDATE site_content SET value = '立即选购', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero2_cta_label' AND value = '了解更多';
UPDATE site_content SET value = '/collections/back-to-school', updated_at = CURRENT_TIMESTAMP WHERE key = 'hero2_cta_url' AND value = '/catalog/sekretnye-boksy';
