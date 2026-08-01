export const reportReasons = ["spam", "abuse", "misinformation", "commercial", "other"] as const;

export function publicId(prefix: "CMT" | "RPT") {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}
