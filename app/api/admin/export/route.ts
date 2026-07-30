import { getStoreDb } from "../../../../db/store";
import { getAdminIdentity } from "../../../../lib/admin-auth";
import { roleCan, type AdminPermission } from "../../../../lib/admin-permissions";

const exports: Record<string, { query: string; headers: string[]; permission: AdminPermission }> = {
  orders: { permission: "orders.read", query: "SELECT id AS 订单号, customer AS 客户, email AS 邮箱, phone AS 手机, address AS 地址, delivery AS 配送, payment AS 支付, ROUND(total * 0.12, 2) AS 金额元, ROUND(discount * 0.12, 2) AS 优惠元, coupon_code AS 优惠码, status AS 状态, created_at AS 创建时间 FROM orders ORDER BY created_at DESC", headers: ["订单号","客户","邮箱","手机","地址","配送","支付","金额元","优惠元","优惠码","状态","创建时间"] },
  members: { permission: "customers.read", query: "SELECT id AS 会员编号, name AS 姓名, email AS 邮箱, phone AS 手机, status AS 状态, total_orders AS 订单数, ROUND(total_spent * 0.12, 2) AS 累计消费元, joined_at AS 加入时间 FROM members ORDER BY joined_at DESC", headers: ["会员编号","姓名","邮箱","手机","状态","订单数","累计消费元","加入时间"] },
  products: { permission: "products.read", query: "SELECT id AS 商品编号, sku AS SKU, name AS 商品名称, slug AS 链接标识, category AS 分类, ROUND(price * 0.12, 2) AS 售价元, stock AS 库存, status AS 状态 FROM products ORDER BY id DESC", headers: ["商品编号","SKU","商品名称","链接标识","分类","售价元","库存","状态"] },
  subscribers: { permission: "marketing.read", query: "SELECT email AS 邮箱, source AS 来源, status AS 状态, subscribed_at AS 订阅时间 FROM subscribers ORDER BY subscribed_at DESC", headers: ["邮箱","来源","状态","订阅时间"] },
  returns: { permission: "support.read", query: "SELECT id AS 售后单号, order_id AS 订单号, email AS 邮箱, reason AS 原因, details AS 说明, status AS 状态, created_at AS 申请时间 FROM returns ORDER BY created_at DESC", headers: ["售后单号","订单号","邮箱","原因","说明","状态","申请时间"] },
  "payment-reconciliation": { permission: "finance.read", query: `SELECT p.id AS 支付单号, p.order_id AS 订单号, p.provider AS 支付渠道, p.merchant_trade_no AS 商户交易号, p.provider_transaction_id AS 渠道交易号, p.status AS 支付状态, o.status AS 订单状态, ROUND(p.amount_fen / 100.0, 2) AS 支付金额元, ROUND(COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status = 'succeeded'), 0) / 100.0, 2) AS 成功退款元, ROUND((p.amount_fen - COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status = 'succeeded'), 0)) / 100.0, 2) AS 净收款元, CASE WHEN p.status IN ('paid','partially_refunded') AND o.resources_committed = 0 THEN '已支付但库存未确认' WHEN p.status IN ('paid','partially_refunded','refunding','refunded') AND p.provider_transaction_id IS NULL THEN '缺少渠道交易号' WHEN COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status IN ('pending','processing','succeeded')), 0) > p.amount_fen THEN '退款超过支付金额' ELSE '正常' END AS 对账结果, p.updated_at AS 更新时间 FROM payments p JOIN orders o ON o.id = p.order_id LEFT JOIN refunds r ON r.payment_id = p.id GROUP BY p.id, o.id ORDER BY p.updated_at DESC`, headers: ["支付单号","订单号","支付渠道","商户交易号","渠道交易号","支付状态","订单状态","支付金额元","成功退款元","净收款元","对账结果","更新时间"] },
  "refund-reconciliation": { permission: "finance.read", query: "SELECT r.id AS 退款单号, r.order_id AS 订单号, r.provider AS 支付渠道, r.merchant_refund_no AS 商户退款号, r.provider_refund_id AS 渠道退款号, ROUND(r.amount_fen / 100.0, 2) AS 退款金额元, r.reason AS 退款原因, r.status AS 退款状态, r.attempts AS 请求次数, r.last_error AS 最后错误, r.created_at AS 创建时间, r.updated_at AS 更新时间 FROM refunds r ORDER BY r.updated_at DESC", headers: ["退款单号","订单号","支付渠道","商户退款号","渠道退款号","退款金额元","退款原因","退款状态","请求次数","最后错误","创建时间","更新时间"] },
  partnerships: { permission: "marketing.read", query: "SELECT id AS 受理编号, contact_name AS 联系人, phone AS 手机, company AS 公司门店, city AS 城市, cooperation_type AS 合作类型, wechat AS 微信号, email AS 邮箱, proposal AS 合作方案, status AS 状态, created_at AS 提交时间, updated_at AS 更新时间 FROM retail_partnerships ORDER BY created_at DESC", headers: ["受理编号","联系人","手机","公司门店","城市","合作类型","微信号","邮箱","合作方案","状态","提交时间","更新时间"] },
};

function cell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const actor = await getAdminIdentity();
  if (!actor) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "orders";
  const config = exports[type];
  if (!config) return Response.json({ error: "不支持的导出类型" }, { status: 400 });
  if (!roleCan(actor.role, config.permission)) return Response.json({ error: "当前账号没有导出此数据的权限" }, { status: 403 });
  const db = await getStoreDb();
  const rows = await db.prepare(config.query).all<Record<string, unknown>>();
  const csv = `\uFEFF${config.headers.map(cell).join(",")}\r\n${rows.results.map((row) => config.headers.map((header) => cell(row[header])).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="PUSY-CN-${type}.csv"`, "cache-control": "private, no-store" } });
}
