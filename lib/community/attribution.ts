import { getStoreDb } from "../../db/store";

export const COMMUNITY_SHARE_SOURCES = ["wechat", "copy_link", "community"] as const;
export type CommunityShareSource = typeof COMMUNITY_SHARE_SOURCES[number];
export type CommunityAttributionInput = { postId?: unknown; source?: unknown };

export function normalizeCommunityAttribution(input: CommunityAttributionInput | null | undefined) {
  const postId = String(input?.postId ?? "").trim().toUpperCase();
  const source = String(input?.source ?? "").trim().toLowerCase();
  if (!/^PST-[A-Z0-9]{12}$/.test(postId) || !COMMUNITY_SHARE_SOURCES.includes(source as CommunityShareSource)) return null;
  return { postId, source: source as CommunityShareSource };
}

export async function createCommunityOrderAttribution(input: {
  orderId: string;
  memberId?: number;
  totalFen: number;
  attribution: CommunityAttributionInput | null | undefined;
}) {
  const attribution = normalizeCommunityAttribution(input.attribution);
  if (!attribution) return false;
  const db = await getStoreDb();
  const post = await db.prepare("SELECT id FROM community_posts WHERE id = ? AND status = 'approved' LIMIT 1").bind(attribution.postId).first();
  if (!post) return false;
  await db.prepare(`
    INSERT INTO community_order_attributions (order_id, post_id, member_id, source, revenue_fen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO NOTHING
  `).bind(input.orderId, attribution.postId, input.memberId ?? null, attribution.source, Math.max(0, Math.round(input.totalFen))).run();
  return true;
}

export async function markCommunityOrderPaid(orderId: string) {
  const db = await getStoreDb();
  await db.prepare(`
    UPDATE community_order_attributions SET status = 'paid', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP::TEXT), updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ? AND status = 'created'
  `).bind(orderId).run();
}
