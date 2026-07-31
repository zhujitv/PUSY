export const supportPriorities = ["low", "normal", "high", "urgent"] as const;

export type SupportPriority = typeof supportPriorities[number];

export const supportSlaPolicy: Record<SupportPriority, { firstResponseHours: number; resolutionHours: number }> = {
  urgent: { firstResponseHours: 1, resolutionHours: 4 },
  high: { firstResponseHours: 4, resolutionHours: 24 },
  normal: { firstResponseHours: 8, resolutionHours: 48 },
  low: { firstResponseHours: 24, resolutionHours: 72 },
};

export function validSupportPriority(value: string): value is SupportPriority {
  return supportPriorities.includes(value as SupportPriority);
}

export function supportSlaDeadlines(priority: SupportPriority, startedAt: string | number | Date = new Date()) {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) throw new Error("SLA 起始时间无效");
  const policy = supportSlaPolicy[priority];
  return {
    firstResponseDueAt: new Date(start.getTime() + policy.firstResponseHours * 60 * 60 * 1000).toISOString(),
    resolutionDueAt: new Date(start.getTime() + policy.resolutionHours * 60 * 60 * 1000).toISOString(),
  };
}
