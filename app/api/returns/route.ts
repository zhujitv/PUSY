import { hasTrustedOrigin, privateJson, safeServerError } from "../../../lib/request-security";
import { lookupOrders, requestOrderCode, verifyOrderCode } from "./return-lookup";
import { submitReturn } from "./return-submit";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    if (action === "request-order-code") return requestOrderCode(request, payload);
    if (action === "verify-order-code") return verifyOrderCode(request, payload);
    if (action === "lookup-orders") return lookupOrders(request, payload);
    if (action === "submit-return") return submitReturn(request, payload);
    return privateJson({ error: "售后操作无效" }, { status: 400 });
  } catch (error) {
    console.error("[returns] request failed", { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error && /验证码已经使用/.test(error.message) ? "验证码无效或已过期，请重新获取" : "售后操作失败，请稍后再试";
    return safeServerError(message, message.startsWith("验证码") ? 409 : 500);
  }
}
