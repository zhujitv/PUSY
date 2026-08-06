import type { CommunityExperience } from "../../lib/community/experience-contracts";

const skinNames: Record<string, string> = { normal: "中性肌", dry: "干性肌", oily: "油性肌", combination: "混合肌", sensitive: "敏感肌" };
const periodNames: Record<string, string> = { "first-use": "初次使用", "one-week": "使用一周", "one-month": "使用一个月", "three-months-plus": "使用三个月以上" };
const sceneNames: Record<string, string> = { daily: "日常", work: "通勤", date: "约会", travel: "旅行", "special-occasion": "重要场合" };

export function CommunityExperienceSummary({ experience }: { experience: CommunityExperience }) {
  if (!experience.skinType && !experience.usagePeriod && !experience.scene && !experience.rating && !experience.highlights.length && !experience.cautions) return null;
  return <section className="community-experience-summary" aria-label="结构化使用体验"><header><span>真实体验卡</span>{experience.rating && <strong>{"★".repeat(experience.rating)}<i>{experience.rating}.0</i></strong>}</header><div>{experience.skinType && <small>{skinNames[experience.skinType]}</small>}{experience.usagePeriod && <small>{periodNames[experience.usagePeriod]}</small>}{experience.scene && <small>{sceneNames[experience.scene]}</small>}{experience.highlights.map((item) => <small key={item}>{item}</small>)}</div>{experience.cautions && <p><b>使用提醒</b>{experience.cautions}</p>}</section>;
}
