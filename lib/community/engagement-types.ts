export type CommunityComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  author_public_id: string;
  author_name: string;
  created_at: string;
  viewer_is_author: boolean;
  like_count: number;
  viewer_has_liked: boolean;
};

export type CommunityReport = {
  id: string;
  entity_type: "post" | "comment";
  entity_id: string;
  post_id: string;
  comment_id: string | null;
  reason: "spam" | "abuse" | "misinformation" | "commercial" | "other";
  detail: string;
  status: "pending" | "resolved" | "dismissed";
  resolution_note: string;
  reporter_name: string;
  target_author_name: string;
  target_excerpt: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};
