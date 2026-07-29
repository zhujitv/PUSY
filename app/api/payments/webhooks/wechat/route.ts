import { verifyWechatWebhook } from "../../../../../lib/payments/wechat";
import { processPaymentWebhook, providerConfig } from "../../../../../lib/payments/service";

export async function POST(request: Request) {
  try {
    const config = await providerConfig("wechat");
    const event = await verifyWechatWebhook(request, config.public_key_id);
    await processPaymentWebhook("wechat", event);
    return Response.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    return Response.json({ code: "FAIL", message: error instanceof Error ? error.message : "处理失败" }, { status: 400 });
  }
}
