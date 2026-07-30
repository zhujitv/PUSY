import { processDueNotifications } from "../../../../lib/notifications/service";
import { releaseExpiredOrderReservations } from "../../../../lib/orders/reservations";
import { runGrowthAutomations } from "../../../../lib/growth/automations";

async function handleProcessing(request: Request) {
  const expected = process.env.NOTIFICATION_PROCESS_SECRET || process.env.CRON_SECRET || "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || provided !== expected) return Response.json({ error: "通知处理凭证无效" }, { status: 401 });
  const growth = await runGrowthAutomations();
  const [results, releasedReservations] = await Promise.all([processDueNotifications(), releaseExpiredOrderReservations()]);
  return Response.json({
    processed: results.length,
    results,
    releasedReservations,
    growth,
  });
}

export async function POST(request: Request) { return handleProcessing(request); }
export async function GET(request: Request) { return handleProcessing(request); }
