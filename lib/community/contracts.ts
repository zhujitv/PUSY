export const COMMUNITY_API_VERSION = "2026-08-01";
export const COMMUNITY_FEATURE_PHASE = 2;
export const COMMUNITY_MEDIA_LIMIT = 4;
export const COMMUNITY_MEDIA_BYTES = 450_000;
export const COMMUNITY_MEDIA_TOTAL_BYTES = 1_500_000;

export const communityPhaseTwoFeatures = {
  follows: { endpoint: "/api/community/follows", methods: ["GET", "POST", "DELETE"] },
  topics: { endpoint: "/api/community/topics", methods: ["GET", "POST"] },
  notifications: { endpoint: "/api/community/notifications", methods: ["GET", "PATCH"] },
} as const;

export type CommunityPhaseTwoFeature = keyof typeof communityPhaseTwoFeatures;

export function phaseTwoHeaders() {
  return {
    "cache-control": "private, no-store",
    "x-pusy-api-version": COMMUNITY_API_VERSION,
    "x-pusy-feature-phase": String(COMMUNITY_FEATURE_PHASE),
  };
}
