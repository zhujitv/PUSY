# PUSY.CN 支付接入说明

支付采用“后台配置模块 + 独立支付适配代码”。后台只保存非敏感商户参数，私钥、公钥及微信 API v3 密钥只存在于服务器环境变量中。

## 服务器密钥

参照 `.env.example` 配置：

- `WECHAT_PAY_PRIVATE_KEY`：微信支付商户 API 私钥（PEM）
- `WECHAT_PAY_PUBLIC_KEY`：微信支付平台公钥（PEM）
- `WECHAT_PAY_API_V3_KEY`：微信支付 API v3 密钥
- `ALIPAY_PRIVATE_KEY`：支付宝应用私钥（PEM）
- `ALIPAY_PUBLIC_KEY`：支付宝公钥（PEM）

不要把真实密钥提交到 Git，也不要粘贴到管理后台。

## 后台参数

进入 `/admin` 的“支付与退款”：

1. 填写应用 ID、商户号等非敏感参数。
2. 微信支付额外填写平台公钥 ID、商户证书序列号。
3. 确认后台显示所有服务器密钥已安装。
4. 完成沙箱或商户验收后再启用渠道。

## 商户平台回调地址

- 微信支付通知：`https://PUSY.CN/api/payments/webhooks/wechat`
- 微信退款通知：`https://PUSY.CN/api/payments/webhooks/wechat/refund`
- 支付宝异步通知：`https://PUSY.CN/api/payments/webhooks/alipay`

回调接口会先验签，再校验应用、商户、订单号和金额；只有全部一致时才更新支付和订单状态。重复通知按事件 ID 幂等处理。

## 上线前验收

- 用商户沙箱或最小金额完成微信、支付宝各一笔付款。
- 验证异步回调、主动查询补偿、重复回调和支付失败重试。
- 分别验证全额退款、部分退款、退款失败重试和退款状态查询。
- 确认生产回调域名可从公网访问，并保留支付事件审计记录。
