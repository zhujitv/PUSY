import { runGrowthAutomations } from "../../growth/automations";
import { adjustMemberPoints } from "../../growth/loyalty";

const yuanToStored = (value: unknown) => Math.round(Number(value) / 0.12);
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleGrowthMarketingAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db } = context;
  if (action === "adjust-member-points") {
      const points = Math.round(Number(payload.points));
      const reason = String(payload.reason ?? "").trim().slice(0, 120);
      if (!Number.isInteger(points) || !points || !reason) return Response.json({ error: "请填写有效的积分数值和调整原因" }, { status: 400 });
      await adjustMemberPoints(Number(payload.memberId), points, reason);
    } else if (action === "create-customer-tag") {
      const name = String(payload.name ?? "").trim().slice(0, 40);
      const color = String(payload.color ?? "#ef398b");
      const description = String(payload.description ?? "").trim().slice(0, 160);
      if (!name || !/^#[0-9a-f]{6}$/i.test(color)) return Response.json({ error: "请填写有效的标签名称和颜色" }, { status: 400 });
      await db.prepare("INSERT INTO customer_tags (name, color, description) VALUES (?, ?, ?)").bind(name, color, description).run();
    } else if (action === "assign-member-tag") {
      const memberId = Number(payload.memberId);
      const tagId = Number(payload.tagId);
      if (!Number.isInteger(memberId) || !Number.isInteger(tagId)) return Response.json({ error: "会员或标签无效" }, { status: 400 });
      if (payload.assigned === false) await db.prepare("DELETE FROM member_tag_assignments WHERE member_id = ? AND tag_id = ?").bind(memberId, tagId).run();
      else await db.prepare("INSERT INTO member_tag_assignments (member_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING").bind(memberId, tagId).run();
    } else if (action === "create-customer-segment") {
      const name = String(payload.name ?? "").trim().slice(0, 60);
      const description = String(payload.description ?? "").trim().slice(0, 200);
      const tier = String(payload.tier ?? "all");
      const tagId = Number(payload.tagId ?? 0);
      const minSpentYuan = Math.max(0, Number(payload.minSpentYuan ?? 0));
      if (!name || !["all", "bronze", "silver", "gold", "diamond"].includes(tier)) return Response.json({ error: "客户分组条件无效" }, { status: 400 });
      await db.prepare("INSERT INTO customer_segments (name, description, filter_json) VALUES (?, ?, ?)").bind(name, description, JSON.stringify({ tier, tagId: tagId || null, minSpent: yuanToStored(minSpentYuan), marketingOnly: true })).run();
    } else if (action === "issue-targeted-coupon") {
      const code = String(payload.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const kind = String(payload.kind ?? "percent");
      const value = kind === "fixed" ? yuanToStored(payload.value) : Math.round(Number(payload.value));
      const minimum = Math.max(0, yuanToStored(payload.minimum ?? 0));
      let tier = String(payload.tier ?? "all");
      let tagId = Math.max(0, Number(payload.tagId ?? 0));
      let minimumSpent = 0;
      const segmentId = Math.max(0, Number(payload.segmentId ?? 0));
      if (segmentId) {
        const segment = await db.prepare("SELECT filter_json FROM customer_segments WHERE id = ? LIMIT 1").bind(segmentId).first<{ filter_json: string }>();
        if (!segment) return Response.json({ error: "客户分组不存在" }, { status: 404 });
        const filter = JSON.parse(segment.filter_json) as { tier?: string; tagId?: number | null; minSpent?: number };
        tier = String(filter.tier ?? "all");
        tagId = Math.max(0, Number(filter.tagId ?? 0));
        minimumSpent = Math.max(0, Number(filter.minSpent ?? 0));
      }
      const rawEndsAt = String(payload.endsAt ?? "").trim();
      const endsAt = rawEndsAt && !Number.isNaN(Date.parse(rawEndsAt)) ? new Date(rawEndsAt).toISOString() : null;
      if (rawEndsAt && !endsAt) return Response.json({ error: "优惠券有效期无效" }, { status: 400 });
      if (!code || !["percent", "fixed"].includes(kind) || !Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) return Response.json({ error: "请填写有效的专属优惠券" }, { status: 400 });
      const audience = await db.prepare(`SELECT DISTINCT m.id, m.name, m.email, m.phone, COALESCE(mp.email_marketing, 0) AS email_marketing, COALESCE(mp.sms_marketing, 0) AS sms_marketing
        FROM members m LEFT JOIN member_profiles mp ON mp.member_id = m.id
        LEFT JOIN member_tag_assignments mta ON mta.member_id = m.id
        WHERE m.status != 'blocked' AND (? = 'all' OR m.tier = ?) AND (? = 0 OR mta.tag_id = ?) AND m.total_spent >= ?
        ORDER BY m.id LIMIT 1000`).bind(tier, tier, tagId, tagId, minimumSpent).all<{ id: number; name: string; email: string; phone: string; email_marketing: number; sms_marketing: number }>();
      if (!audience.results.length) return Response.json({ error: "当前定向条件下没有会员" }, { status: 400 });
      const coupon = await db.prepare("INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, assignment_mode, ends_at) VALUES (?, ?, ?, ?, ?, 'active', 'targeted', ?) RETURNING id").bind(code, kind, value, minimum, audience.results.length, endsAt).first<{ id: number }>();
      if (!coupon) throw new Error("专属优惠券创建失败");
      await db.batch(audience.results.map((member) => db.prepare("INSERT INTO coupon_assignments (coupon_id, member_id) VALUES (?, ?)").bind(coupon.id, member.id)));
      const benefit = kind === "percent" ? `${value}% 折扣` : `减 ${Number(payload.value).toFixed(2)} 元`;
      for (const member of audience.results) await (await import("../../notifications/service")).enqueueNotification({ eventKey: `targeted-coupon:${coupon.id}:${member.id}`, entityType: "member", entityId: String(member.id), templateKey: "targeted_coupon", email: member.email_marketing ? member.email : undefined, phone: member.sms_marketing ? member.phone : undefined, payload: { customer: member.name, couponCode: code, benefit, condition: minimum ? `满 ${Number(payload.minimum).toFixed(2)} 元可用` : "无门槛", endsAt: endsAt ? new Date(endsAt).toLocaleDateString("zh-CN") : "长期有效" } });
    } else if (action === "run-growth-automations") {
      const results = await runGrowthAutomations();
      return Response.json({ ok: true, results });
    } else if (action === "create-coupon") {
      const code = String(payload.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const kind = String(payload.kind ?? "percent");
      const value = kind === "fixed" ? yuanToStored(payload.value) : Math.round(Number(payload.value));
      const minimum = Math.max(0, yuanToStored(payload.minimum ?? 0));
      const usageLimit = Math.max(0, Math.round(Number(payload.usageLimit ?? 0)));
      if (!code || !["percent", "fixed"].includes(kind) || !Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) return Response.json({ error: "请填写有效的优惠码和优惠额度" }, { status: 400 });
      await db.prepare("INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)").bind(code, kind, value, minimum, usageLimit, String(payload.startsAt ?? "") || null, String(payload.endsAt ?? "") || null).run();
    } else if (action === "update-coupon-status") {
      const status = String(payload.status ?? "");
      if (!["active", "disabled"].includes(status)) return Response.json({ error: "优惠码状态无效" }, { status: 400 });
      await db.prepare("UPDATE coupons SET status = ? WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-gift-card-status") {
      const status = String(payload.status ?? "");
      if (!["active", "used", "void"].includes(status)) return Response.json({ error: "礼品卡状态无效" }, { status: 400 });
      await db.prepare("UPDATE gift_cards SET status = ? WHERE code = ?").bind(status, String(payload.code)).run();
  } else return false;
  return true;
}
