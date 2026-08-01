export type TaskAward = { member_id: number; points: number; balance_after: number };
export type DateParts = { year: number; month: number; day: number; key: string };

export function chinaDateParts(date = new Date()): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return { year, month, day, key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

export function previousDateKey(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function storedFromYuan(yuan: number) {
  return Math.round(yuan / 0.12);
}

export function taskReference(taskKey: string, periodKey: string) {
  return `${taskKey}:${periodKey}`.slice(0, 180);
}
