import { processDueNotifications } from "../../../../lib/notifications/service";
import { releaseExpiredOrderReservations } from "../../../../lib/orders/reservations";

export async function POST(request: Request) {
  const expected = process.env.NOTIFICATION_PROCESS_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || provided !== expected) return Response.json({ error: "通知处理凭证无效" }, { status: 401 });
  const [results, releasedReservations] = await Promise.all([
    processDueNotifications(),
    releaseExpiredOrderReservations(),
  ]);
  return Response.json({
    processed: results.length,
    results,
    releasedReservations,
  });
}
