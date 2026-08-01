import type { AdminPermission } from "../../lib/admin-permissions";

export const adminNavGroups = [
  { label: "经营", items: [["overview", "经营总览", "⌂"], ["analytics", "经营分析", "↗"], ["orders", "订单管理", "▤"], ["invoices", "发票管理", "票"], ["support", "客服收件箱", "✉"], ["returns", "售后管理", "↩"], ["payments", "支付与退款", "¥"]] },
  { label: "商品与内容", items: [["products", "产品管理", "◇"], ["content", "内容运营", "✎"], ["community", "社区审核", "◫"], ["reviews", "评价审核", "☆"], ["marketing", "营销工具", "%"]] },
  { label: "客户", items: [["members", "会员管理", "◉"], ["growth", "会员增长", "↑"], ["subscribers", "订阅用户", "◎"], ["partnerships", "零售合作", "↗"]] },
  { label: "系统", items: [["notifications", "消息通知", "◌"], ["settings", "中国区设置", "⚙"], ["admins", "账号与权限", "◈"], ["audit", "操作日志", "◎"]] },
] as const;
export const tabPermissions: Record<string, AdminPermission> = { overview: "dashboard.read", analytics: "analytics.read", orders: "orders.read", invoices: "finance.read", support: "support.read", returns: "support.read", payments: "finance.read", products: "products.read", content: "content.manage", community: "community.read", reviews: "marketing.read", marketing: "marketing.read", members: "customers.read", growth: "marketing.read", subscribers: "marketing.read", partnerships: "marketing.read", notifications: "system.manage", settings: "system.manage", admins: "admins.manage", audit: "audit.read" };
export const adminTabMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "经营中心", title: "经营总览", description: "掌握销售、订单、库存和客户服务的实时状态" },
  analytics: { eyebrow: "数据洞察", title: "经营分析", description: "分析成交、复购、售后与热销商品，辅助经营决策" },
  orders: { eyebrow: "交易履约", title: "订单管理", description: "处理订单状态、配送进度与客户邮件沟通" },
  invoices: { eyebrow: "财税服务", title: "发票管理", description: "审核客户开票资料，管理电子发票的开具与交付" },
  support: { eyebrow: "客户体验", title: "客服收件箱", description: "集中处理客户来信、订单咨询与售后沟通" },
  returns: { eyebrow: "客户体验", title: "售后管理", description: "跟进退换货申请、处理状态和客户回复" },
  payments: { eyebrow: "财务交易", title: "支付与退款", description: "查看支付结果、退款记录与回调审计" },
  products: { eyebrow: "商品中心", title: "产品管理", description: "统一维护商品分类、资料、价格、库存与销售状态" },
  content: { eyebrow: "品牌运营", title: "内容运营", description: "管理商城公告、首页内容和营销表达" },
  reviews: { eyebrow: "内容治理", title: "评价审核", description: "审核商品评价并维护公开内容质量" },
  community: { eyebrow: "社区治理", title: "社区审核", description: "审核会员图文、处理用户举报并维护社区展示状态" },
  marketing: { eyebrow: "增长运营", title: "营销工具", description: "管理优惠码、礼品卡和促销资源" },
  members: { eyebrow: "客户资产", title: "会员管理", description: "查看会员档案、订单贡献和账户状态" },
  growth: { eyebrow: "会员增长", title: "会员与营销增长", description: "运营会员等级、积分、标签分组、定向优惠券和自动提醒" },
  subscribers: { eyebrow: "客户资产", title: "订阅用户", description: "管理邮件订阅关系与触达名单" },
  partnerships: { eyebrow: "渠道增长", title: "零售合作", description: "跟进经销、渠道及企业采购申请" },
  notifications: { eyebrow: "消息中心", title: "消息通知", description: "配置通知渠道、模板和发送任务" },
  settings: { eyebrow: "系统配置", title: "中国区设置", description: "检查经营主体、合规信息与支付准备状态" },
  admins: { eyebrow: "权限治理", title: "账号与权限", description: "为运营、客服、财务和仓库人员分配最小必要权限" },
  audit: { eyebrow: "安全治理", title: "操作审计日志", description: "追溯登录、订单、退款、客服和系统变更" },
};
export const searchPlaceholders: Record<string, string> = { orders: "搜索订单号、客户、邮箱或状态", invoices: "搜索发票、订单、客户或抬头", support: "搜索工单、主题、客户、订单或售后单", payments: "搜索交易号、订单号或客户", members: "搜索会员姓名、邮箱或手机号", products: "搜索商品名称、分类或状态", community: "搜索作者、内容、举报原因或审核状态", reviews: "搜索商品、评价人或内容", returns: "搜索售后单、订单号或客户邮箱", partnerships: "搜索申请人、公司、城市或合作类型", marketing: "搜索优惠码、礼品卡或订单号", subscribers: "搜索订阅邮箱或状态", notifications: "搜索任务、模板或接收人" };
