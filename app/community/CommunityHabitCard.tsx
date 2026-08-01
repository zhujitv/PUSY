"use client";

import { useEffect, useState } from "react";
import type { getCommunityHabitSummary } from "../../lib/community/activity";

type HabitSummary = Awaited<ReturnType<typeof getCommunityHabitSummary>>;

export function CommunityHabitCard({ initialSummary }: { initialSummary: HabitSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/community/activity", { method: "POST", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (result?.summary) setSummary(result.summary); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return <section className="community-habit-card"><header><span>DAILY COMMUNITY</span><strong>连续活跃 {summary.streak} 天</strong><small>{summary.earnedBadges} 枚徽章</small></header><div>{summary.tasks.map((task) => <p className={task.completed ? "done" : ""} key={task.key}><i>{task.completed ? "✓" : "○"}</i><span>{task.title}<small>+{task.points} 积分</small></span></p>)}</div><footer>{summary.badges.filter((badge) => badge.earned).slice(0, 3).map((badge) => <em key={badge.key}>{badge.name}</em>)}</footer></section>;
}
