# PUSY.CN 中国商城

基于 Next.js、React 和 PostgreSQL 的 PUSY.CN 中国官方网站，包含商品目录、购物车、会员中心、PÚSY CLUB 社区、订单支付、售后、内容运营与管理后台。

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
- `ADMIN_PASSWORD`：至少 12 位的独立后台密码；完成具名管理员迁移后可移除该旧主管理员密码。
- `ADMIN_SESSION_SECRET`：至少 32 个随机字符，用于签发后台会话。
- 邮箱验证码：启用数据库中的 email 通知渠道，并设置 `RESEND_API_KEY` 与发件地址；会员注册和登录均以已验证邮箱为主身份。
- 可选手机号验证：如需在会员资料中验证联系电话，再启用 sms 通知渠道并设置 `SMS_API_URL`、`SMS_API_KEY`。
- 可选快捷登录：微信配置 `WECHAT_OAUTH_APP_ID`、`WECHAT_OAUTH_APP_SECRET`；支付宝配置 `ALIPAY_OAUTH_APP_ID` 及 OAuth RSA2 密钥。未配置时不影响邮箱注册和登录。
- 微信支付或支付宝的商户参数和服务器密钥。
- 中国运营主体、客服电话、ICP 与公安联网备案信息。

后台不再信任浏览器可伪造的身份请求头。未配置后台密码和会话密钥时，后台会保持关闭。

### 正式支付接入

- 微信支付：后台填写 AppID、商户号、平台公钥 ID 和商户证书序列号；服务器设置 `WECHAT_PAY_PRIVATE_KEY`、`WECHAT_PAY_PUBLIC_KEY`、`WECHAT_PAY_API_V3_KEY`。
- 支付宝：后台填写应用 ID 和商户号；服务器设置 `ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`。
- 两个渠道都切换为“正式环境”并在后台启用后，前台才允许发起真实扣款。
- 微信支付回调为 `/api/payments/webhooks/wechat`，微信退款回调为 `/api/payments/webhooks/wechat/refund`；支付宝回调为 `/api/payments/webhooks/alipay`。
- 低库存通知接收邮箱可通过 `INVENTORY_ALERT_EMAIL` 设置；未设置时依次使用中国区客服邮箱和后台管理员邮箱。

### 会员账号绑定

- 新会员先通过邮箱验证码完成注册，然后可选择绑定微信或支付宝，也可跳过。
- 微信绑定使用微信开放平台“网站应用”授权；支付宝绑定使用网页应用用户授权。支付商户配置不能替代会员 OAuth 应用配置。
- OAuth `state` 仅以哈希形式短期保存，授权令牌不会写入数据库；系统只保存平台用户标识和绑定时间。
- 已绑定账号可用于快捷登录，会员可在个人资料中随时解除绑定，邮箱登录不受影响。

## 数据库迁移

每次部署新版本前运行：

```bash
npm run db:migrate
```

迁移脚本具有幂等性，会增加会员验证码、服务端会话、限流和订单资源预留字段，不会删除现有业务数据。

社区第一期复用会员会话与独立后台审核权限；会员图文默认进入待审核，只有通过审核的内容与媒体可公开访问。第二期已接入会员关注、社区话题、关注内容流和站内通知；审核结果与关注会员的新分享会通过幂等通知事件送达。

## 质量检查

```bash
npm run lint
npm test
```

`npm test` 会先执行生产构建，再运行关键安全与业务规则测试。
