export const contentSourceStatuses = ["active", "paused", "revoked"] as const;
export type ContentSourceStatus = typeof contentSourceStatuses[number];

export const contentRightsStatuses = ["pending", "authorized", "revoked"] as const;
export type ContentRightsStatus = typeof contentRightsStatuses[number];

export const contentTranslationStatuses = ["pending", "translated", "review_required", "failed"] as const;
export type ContentTranslationStatus = typeof contentTranslationStatuses[number];

export const contentCandidateStatuses = [
  "fetched",
  "translating",
  "pending_review",
  "approved",
  "scheduled",
  "rejected",
  "published",
  "withdrawn",
  "failed",
] as const;
export type ContentCandidateStatus = typeof contentCandidateStatuses[number];

export const blogPostStatuses = ["draft", "scheduled", "published", "withdrawn"] as const;
export type BlogPostStatus = typeof blogPostStatuses[number];

export const ingestRunStatuses = ["running", "succeeded", "partial", "failed"] as const;
export type IngestRunStatus = typeof ingestRunStatuses[number];

export type JsonRecord = Record<string, unknown>;

export type ContentSource = {
  id: string;
  name: string;
  platform: string;
  account_url: string;
  feed_url: string;
  source_type: string;
  status: ContentSourceStatus;
  is_trusted: boolean;
  ingest_enabled: boolean;
  rights_status: ContentRightsStatus;
  rights_metadata_json: string;
  last_synced_at: string | null;
  error_text: string;
  created_at: string;
  updated_at: string;
};

export type ContentCandidate = {
  id: string;
  source_id: string;
  external_id: string;
  source_url: string;
  source_type: string;
  original_title: string;
  original_text: string;
  translated_title: string;
  translated_text: string;
  media_json: string;
  rights_json: string;
  product_refs_json: string;
  compliance_flags_json: string;
  translation_status: ContentTranslationStatus;
  status: ContentCandidateStatus;
  publish_at: string | null;
  published_at: string | null;
  rejected_reason: string;
  reviewed_by: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentCandidateEvent = {
  id: number;
  candidate_id: string;
  event_type: string;
  from_status: ContentCandidateStatus | null;
  to_status: ContentCandidateStatus | null;
  actor: string;
  details_json: string;
  created_at: string;
};

export type ContentIngestRun = {
  id: string;
  source_id: string;
  run_key: string;
  triggered_by: string;
  status: IngestRunStatus;
  discovered_count: number;
  imported_count: number;
  updated_count: number;
  failed_count: number;
  error_text: string;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogSection = [title: string, copy: string];

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  tag: string;
  cover_image_url: string;
  intro: string;
  sections_json: string;
  status: BlogPostStatus;
  publish_at: string | null;
  published_at: string | null;
  source_candidate_id: string;
  seo_description: string;
  withdrawn_at: string | null;
  withdrawn_by: string;
  withdrawal_reason: string;
  created_at: string;
  updated_at: string;
};

export type PublishedBlogPost = BlogPost & {
  sections: BlogSection[];
};

export type ContentComplianceSeverity = "warning" | "blocking";

export type ContentComplianceFlag = {
  code:
    | "absolute_claim"
    | "medical_claim"
    | "unsupported_duration_claim"
    | "missing_source"
    | "untrusted_source"
    | "missing_rights"
    | "personal_data"
    | "unsafe_link"
    | "missing_translation";
  severity: ContentComplianceSeverity;
  message: string;
  matches?: string[];
};

export type ContentCandidateInput = {
  sourceId: string;
  externalId: string;
  sourceUrl: string;
  sourceType?: string;
  originalTitle?: string;
  originalText: string;
  media?: unknown[];
  rights?: JsonRecord;
  productRefs?: string[];
  complianceFlags?: unknown[];
  translationStatus?: "pending" | "translated";
  status?: "pending_review";
  actor?: string;
};

export type BlogPostInput = {
  slug: string;
  title: string;
  tag: string;
  coverImageUrl: string;
  intro: string;
  sections: BlogSection[];
  seoDescription?: string;
};
