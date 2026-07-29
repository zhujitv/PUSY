import { verifyAlipayWebhook } from "../../../../../lib/payments/alipay";
import { processPaymentWebhook } from "../../../../../lib/payments/service";

export async function POST(request: Request) {
  try {
    const event = await verifyAlipayWebhook(request);
    await processPaymentWebhook("alipay", event);
    return new Response("success", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response("fail", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
