export const COMMUNITY_API_VERSION = "2026-08-07";
export const COMMUNITY_FEATURE_PHASE = 7;
export const COMMUNITY_MEDIA_LIMIT = 4;
export const COMMUNITY_MEDIA_BYTES = 450_000;
export const COMMUNITY_MEDIA_TOTAL_BYTES = 1_500_000;

export const communityPhaseTwoFeatures = {
  follows: { endpoint: "/api/community/follows", methods: ["GET", "POST", "DELETE"] },
  topics: { endpoint: "/api/community/topics", methods: ["GET", "POST", "DELETE"] },
  notifications: { endpoint: "/api/community/notifications", methods: ["GET", "PATCH"] },
} as const;

export const communityPhaseThreeFeatures = {
  interactions: { endpoint: "/api/community/posts/:id/interactions", methods: ["POST"] },
  comments: { endpoint: "/api/community/posts/:id/comments", methods: ["GET", "POST"] },
  commentManagement: { endpoint: "/api/community/comments/:id", methods: ["DELETE"] },
  reports: { endpoint: "/api/community/reports", methods: ["POST"] },
} as const;

export const communityPhaseFourFeatures = {
  discovery: { endpoint: "/api/community/posts", methods: ["GET"] },
  products: { endpoint: "/api/community/posts", methods: ["GET", "POST"] },
  commerceEvents: { endpoint: "/api/community/events", methods: ["POST"] },
  featuredContent: { endpoint: "/api/admin", methods: ["POST"] },
} as const;

export const communityPhaseFiveFeatures = {
  creatorWorkspace: { endpoint: "/community/creator", methods: ["GET"] },
  drafts: { endpoint: "/api/community/posts", methods: ["POST", "PATCH", "DELETE"] },
  campaigns: { endpoint: "/api/community/campaigns", methods: ["GET"] },
  creatorGovernance: { endpoint: "/api/admin", methods: ["POST"] },
} as const;

export const communityPhaseSixFeatures = {
  commentReactions: { endpoint: "/api/community/comments/:id/interactions", methods: ["POST"] },
  topicFollows: { endpoint: "/api/community/topics", methods: ["POST", "DELETE"] },
  activityHabits: { endpoint: "/api/community/activity", methods: ["POST"] },
  notificationPreferences: { endpoint: "/api/community/notifications", methods: ["PATCH"] },
  operationsCenter: { endpoint: "/api/admin", methods: ["GET", "POST"] },
} as const;

export const communityPhaseSevenFeatures = {
  purchaseShareTasks: { endpoint: "/community/publish", methods: ["GET", "POST"] },
  structuredExperience: { endpoint: "/api/community/posts", methods: ["GET", "POST"] },
  personalizedFeed: { endpoint: "/api/community/interests", methods: ["GET", "PATCH"] },
  shareAttribution: { endpoint: "/api/community/posts/:id/share-poster", methods: ["GET"] },
  conversionFunnel: { endpoint: "/api/admin", methods: ["GET"] },
} as const;

export type CommunityPhaseTwoFeature = keyof typeof communityPhaseTwoFeatures;
export type CommunityPhaseThreeFeature = keyof typeof communityPhaseThreeFeatures;
export type CommunityPhaseFourFeature = keyof typeof communityPhaseFourFeatures;
export type CommunityPhaseFiveFeature = keyof typeof communityPhaseFiveFeatures;
export type CommunityPhaseSixFeature = keyof typeof communityPhaseSixFeatures;
export type CommunityPhaseSevenFeature = keyof typeof communityPhaseSevenFeatures;

export function phaseTwoHeaders() {
  return {
    "cache-control": "private, no-store",
    "x-pusy-api-version": COMMUNITY_API_VERSION,
    "x-pusy-feature-phase": String(COMMUNITY_FEATURE_PHASE),
  };
}

export const phaseThreeHeaders = phaseTwoHeaders;
export const phaseFourHeaders = phaseThreeHeaders;
export const phaseFiveHeaders = phaseFourHeaders;
export const phaseSixHeaders = phaseFiveHeaders;
export const phaseSevenHeaders = phaseSixHeaders;
