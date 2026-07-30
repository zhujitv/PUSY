BEGIN;

INSERT INTO notification_templates (key, name, email_subject, email_body, sms_body, enabled) VALUES
  ('gift_card_sent', '电子礼品卡发送通知', '{{senderName}} 送你一张 PUSY.CN 电子礼品卡', '你好 {{recipientName}}，{{senderName}} 送你一张 {{amount}} 的 PUSY.CN 电子礼品卡。礼品卡号：{{giftCode}}。祝福：{{message}}。结账时输入卡号即可使用，请妥善保管。', '', 1)
ON CONFLICT (key) DO NOTHING;

UPDATE site_content
SET value = '实体商品满 198.00 元 免标准快递费', updated_at = CURRENT_TIMESTAMP
WHERE key = 'announcement'
  AND value IN ('订单满 600.00 元免费配送', '订单满 600.00 元 免费配送', '订单满 600 元 免费配送');

COMMIT;
