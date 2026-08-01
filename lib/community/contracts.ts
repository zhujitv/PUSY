export const COMMUNITY_API_VERSION = "2026-08-01";
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
    "x-pusy-feature-phase": "2",
  };
}

export function phaseTwoDisabled(feature: CommunityPhaseTwoFeature) {
  return Response.json({
    enabled: false,
    phase: 2,
    feature,
    endpoint: communityPhaseTwoFeatures[feature].endpoint,
    message: "该能力已预留接口，将在社区第二期启用",
  }, { status: 501, headers: phaseTwoHeaders() });
}
