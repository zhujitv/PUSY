import { getStoreDb } from "../../../../db/store";
import { getAdminIdentity } from "../../../../lib/admin-auth";

async function allowAdmin() { return Boolean(await getAdminIdentity()); }
const exports: Record<string, { query: string; headers: string[] }> = {
  orders: { query: "SELECT id AS 订单号, customer AS 客户, email AS 邮箱, phone AS 手机, address AS 地址, delivery AS 配送, payment AS 支付, ROUND(total * 0.12, 2) AS 金额元, ROUND(discount * 0.12, 2) AS 优惠元, coupon_code AS 优惠码, status AS 状态, created_at AS 创建时间 FROM orders ORDER BY created_at DESC", headers: ["订单号","客户","邮箱","手机","地址","配送","支付","金额元","优惠元","优惠码","状态","创建时间"] },
  members: { query: "SELECT id AS 会员编号, name AS 姓名, email AS 邮箱, phone AS 手机, status AS 状态, total_orders AS 订单数, ROUND(total_spent * 0.12, 2) AS 累计消费元, joined_at AS 加入时间 FROM members ORDER BY joined_at DESC", headers: ["会员编号","姓名","邮箱","手机","状态","订单数","累计消费元","加入时间"] },
  products: { query: "SELECT id AS 商品编号, sku AS SKU, name AS 商品名称, slug AS 链接标识, category AS 分类, ROUND(price * 0.12, 2) AS 售价元, stock AS 库存, status AS 状态 FROM products ORDER BY id DESC", headers: ["商品编号","SKU","商品名称","链接标识","分类","售价元","库存","状态"] },
  subscribers: { query: "SELECT email AS 邮箱, source AS 来源, status AS 状态, subscribed_at AS 订阅时间 FROM subscribers ORDER BY subscribed_at DESC", headers: ["邮箱","来源","状态","订阅时间"] },
  returns: { query: "SELECT id AS 售后单号, order_id AS 订单号, email AS 邮箱, reason AS 原因, details AS 说明, status AS 状态, created_at AS 申请时间 FROM returns ORDER BY created_at DESC", headers: ["售后单号","订单号","邮箱","原因","说明","状态","申请时间"] },
  partnerships: { query: "SELECT id AS 受理编号, contact_name AS 联系人, phone AS 手机, company AS 公司门店, city AS 城市, cooperation_type AS 合作类型, wechat AS 微信号, email AS 邮箱, proposal AS 合作方案, status AS 状态, created_at AS 提交时间, updated_at AS 更新时间 FROM retail_partnerships ORDER BY created_at DESC", headers: ["受理编号","联系人","手机","公司门店","城市","合作类型","微信号","邮箱","合作方案","状态","提交时间","更新时间"] },
};

function cell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!await allowAdmin()) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "orders";
  const config = exports[type];
  if (!config) return Response.json({ error: "不支持的导出类型" }, { status: 400 });
  const db = await getStoreDb();
  const rows = await db.prepare(config.query).all<Record<string, unknown>>();
  const csv = `\uFEFF${config.headers.map(cell).join(",")}\r\n${rows.results.map((row) => config.headers.map((header) => cell(row[header])).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="PUSY-CN-${type}.csv"` } });
}
