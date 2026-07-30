# PUSY.CN 中国商城

基于 Next.js、React 和 PostgreSQL 的 PUSY.CN 中国官方网站，包含商品目录、购物车、会员中心、订单支付、售后、内容运营与管理后台。

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Node.js 版本要求：`>=22.13.0`。

## 上线前必需配置

- `DATABASE_URL`：PostgreSQL 连接地址。
- `ADMIN_PASSWORD`：至少 8 位的独立后台密码。
- `ADMIN_SESSION_SECRET`：至少 32 个随机字符，用于签发后台会话。
- 邮件验证码：启用数据库中的 email 通知渠道，并设置 `RESEND_API_KEY` 与发件地址。
- 或短信验证码：启用 sms 通知渠道，并设置 `SMS_API_URL`、`SMS_API_KEY`。
- 微信支付或支付宝的商户参数和服务器密钥。
- 中国运营主体、客服电话、ICP 与公安联网备案信息。

后台不再信任浏览器可伪造的身份请求头。未配置后台密码和会话密钥时，后台会保持关闭。

### 正式支付接入

- 微信支付：后台填写 AppID、商户号、平台公钥 ID 和商户证书序列号；服务器设置 `WECHAT_PAY_PRIVATE_KEY`、`WECHAT_PAY_PUBLIC_KEY`、`WECHAT_PAY_API_V3_KEY`。
- 微信小程序：认证后设置 `WECHAT_MINIPROGRAM_APP_ID` 与 `WECHAT_MINIPROGRAM_APP_SECRET`；认证前保持小程序 `previewMode`，不得使用伪造 OpenID。
- 支付宝：后台填写应用 ID 和商户号；服务器设置 `ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`。
- 两个渠道都切换为“正式环境”并在后台启用后，前台才允许发起真实扣款。
- 微信支付回调为 `/api/payments/webhooks/wechat`，微信退款回调为 `/api/payments/webhooks/wechat/refund`；支付宝回调为 `/api/payments/webhooks/alipay`。
- 低库存通知接收邮箱可通过 `INVENTORY_ALERT_EMAIL` 设置；未设置时依次使用中国区客服邮箱和后台管理员邮箱。

## 数据库迁移

每次部署新版本前运行：

```bash
npm run db:migrate
```

迁移脚本具有幂等性，会增加会员验证码、服务端会话、限流和订单资源预留字段，不会删除现有业务数据。

## 质量检查

```bash
npm run lint
npm test
```

`npm test` 会先执行生产构建，再运行关键安全与业务规则测试。
