# PUSY.CN 消息通知接入说明

消息通知采用“业务事件 + 持久化任务队列 + 独立渠道适配器”。订单和支付逻辑只产生通知事件，邮件或短信发送失败不会回滚订单。

## 已接入的业务事件

- 订单支付成功：订单确认邮件和短信
- 后台将订单改为“已发货”：发货邮件和短信
- 全额或部分退款成功：退款进度邮件和短信
- 礼品卡订单支付成功：按指定发送日期向收件邮箱发送礼品卡

每个事件、渠道和收件人的任务 ID 固定，重复支付回调或重复后台操作不会造成重复发送。

## 邮件渠道

邮件使用 Resend：

1. 在服务器配置 `RESEND_API_KEY` 和 `RESEND_WEBHOOK_SECRET`。
2. 在 Resend 验证 `PUSY.CN` 发件域名及 SPF、DKIM 等 DNS 记录。
3. 在后台“消息通知”填写已验证的发件邮箱并启用邮件。
4. 将回调地址配置为 `https://PUSY.CN/api/notifications/webhooks/resend`，订阅 delivered、bounced、complained、suppressed 事件。

## 短信渠道

短信使用独立 HTTP 网关适配器。服务器配置：

- `SMS_API_URL`：短信网关发送地址
- `SMS_API_KEY`：Bearer API 密钥
- `SMS_SENDER_ID`：短信签名或发送方标识

网关接收 JSON：`to`、`message`、`sender`，并返回 `id` 或 `messageId`。后续接入阿里云、腾讯云等服务商时，只需替换短信适配器，不需要修改订单流程。

## 定时和失败重试

服务器或定时任务使用 Bearer `NOTIFICATION_PROCESS_SECRET` 调用：

`POST https://PUSY.CN/api/notifications/process`

建议每分钟调用一次，用于发送指定日期的礼品卡以及自动重试失败任务。后台也可以手动点击“处理到期队列”或“立即重试”。

## 上线前检查

- 使用测试邮箱验证订单确认、发货、退款和礼品卡四种模板。
- 验证送达、退信和投诉回调能正确更新后台状态。
- 使用国内短信服务商已备案模板和签名完成短信验收。
- 确认密钥只存在于服务器环境变量中，未提交到代码仓库。
