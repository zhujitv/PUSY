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
- `ADMIN_PASSWORD`：至少 12 位的独立后台密码。
- `ADMIN_SESSION_SECRET`：至少 32 个随机字符，用于签发后台会话。
- 邮件验证码：启用数据库中的 email 通知渠道，并设置 `RESEND_API_KEY` 与发件地址。
- 或短信验证码：启用 sms 通知渠道，并设置 `SMS_API_URL`、`SMS_API_KEY`。
- 微信支付或支付宝的商户参数和服务器密钥。
- 中国运营主体、客服电话、ICP 与公安联网备案信息。

后台不再信任浏览器可伪造的身份请求头。未配置后台密码和会话密钥时，后台会保持关闭。

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
