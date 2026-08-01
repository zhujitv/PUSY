import { parseCommunityProducts, type CommunityLinkedProduct, type CommunityPromotion } from "./commerce";
import type { CommunityTopic } from "./topics";

export type CommunityPostStatus = "draft" | "pending" | "approved" | "rejected" | "hidden";

export type CommunityPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  moderation_note: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_bio: string;
  author_account_type: "member" | "official";
  author_official_label: string;
  media_ids: string[];
  topics: Array<Pick<CommunityTopic, "id" | "slug" | "name">>;
  products: CommunityLinkedProduct[];
  promotion_placement: CommunityPromotion | "";
  promotion_rank: number;
  follower_count: number;
  viewer_is_following: boolean;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  viewer_has_liked: boolean;
  viewer_has_bookmarked: boolean;
  pagination_cursor?: string;
};

export type CommunityMember = {
  member_id: number;
  public_id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  account_type: "member" | "official";
  official_label: string;
  joined_at: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  viewer_is_following: boolean;
};

export type CommunityPostRow = Omit<CommunityPost, "media_ids" | "topics" | "products" | "pagination_cursor"> & {
  media_ids: unknown;
  topics: unknown;
  products: unknown;
  sort_placement: number;
  sort_time: string | Date;
  viewer_has_followed_topic: boolean;
};

export function mediaIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function serializePost(row: CommunityPostRow): CommunityPost {
  const post = Object.fromEntries(Object.entries(row).filter(([key]) => !["sort_placement", "sort_time", "viewer_has_followed_topic"].includes(key))) as Omit<CommunityPostRow, "sort_placement" | "sort_time" | "viewer_has_followed_topic">;
  let topics: CommunityPost["topics"] = [];
  const value = typeof row.topics === "string" ? (() => { try { return JSON.parse(row.topics); } catch { return []; } })() : row.topics;
  if (Array.isArray(value)) topics = value.filter((item) => item && typeof item === "object").map((item) => ({
    id: String((item as Record<string, unknown>).id ?? ""),
    slug: String((item as Record<string, unknown>).slug ?? ""),
    name: String((item as Record<string, unknown>).name ?? ""),
  })).filter((item) => item.id && item.slug && item.name).slice(0, 3);
  return {
    ...post,
    member_id: Number(row.member_id),
    media_ids: mediaIds(row.media_ids),
    topics,
    products: parseCommunityProducts(row.products),
    promotion_placement: row.promotion_placement === "pinned" || row.promotion_placement === "featured" ? row.promotion_placement : "",
    promotion_rank: Number(row.promotion_rank),
    follower_count: Number(row.follower_count),
    viewer_is_following: Boolean(row.viewer_is_following),
    like_count: Number(row.like_count),
    comment_count: Number(row.comment_count),
    bookmark_count: Number(row.bookmark_count),
    author_account_type: row.author_account_type === "official" ? "official" : "member",
    viewer_has_liked: Boolean(row.viewer_has_liked),
    viewer_has_bookmarked: Boolean(row.viewer_has_bookmarked),
  };
}

export function communityPostDto(post: CommunityPost, includeModeration = false) {
  const dto: Partial<CommunityPost> = { ...post };
  delete dto.member_id;
  if (!includeModeration) delete dto.moderation_note;
  return dto;
}

export function communityMemberDto(member: CommunityMember) {
  const dto: Partial<CommunityMember> = { ...member };
  delete dto.member_id;
  return dto;
}
