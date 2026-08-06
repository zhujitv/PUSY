"use client";

import Image from "next/image";
import { COMMUNITY_EXPERIENCE_SCENES, COMMUNITY_HIGHLIGHTS, COMMUNITY_SKIN_TYPES, COMMUNITY_USAGE_PERIODS, type CommunityExperience, type CommunityPurchaseShareTask } from "../../../lib/community/experience-contracts";

const skinNames = ["中性肌", "干性肌", "油性肌", "混合肌", "敏感肌"];
const periodNames = ["初次使用", "使用一周", "使用一个月", "使用三个月以上"];
const sceneNames = ["日常", "通勤", "约会", "旅行", "重要场合"];

export function PurchaseExperienceTemplate({ tasks, selectedTaskId, experience, onTask, onExperience }: {
  tasks: CommunityPurchaseShareTask[];
  selectedTaskId: number | null;
  experience: CommunityExperience;
  onTask: (task: CommunityPurchaseShareTask | null) => void;
  onExperience: (experience: CommunityExperience) => void;
}) {
  const available = tasks.filter((task) => task.status === "available");
  return <>
    {available.length > 0 && <fieldset className="community-purchase-tasks"><legend>已购分享任务 <small>选择真实订单商品，审核通过可获得已购分享积分</small></legend><div>{available.map((task) => <button type="button" className={selectedTaskId === task.id ? "selected" : ""} key={task.id} onClick={() => onTask(selectedTaskId === task.id ? null : task)}><Image src={task.productImage} alt="" width={62} height={62} unoptimized /><span><b>{task.productName}</b><small>{new Date(task.purchasedAt).toLocaleDateString("zh-CN")} 购入</small></span><i>{selectedTaskId === task.id ? "✓" : "去分享"}</i></button>)}</div></fieldset>}
    <fieldset className="community-experience-template"><legend>结构化体验卡 <small>选填；帮助其他会员快速判断是否适合</small></legend>
      <div className="community-experience-selects"><label>我的肤质<select value={experience.skinType} onChange={(event) => onExperience({ ...experience, skinType: event.target.value })}><option value="">未填写</option>{COMMUNITY_SKIN_TYPES.map((value, index) => <option value={value} key={value}>{skinNames[index]}</option>)}</select></label><label>使用周期<select value={experience.usagePeriod} onChange={(event) => onExperience({ ...experience, usagePeriod: event.target.value })}><option value="">未填写</option>{COMMUNITY_USAGE_PERIODS.map((value, index) => <option value={value} key={value}>{periodNames[index]}</option>)}</select></label><label>使用场景<select value={experience.scene} onChange={(event) => onExperience({ ...experience, scene: event.target.value })}><option value="">未填写</option>{COMMUNITY_EXPERIENCE_SCENES.map((value, index) => <option value={value} key={value}>{sceneNames[index]}</option>)}</select></label><label>总体评分<select value={experience.rating ?? ""} onChange={(event) => onExperience({ ...experience, rating: event.target.value ? Number(event.target.value) : null })}><option value="">未评分</option>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} 星</option>)}</select></label></div>
      <div className="community-experience-highlights"><span>体验亮点（最多 4 项）</span>{COMMUNITY_HIGHLIGHTS.map((item) => { const active = experience.highlights.includes(item); return <button type="button" className={active ? "active" : ""} key={item} onClick={() => onExperience({ ...experience, highlights: active ? experience.highlights.filter((value) => value !== item) : [...experience.highlights, item].slice(0, 4) })}>{item}</button>; })}</div>
      <label>使用提醒 <small>{experience.cautions.length} / 240</small><textarea rows={3} maxLength={240} value={experience.cautions} onChange={(event) => onExperience({ ...experience, cautions: event.target.value })} placeholder="例如：建议少量多次、敏感肌先局部试用…" /></label>
    </fieldset>
  </>;
}
