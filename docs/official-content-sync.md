# PUSY.CN 官方内容同步配置

本模块只从品牌自有且已授权的官方账号读取内容，并把内容保存为后台候选草稿。采集、翻译或定时任务都不能跳过人工审核直接公开。

## 发布流程

1. 官方平台出现新内容。
2. Telegram 通过 Bot API webhook 接收；Instagram 与 VK 由 Vercel Cron 每天 09:15（中国标准时间）调用官方 API。
3. 系统按平台内容 ID 去重，保留来源链接、原文、素材信息和授权信息。
4. 如已配置翻译服务，生成简体中文草稿；否则标记为待翻译。
5. 管理员在“后台 → 内容运营 → 官方内容采集与审核”中编辑、合规检查并批准。
6. 只有已批准内容可以立即发布或定时发布；已发布内容可以撤回，但审计记录保留。

## Vercel 环境变量

所有密钥只放在 Vercel 项目的 Production 环境变量中，不要写入 Git 仓库或后台表单。

### 通用

```text
CRON_SECRET=<至少 32 位随机值>
CONTENT_SYNC_LIMIT=20
```

### Telegram

```text
TELEGRAM_CONTENT_WEBHOOK_SECRET=<Telegram setWebhook 使用的 secret_token>
TELEGRAM_CONTENT_CHANNEL_USERNAME=pusybeautyy
TELEGRAM_CONTENT_CHANNEL_ID=<可选，建议填写频道数字 ID>
TELEGRAM_CONTENT_SOURCE_ID=SRC-TELEGRAM-PUSYBEAUTYY
```

机器人需要被加入官方频道并获得接收频道动态所需权限。将 webhook 设置为：

```text
https://pusy.cn/api/webhooks/telegram/content
```

调用 Telegram `setWebhook` 时同时传入与 `TELEGRAM_CONTENT_WEBHOOK_SECRET` 完全相同的 `secret_token`。运行时只接受 `channel_post` 与 `edited_channel_post`，并校验频道 ID 或官方用户名。

### Instagram

```text
INSTAGRAM_CONTENT_ACCESS_TOKEN=<Instagram Login 官方长期令牌>
INSTAGRAM_CONTENT_USER_ID=<专业账号 ID；默认 me>
INSTAGRAM_CONTENT_ACCOUNT=pusy.beauty
INSTAGRAM_CONTENT_SOURCE_ID=SRC-INSTAGRAM-PUSY-BEAUTY
INSTAGRAM_CONTENT_API_VERSION=v23.0
INSTAGRAM_CONTENT_LIMIT=20
```

账号必须是 Instagram 专业账号，并通过 Meta 官方应用授权。令牌到期或权限撤回时，同步会保留现有内容并在后台显示错误，不会改用网页抓取。

### VK

```text
VK_CONTENT_ACCESS_TOKEN=<VK 官方 API 服务或用户令牌>
VK_CONTENT_DOMAIN=pusybeauty
VK_CONTENT_OWNER_ID=<可选；有数字 owner_id 时优先填写>
VK_CONTENT_SOURCE_ID=SRC-VK-PUSYBEAUTY
VK_CONTENT_API_VERSION=5.199
VK_CONTENT_LIMIT=20
```

### 自动翻译

翻译适配器兼容 `POST /chat/completions` 的服务。生产环境必须使用 HTTPS；密钥仅在服务器端读取。

```text
CONTENT_TRANSLATION_BASE_URL=https://<provider>/v1
CONTENT_TRANSLATION_ENDPOINT=<可选；填写后覆盖 BASE_URL>
CONTENT_TRANSLATION_MODEL=<模型名称>
CONTENT_TRANSLATION_API_KEY=<服务器端密钥>
CONTENT_TRANSLATION_TIMEOUT_MS=45000
```

未配置翻译服务时系统仍会正常采集，但保持“待翻译”状态，管理员可手工填写中文标题和正文。

## 验收清单

- 同一平台内容重复回调或重复同步不会产生重复候选稿。
- 平台凭据缺失时任务显示“跳过”，不会报假成功或尝试网页抓取。
- Telegram webhook 密钥错误时返回 401；Cron 密钥错误时返回 401。
- 未翻译、未人工批准或存在阻断级合规风险的候选稿不能发布。
- 发布内容能在 `/blog` 查看，来源与审核记录在后台可追溯。
- 撤回后官网不再展示，但候选稿、操作事件和历史版本仍保留。
