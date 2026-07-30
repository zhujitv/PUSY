import { getStoreDb } from "../../db/store";
import { notifyOrderShipped } from "../notifications/business";
import { isGiftCardLineSlug } from "../shipping";

export const carriers = {
  sf: { name: "顺丰速运", url: (number: string) => `https://www.sf-express.com/chn/sc/dynamic_function/waybill/#search/bill-number/${encodeURIComponent(number)}` },
  jd: { name: "京东物流", url: () => "https://www.jdl.com/orderSearch/" },
  zto: { name: "中通快递", url: () => "https://www.zto.com/express/expressCheck.html" },
  yto: { name: "圆通速递", url: () => "https://www.yto.net.cn/query/order/" },
  sto: { name: "申通快递", url: () => "https://www.sto.cn/" },
  yunda: { name: "韵达快递", url: () => "https://www.yundaex.com/cn/index.php" },
  ems: { name: "中国邮政 EMS", url: () => "https://www.ems.com.cn/queryList" },
  other: { name: "其他物流", url: () => "" },
} as const;

export type CarrierCode = keyof typeof carriers;
const shipmentId = () => `SHP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

export function carrierTrackingUrl(code: string, trackingNumber: string) {
  const carrier = carriers[code as CarrierCode];
  return carrier ? carrier.url(trackingNumber) : "";
}

export async function shipOrder(input: { orderId: string; carrierCode: string; trackingNumber: string; actor: string }) {
  const carrier = carriers[input.carrierCode as CarrierCode];
  const trackingNumber = input.trackingNumber.trim().replace(/\s+/g, "").slice(0, 64);
  if (!carrier || !/^[A-Za-z0-9-]{5,64}$/.test(trackingNumber)) throw new Error("请选择物流公司并填写有效物流单号");
  const db = await getStoreDb();
  const order = await db.prepare("SELECT id, status, resources_committed FROM orders WHERE id = ?").bind(input.orderId).first<{ id: string; status: string; resources_committed: number }>();
  if (!order) throw new Error("订单不存在");
  if (!order.resources_committed || ["待付款", "支付失败", "已取消", "已退款"].includes(order.status)) throw new Error("订单尚未支付或已关闭，不能发货");
  const orderItems = await db.prepare("SELECT product_slug FROM order_items WHERE order_id = ?").bind(order.id).all<{ product_slug: string }>();
  if (!orderItems.results.some((item) => !isGiftCardLineSlug(item.product_slug))) throw new Error("电子礼品卡订单无需快递发货");
  const existing = await db.prepare("SELECT id, tracking_number FROM shipments WHERE order_id = ?").bind(order.id).first<{ id: string; tracking_number: string }>();
  const id = existing?.id ?? shipmentId();
  const url = carrier.url(trackingNumber);
  await db.batch([
    db.prepare(`INSERT INTO shipments (id, order_id, carrier_code, carrier_name, tracking_number, status, tracking_url)
      VALUES (?, ?, ?, ?, ?, '已发货', ?)
      ON CONFLICT (order_id) DO UPDATE SET carrier_code = EXCLUDED.carrier_code, carrier_name = EXCLUDED.carrier_name,
      tracking_number = EXCLUDED.tracking_number, tracking_url = EXCLUDED.tracking_url, status = '已发货', shipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).bind(id, order.id, input.carrierCode, carrier.name, trackingNumber, url),
    db.prepare("INSERT INTO shipment_events (shipment_id, status, description, source) VALUES (?, '已发货', ?, 'admin')").bind(id, `${carrier.name} 已揽收运单 ${trackingNumber}（操作人：${input.actor}）`),
    db.prepare("UPDATE orders SET status = '已发货', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(order.id),
  ]);
  await notifyOrderShipped(order.id).catch(() => undefined);
  return db.prepare("SELECT * FROM shipments WHERE id = ?").bind(id).first();
}

export async function addShipmentEvent(input: { shipmentId: string; status: string; description: string; location?: string; actor: string }) {
  const allowed = ["已揽收", "运输中", "派送中", "已签收", "异常"];
  const status = input.status.trim();
  const description = input.description.trim().slice(0, 500);
  const location = (input.location ?? "").trim().slice(0, 120);
  if (!allowed.includes(status) || !description) throw new Error("物流轨迹信息无效");
  const db = await getStoreDb();
  const shipment = await db.prepare("SELECT id, order_id FROM shipments WHERE id = ?").bind(input.shipmentId).first<{ id: string; order_id: string }>();
  if (!shipment) throw new Error("运单不存在");
  await db.batch([
    db.prepare("INSERT INTO shipment_events (shipment_id, status, description, location, source) VALUES (?, ?, ?, ?, ?)").bind(shipment.id, status, description, location, `admin:${input.actor}`),
    db.prepare("UPDATE shipments SET status = ?, delivered_at = CASE WHEN ? = '已签收' THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE delivered_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, status, shipment.id),
    ...(status === "已签收" ? [db.prepare("UPDATE orders SET status = '已完成', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = '已发货'").bind(shipment.order_id)] : []),
  ]);
}
