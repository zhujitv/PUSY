export const chinaRegion = {
  market: "中国大陆",
  currency: "人民币（CNY）",
  locale: "zh-CN",
  timeZone: "Asia/Shanghai",
  domain: "PUSY.CN",
  supportEmail: process.env.CHINA_SUPPORT_EMAIL || "help@PUSY.CN",
  operatorName: process.env.CHINA_OPERATOR_NAME || "待补充中国运营主体名称",
  unifiedSocialCreditCode: process.env.CHINA_UNIFIED_SOCIAL_CREDIT_CODE || "待补充统一社会信用代码",
  registeredAddress: process.env.CHINA_REGISTERED_ADDRESS || "待补充中国运营主体注册地址",
  customerServicePhone: process.env.CHINA_CUSTOMER_SERVICE_PHONE || "待补充中国客服电话",
  icpNumber: process.env.CHINA_ICP_NUMBER || "待取得ICP备案号",
  publicSecurityNumber: process.env.CHINA_PUBLIC_SECURITY_NUMBER || "待取得公安联网备案号",
  privacyEmail: process.env.CHINA_PRIVACY_EMAIL || process.env.CHINA_SUPPORT_EMAIL || "help@PUSY.CN",
  updatedAt: "2026年7月28日",
} as const;

export const chinaComplianceReady = ![
  chinaRegion.operatorName,
  chinaRegion.unifiedSocialCreditCode,
  chinaRegion.registeredAddress,
  chinaRegion.customerServicePhone,
  chinaRegion.icpNumber,
].some((value) => value.startsWith("待"));
