import type { ContentComplianceFlag, ContentRightsStatus } from "./types";

type ComplianceInput = {
  sourceUrl?: string;
  originalText?: string;
  translatedTitle?: string;
  translatedText?: string;
  isTrusted?: boolean;
  rightsStatus?: ContentRightsStatus;
};

const privateIpv4 = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
const unsafeHost = /^(?:localhost|localhost\.|.*\.local)$/i;

function uniqueMatches(text: string, pattern: RegExp) {
  return [...new Set(Array.from(text.matchAll(pattern), (match) => match[0].trim()))].slice(0, 8);
}

export function isSafePublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (unsafeHost.test(hostname) || privateIpv4.test(hostname)) return false;
    if (["::", "::1"].includes(hostname) || hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) return false;
    return true;
  } catch {
    return false;
  }
}

export function scanContentCompliance(input: ComplianceInput): ContentComplianceFlag[] {
  const original = `${input.originalText ?? ""}`.trim();
  const translated = `${input.translatedTitle ?? ""}\n${input.translatedText ?? ""}`.trim();
  const publicCopy = translated || original;
  const flags: ContentComplianceFlag[] = [];

  if (!input.sourceUrl) {
    flags.push({ code: "missing_source", severity: "blocking", message: "缺少可追溯的原始内容链接。" });
  } else if (!isSafePublicHttpsUrl(input.sourceUrl)) {
    flags.push({ code: "unsafe_link", severity: "blocking", message: "来源链接不是允许采集的公开 HTTPS 地址。" });
  }
  if (!input.isTrusted) flags.push({ code: "untrusted_source", severity: "blocking", message: "该来源尚未被标记为可信官方来源。" });
  if (input.rightsStatus !== "authorized") flags.push({ code: "missing_rights", severity: "blocking", message: "缺少可用于中国官网的内容授权记录。" });
  if (!translated) flags.push({ code: "missing_translation", severity: "blocking", message: "候选内容尚未形成可审核的中文稿。" });

  const absoluteClaims = uniqueMatches(publicCopy, /(?:国家级|世界级|最高级|最佳|最好|第一|唯一|顶级|绝对|永久|百分之百|100\s*%|全网第一|零风险|无副作用)/gi);
  if (absoluteClaims.length) flags.push({ code: "absolute_claim", severity: "blocking", message: "包含可能违反广告规范的绝对化表述，必须人工核实或改写。", matches: absoluteClaims });

  const medicalClaims = uniqueMatches(publicCopy, /(?:治疗|治愈|疗效|处方|消炎|抗炎|杀菌|药妆|医美级|医疗级|修复\s*DNA|再生细胞|根治|祛除疾病)/gi);
  if (medicalClaims.length) flags.push({ code: "medical_claim", severity: "blocking", message: "包含医疗或疾病功效表述，化妆品内容发布前必须人工处理。", matches: medicalClaims });

  const durationClaims = uniqueMatches(publicCopy, /(?:持续|保持|见效|有效|定妆|锁妆|定型)[^。；;\n]{0,18}\b\d+(?:\.\d+)?\s*(?:分钟|小时|天|周|个月|年)/gi);
  if (durationClaims.length) flags.push({ code: "unsupported_duration_claim", severity: "warning", message: "包含量化时效或功效承诺，需要核对检测或品牌依据。", matches: durationClaims });

  const personalData = uniqueMatches(publicCopy, /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?<!\d)1[3-9]\d{9}(?!\d)|(?:微信|WeChat)\s*[:：]?\s*[A-Za-z][A-Za-z0-9_-]{5,19})/gi);
  if (personalData.length) flags.push({ code: "personal_data", severity: "warning", message: "正文可能包含邮箱、手机号或个人账号，发布前应确认是否为允许公开的品牌联系方式。", matches: personalData });

  return flags;
}

export function parseComplianceFlags(value: string | null | undefined): ContentComplianceFlag[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ContentComplianceFlag => Boolean(item && typeof item === "object" && "code" in item && "severity" in item));
  } catch {
    return [{ code: "missing_translation", severity: "blocking", message: "合规检查结果损坏，必须重新审核。" }];
  }
}

export function hasBlockingComplianceFlags(flags: ContentComplianceFlag[] | string | null | undefined) {
  const parsed = typeof flags === "string" || flags == null ? parseComplianceFlags(flags) : flags;
  return parsed.some((flag) => flag.severity === "blocking");
}

export function assertNoBlockingComplianceFlags(flags: ContentComplianceFlag[] | string | null | undefined) {
  const parsed = typeof flags === "string" || flags == null ? parseComplianceFlags(flags) : flags;
  const blocking = parsed.filter((flag) => flag.severity === "blocking");
  if (blocking.length) throw new Error(`内容仍有未解决的合规阻断项：${blocking.map((flag) => flag.message).join("；")}`);
}
