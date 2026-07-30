import { timingSafeEqual } from "node:crypto";
import { ingestTelegramWebhook } from "../../../../../lib/content-ingest/service";
import type { TelegramUpdate } from "../../../../../lib/content-ingest/connectors/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretsMatch(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_CONTENT_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) return Response.json({ error: "Telegram 内容回调密钥未配置", configured: false }, { status: 503 });

  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!provided || !secretsMatch(provided, secret)) return Response.json({ error: "Telegram 内容回调验证失败" }, { status: 401 });

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return Response.json({ error: "Telegram 回调内容不是有效 JSON" }, { status: 400 });
  }
  if (!Number.isInteger(update.update_id)) return Response.json({ error: "Telegram 回调内容无效" }, { status: 400 });

  try {
    return Response.json(await ingestTelegramWebhook(update));
  } catch {
    return Response.json({ error: "Telegram 内容候选保存失败" }, { status: 500 });
  }
}
