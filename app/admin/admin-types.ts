import type { AdminPermission, AdminRole } from "../../lib/admin-permissions";
import type { AdminReview, ContentRevision, SiteContent } from "./commerce-admin-types";
import type {
  ReturnEvent,
  SupportAgent,
  SupportCustomerOrder,
  SupportCustomerReturn,
  SupportMessage,
  SupportThread,
} from "./support-types";

export type AdminProduct = {
  id: number; slug: string; name: string; category: string; category_id?: number; description: string;
  image: string; image_alt?: string; badge?: string; price: number; old_price?: number; stock: number;
  low_stock_threshold: number; inventory_verified: number; sku?: string; volume?: string; ingredients?: string;
  usage?: string; status: string;
};
export type ProductCategory = {
  id: number; name: string; slug: string; parent_id?: number | null; parent_name?: string | null;
  description: string; sort_order: number; status: "active" | "disabled"; product_count: number;
};
export type AdminInvoice = {
  id: string; order_id: string; member_id: number; customer: string; customer_email: string;
  invoice_type: "personal" | "company"; title: string; tax_number: string; recipient_email: string;
  amount: number; status: "pending" | "processing" | "issued" | "rejected" | "cancelled";
  invoice_number: string; file_url: string; rejection_reason: string; admin_note: string;
  requested_at: string; issued_at?: string;
};
export type AnalyticsData = {
  orderStatuses: Array<{ status: string; count: number; revenue: number }>;
  topProducts: Array<{ product_slug: string; product_name: string; quantity: number; revenue: number }>;
  customers: { new_members_30d?: number; repeat_members?: number; purchasing_members?: number; total_members?: number };
  returns: { total_returns?: number; returns_30d?: number; refund_returns?: number };
};
export type CommunityModerationPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  author_name: string;
  author_account_type: "member" | "official";
  author_official_label: string;
  creator_status: "active" | "restricted";
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  moderation_note: string;
  moderated_by?: string;
  moderated_at?: string;
  published_at?: string;
  created_at: string;
  media_ids: string[];
  products: Array<{ slug: string; name: string; image: string; price: number; verified_purchase: boolean }>;
  promotion_placement: "featured" | "pinned" | "";
  promotion_rank: number;
  promotion_note: string;
  impression_count: number;
  product_click_count: number;
  add_to_cart_count: number;
  campaign_title: string;
  campaign_entry_status: string;
};
export type CommunityInsights = {
  summary: { impressions: number; productClicks: number; addToCarts: number; measuredPosts: number };
  products: Array<{ productSlug: string; productName: string; productClicks: number; addToCarts: number }>;
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
export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  status: "active" | "disabled";
  last_login_at?: string;
  created_at: string;
  updated_at: string;
};
export type AdminAuditLog = {
  id: number;
  admin_id: string;
  actor_email: string;
  actor_role: AdminRole;
  action: string;
  entity_id: string;
  summary: string;
  request_ip: string;
  outcome: "attempted" | "succeeded" | "failed";
  error_text: string;
  created_at: string;
};
export type GrowthMember = { id: number; name: string; email: string; phone: string; status: string; total_orders: number; total_spent: number; points_balance: number; lifetime_points: number; tier: string; tags: string; tag_ids: string; email_marketing: number; sms_marketing: number };
export type GrowthTag = { id: number; name: string; color: string; description: string; member_count: number };
export type GrowthSegment = { id: number; name: string; description: string; filter_json: string; updated_at: string };
export type CouponAssignment = { id: number; coupon_id: number; member_id: number; code: string; member_name: string; email: string; status: string; assigned_at: string; used_at?: string };
export type AutomationRun = { id: string; automation_key: string; status: string; matched_count: number; queued_count: number; error_text: string; started_at: string; finished_at?: string };
export type GrowthData = { members: GrowthMember[]; tags: GrowthTag[]; segments: GrowthSegment[]; couponAssignments: CouponAssignment[]; automationRuns: AutomationRun[]; stats: { total_members?: number; silver_members?: number; gold_members?: number; diamond_members?: number; points_outstanding?: number } };
export type CommunityAdminComment = { id: string; post_id: string; body: string; status: "visible" | "hidden" | "deleted"; created_at: string; author_public_id: string; author_name: string; post_title: string; like_count: number; pending_reports: number };
export type CommunityAdminMember = { member_id: number; public_id: string; display_name: string; account_type: "member" | "official"; creator_status: "active" | "restricted"; comment_status: "active" | "restricted"; restricted_until: string | null; restriction_note: string; member_status: string; post_count: number; comment_count: number; follower_count: number; violation_count: number };
export type CommunityAdminTopic = { id: string; slug: string; name: string; description: string; status: "draft" | "active" | "archived"; sort_order: number; featured: number; post_count: number; follower_count: number; viewer_is_following: boolean };
export type CommunityAdminCampaign = { id: string; slug: string; title: string; description: string; rules: string; topic_slug: string; topic_name: string; product_slug: string; reward_points: number; status: "draft" | "active" | "ended"; starts_at: string | null; ends_at: string | null; entry_count: number };
export type CommunityAdminBroadcast = { id: string; title: string; body: string; target: "all" | "active" | "creators"; recipient_count: number; created_by: string; created_at: string };
export type CommunityOperationsData = { metrics: { dau: number; wau: number; mau: number; interactions30d: number; returning7d: number; retention7d: number }; comments: CommunityAdminComment[]; members: CommunityAdminMember[]; topics: CommunityAdminTopic[]; campaigns: CommunityAdminCampaign[]; broadcasts: CommunityAdminBroadcast[] };

export type AdminOrder = { id: string; member_id?: number; customer: string; email: string; phone: string; address: string; delivery: string; payment: string; total: number; status: string; item_count: number; has_physical_items: boolean; created_at: string };
export type OrderItem = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
export type AdminMember = { id: number; name: string; email: string; phone: string; status: string; total_orders: number; total_spent: number; points_balance: number; lifetime_points: number; tier: string; joined_at: string };
export type Subscriber = { id: number; email: string; source: string; status: string; subscribed_at: string };
export type AdminReturn = { id: string; order_id: string; email: string; reason: string; details: string; status: string; request_type: string; items_json?: string; refund_id?: string; requested_amount_fen?: number; return_carrier?: string; return_tracking_number?: string; resolution?: string; support_thread_id?: string; attachments_json?: string; created_at: string };
export type RetailPartnership = { id: string; contact_name: string; phone: string; company: string; city: string; cooperation_type: string; wechat: string; email: string; proposal: string; status: string; created_at: string; updated_at: string };
export type Coupon = { id: number; code: string; kind: string; value: number; minimum: number; usage_limit: number; used_count: number; status: string; assignment_mode: string; starts_at?: string; ends_at?: string };
export type GiftCard = { code: string; order_id: string; initial_balance: number; balance: number; recipient_name: string; recipient_email: string; delivery_date?: string; status: string; created_at: string };
export type TrendPoint = { day: string; revenue: number; orders: number };
export type PaymentProvider = { provider: "wechat" | "alipay"; display_name: string; enabled: number; mode: string; app_id: string; merchant_id: string; public_key_id: string; certificate_serial: string; configured: boolean; missing: string[]; secrets: { privateKey: boolean; publicKey: boolean; apiV3Key?: boolean } };
export type AdminPayment = { id: string; order_id: string; provider: "wechat" | "alipay"; merchant_trade_no: string; provider_transaction_id?: string; amount_fen: number; wallet_amount_fen: number; external_amount_fen: number; wallet_status: string; status: string; attempts: number; last_error?: string; customer: string; email: string; created_at: string; updated_at: string };
export type AdminRefund = { id: string; payment_id: string; order_id: string; provider: "wechat" | "alipay"; merchant_refund_no: string; provider_refund_id?: string; amount_fen: number; wallet_amount_fen: number; external_amount_fen: number; reason: string; status: string; attempts: number; last_error?: string; created_at: string; updated_at: string };
export type AdminWallet = { member_id: number; name: string; email: string; available_balance_fen: number; frozen_balance_fen: number; status: string; payment_password_set: boolean };
export type PaymentEvent = { id: string; payment_id?: string; provider: string; event_type: string; verified: number; result: string; message?: string; created_at: string };
export type Shipment = { id: string; order_id: string; carrier_code: string; carrier_name: string; tracking_number: string; status: string; tracking_url: string; shipped_at: string };
export type ShipmentEvent = { id: number; shipment_id: string; event_time: string; status: string; description: string; location: string };
export type ReconciliationItem = { payment_id: string; order_id: string; provider: string; merchant_trade_no: string; provider_transaction_id?: string; payment_status: string; order_status: string; amount_fen: number; external_amount_fen: number; succeeded_refund_fen: number; pending_refund_fen: number; net_fen: number; updated_at: string; anomalies: string[] };
export type Reconciliation = { items: ReconciliationItem[]; summary: { paymentCount: number; paidFen: number; refundedFen: number; netFen: number; anomalyCount: number } };
export type ChinaRegionSettings = { market: string; currency: string; locale: string; timeZone: string; domain: string; supportEmail: string; operatorName: string; unifiedSocialCreditCode: string; registeredAddress: string; customerServicePhone: string; icpNumber: string; publicSecurityNumber: string; privacyEmail: string; updatedAt: string; complianceReady: boolean };
export type NotificationSetting = { channel: "email" | "sms"; display_name: string; enabled: number; provider: string; sender_name: string; sender_address: string; configured: boolean; secretInstalled: boolean };
export type NotificationTemplate = { key: string; name: string; email_subject: string; email_body: string; sms_body: string; enabled: number; updated_at: string };
export type NotificationJob = { id: string; event_key: string; entity_type: string; entity_id: string; template_key: string; channel: string; recipient: string; status: string; attempts: number; scheduled_at: string; next_retry_at?: string; provider_message_id?: string; last_error?: string; sent_at?: string; created_at: string };
export type AdminViewer = { id: string; email: string; displayName: string; role: AdminRole; permissions: AdminPermission[] };
export type AdminData = { viewer: AdminViewer; products: AdminProduct[]; productCategories: ProductCategory[]; orders: AdminOrder[]; orderItems: OrderItem[]; members: AdminMember[]; subscribers: Subscriber[]; returns: AdminReturn[]; retailPartnerships: RetailPartnership[]; coupons: Coupon[]; giftCards: GiftCard[]; providers: PaymentProvider[]; payments: AdminPayment[]; refunds: AdminRefund[]; paymentEvents: PaymentEvent[]; wallets: AdminWallet[]; shipments: Shipment[]; shipmentEvents: ShipmentEvent[]; reconciliation: Reconciliation; notificationSettings: NotificationSetting[]; notificationTemplates: NotificationTemplate[]; notificationJobs: NotificationJob[]; reviews: AdminReview[]; communityPosts: CommunityModerationPost[]; communityReports: CommunityReport[]; communityInsights: CommunityInsights; communityOperations: CommunityOperationsData; content: SiteContent; contentRevisions: ContentRevision[]; supportThreads: SupportThread[]; supportMessages: SupportMessage[]; returnEvents: ReturnEvent[]; supportAgents: SupportAgent[]; supportCustomerOrders: SupportCustomerOrder[]; supportCustomerReturns: SupportCustomerReturn[]; invoices: AdminInvoice[]; cannedReplies: Array<{ id: number; title: string; content: string }>; analytics: AnalyticsData; supportReceiving: { domain: string; configured: boolean }; region: ChinaRegionSettings; adminUsers: AdminUser[]; auditLogs: AdminAuditLog[]; revenueTrend: TrendPoint[]; growth: GrowthData; stats: { order_count: number; revenue: number; pending_count: number; avg_order_value: number; low_stock_count: number; unverified_inventory_count: number; active_subscribers: number; pending_returns: number; pending_partnerships: number; unread_support: number } };
