import { sql } from "drizzle-orm";
import { customType, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  categoryId: integer("category_id"),
  description: text("description").notNull().default(""),
  image: text("image").notNull(),
  imageAlt: text("image_alt"),
  badge: text("badge"),
  price: integer("price").notNull(),
  oldPrice: integer("old_price"),
  stock: integer("stock").notNull().default(0),
  inventoryVerified: integer("inventory_verified").notNull().default(0),
  imagesJson: text("images_json").notNull().default("[]"),
  variantsJson: text("variants_json").notNull().default("[]"),
  sku: text("sku"),
  volume: text("volume"),
  ingredients: text("ingredients"),
  usage: text("usage"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id"),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("active"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberVerificationCodes = pgTable("member_verification_codes", {
  id: text("id").primaryKey(),
  target: text("target").notNull(),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberSessions = pgTable("member_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberCredentials = pgTable("member_credentials", {
  memberId: integer("member_id").primaryKey().references(() => members.id),
  loginPasswordHash: text("login_password_hash").notNull(),
  loginPasswordSalt: text("login_password_salt").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberWallets = pgTable("member_wallets", {
  memberId: integer("member_id").primaryKey().references(() => members.id),
  availableBalanceFen: integer("available_balance_fen").notNull().default(0),
  frozenBalanceFen: integer("frozen_balance_fen").notNull().default(0),
  status: text("status").notNull().default("active"),
  paymentPasswordHash: text("payment_password_hash"),
  paymentPasswordSalt: text("payment_password_salt"),
  passwordFailedAttempts: integer("password_failed_attempts").notNull().default(0),
  passwordLockedUntil: text("password_locked_until"),
  passwordUpdatedAt: text("password_updated_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberProfiles = pgTable("member_profiles", {
  memberId: integer("member_id").primaryKey().references(() => members.id),
  nickname: text("nickname").notNull().default(""),
  gender: text("gender").notNull().default(""),
  birthday: text("birthday").notNull().default(""),
  wechat: text("wechat").notNull().default(""),
  province: text("province").notNull().default(""),
  city: text("city").notNull().default(""),
  occupation: text("occupation").notNull().default(""),
  skinType: text("skin_type").notNull().default(""),
  skinConcerns: text("skin_concerns").notNull().default("[]"),
  preferredCategories: text("preferred_categories").notNull().default("[]"),
  bio: text("bio").notNull().default(""),
  emailMarketing: integer("email_marketing").notNull().default(0),
  smsMarketing: integer("sms_marketing").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberAddresses = pgTable("member_addresses", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  label: text("label").notNull().default("家"),
  recipient: text("recipient").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull().default(""),
  detail: text("detail").notNull(),
  postcode: text("postcode").notNull().default(""),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  customer: text("customer").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  delivery: text("delivery").notNull(),
  payment: text("payment").notNull(),
  total: integer("total").notNull(),
  discount: integer("discount").notNull().default(0),
  couponCode: text("coupon_code"),
  paymentTokenHash: text("payment_token_hash").notNull().default(""),
  reservationExpiresAt: text("reservation_expires_at"),
  resourcesReleased: integer("resources_released").notNull().default(0),
  resourcesCommitted: integer("resources_committed").notNull().default(0),
  status: text("status").notNull().default("待付款"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("active"),
  subscribedAt: text("subscribed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const retailPartnerships = pgTable("retail_partnerships", {
  id: text("id").primaryKey(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  company: text("company").notNull(),
  city: text("city").notNull(),
  cooperationType: text("cooperation_type").notNull(),
  wechat: text("wechat").notNull().default(""),
  email: text("email").notNull().default(""),
  proposal: text("proposal").notNull(),
  status: text("status").notNull().default("待联系"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull().default("percent"),
  value: integer("value").notNull(),
  minimum: integer("minimum").notNull().default(0),
  usageLimit: integer("usage_limit").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const returns = pgTable("returns", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  email: text("email").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("待审核"),
  supportThreadId: text("support_thread_id"),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportThreads = pgTable("support_threads", {
  id: text("id").primaryKey(),
  mailbox: text("mailbox").notNull().default("service"),
  subject: text("subject").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull().default(""),
  memberId: integer("member_id").references(() => members.id),
  orderId: text("order_id").references(() => orders.id),
  returnId: text("return_id").references(() => returns.id),
  status: text("status").notNull().default("unread"),
  priority: text("priority").notNull().default("normal"),
  assignedTo: text("assigned_to"),
  assignedAdminId: text("assigned_admin_id"),
  starred: integer("starred").notNull().default(0),
  archivedAt: text("archived_at"),
  deletedAt: text("deleted_at"),
  dueAt: text("due_at"),
  firstResponseDueAt: text("first_response_due_at"),
  resolutionDueAt: text("resolution_due_at"),
  firstRespondedAt: text("first_responded_at"),
  resolvedAt: text("resolved_at"),
  reopenedCount: integer("reopened_count").notNull().default(0),
  lastMessageAt: text("last_message_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportCannedReplies = pgTable("support_canned_replies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique().references(() => orders.id),
  memberId: integer("member_id").notNull().references(() => members.id),
  invoiceType: text("invoice_type").notNull().default("personal"),
  title: text("title").notNull(),
  taxNumber: text("tax_number").notNull().default(""),
  recipientEmail: text("recipient_email").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  invoiceNumber: text("invoice_number").notNull().default(""),
  fileUrl: text("file_url").notNull().default(""),
  rejectionReason: text("rejection_reason").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  issuedAt: text("issued_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportMessages = pgTable("support_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => supportThreads.id),
  direction: text("direction").notNull(),
  source: text("source").notNull().default("email"),
  providerEmailId: text("provider_email_id").unique(),
  providerMessageId: text("provider_message_id"),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull().default(""),
  textBody: text("text_body").notNull().default(""),
  htmlBody: text("html_body").notNull().default(""),
  headersJson: text("headers_json").notNull().default("{}"),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const returnEvents = pgTable("return_events", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => returns.id),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("system"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const giftCards = pgTable("gift_cards", {
  code: text("code").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  initialBalance: integer("initial_balance").notNull(),
  balance: integer("balance").notNull(),
  recipientName: text("recipient_name").notNull().default(""),
  recipientEmail: text("recipient_email").notNull().default(""),
  message: text("message").notNull().default(""),
  deliveryDate: text("delivery_date"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentProviders = pgTable("payment_providers", {
  provider: text("provider").primaryKey(),
  displayName: text("display_name").notNull(),
  enabled: integer("enabled").notNull().default(0),
  mode: text("mode").notNull().default("production"),
  appId: text("app_id").notNull().default(""),
  merchantId: text("merchant_id").notNull().default(""),
  publicKeyId: text("public_key_id").notNull().default(""),
  certificateSerial: text("certificate_serial").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  merchantTradeNo: text("merchant_trade_no").notNull().unique(),
  providerTransactionId: text("provider_transaction_id"),
  amountFen: integer("amount_fen").notNull(),
  walletAmountFen: integer("wallet_amount_fen").notNull().default(0),
  externalAmountFen: integer("external_amount_fen").notNull().default(0),
  walletStatus: text("wallet_status").notNull().default("none"),
  status: text("status").notNull().default("created"),
  checkoutUrl: text("checkout_url"),
  codeUrl: text("code_url"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: text("next_retry_at"),
  lastError: text("last_error"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").references(() => payments.id),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payloadDigest: text("payload_digest").notNull(),
  verified: integer("verified").notNull().default(0),
  result: text("result").notNull(),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const refunds = pgTable("refunds", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => payments.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  merchantRefundNo: text("merchant_refund_no").notNull().unique(),
  providerRefundId: text("provider_refund_id"),
  amountFen: integer("amount_fen").notNull(),
  walletAmountFen: integer("wallet_amount_fen").notNull().default(0),
  externalAmountFen: integer("external_amount_fen").notNull().default(0),
  walletCredited: integer("wallet_credited").notNull().default(0),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: text("next_retry_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberWalletLedger = pgTable("member_wallet_ledger", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  paymentId: text("payment_id").references(() => payments.id),
  orderId: text("order_id").references(() => orders.id),
  entryType: text("entry_type").notNull(),
  amountFen: integer("amount_fen").notNull(),
  availableBalanceAfterFen: integer("available_balance_after_fen").notNull(),
  frozenBalanceAfterFen: integer("frozen_balance_after_fen").notNull(),
  referenceId: text("reference_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("system"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationSettings = pgTable("notification_settings", {
  channel: text("channel").primaryKey(),
  displayName: text("display_name").notNull(),
  enabled: integer("enabled").notNull().default(0),
  provider: text("provider").notNull(),
  senderName: text("sender_name").notNull().default("PUSY.CN"),
  senderAddress: text("sender_address").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationTemplates = pgTable("notification_templates", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  emailSubject: text("email_subject").notNull().default(""),
  emailBody: text("email_body").notNull().default(""),
  smsBody: text("sms_body").notNull().default(""),
  enabled: integer("enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationJobs = pgTable("notification_jobs", {
  id: text("id").primaryKey(),
  eventKey: text("event_key").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  templateKey: text("template_key").notNull().references(() => notificationTemplates.key),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  scheduledAt: text("scheduled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  nextRetryAt: text("next_retry_at"),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationDeliveryEvents = pgTable("notification_delivery_events", {
  id: text("id").primaryKey(),
  providerMessageId: text("provider_message_id").notNull(),
  eventType: text("event_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityProfiles = pgTable("community_profiles", {
  memberId: integer("member_id").primaryKey().references(() => members.id),
  publicId: text("public_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  status: text("status").notNull().default("active"),
  accountType: text("account_type").notNull().default("member"),
  officialLabel: text("official_label").notNull().default(""),
  creatorStatus: text("creator_status").notNull().default("active"),
  rewardBlockedAt: text("reward_blocked_at"),
  commentStatus: text("comment_status").notNull().default("active"),
  restrictedUntil: text("restricted_until"),
  restrictionNote: text("restriction_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  clientRequestId: text("client_request_id").notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  moderationNote: text("moderation_note").notNull().default(""),
  moderatedBy: text("moderated_by"),
  moderatedAt: text("moderated_at"),
  publishedAt: text("published_at"),
  contentFingerprint: text("content_fingerprint").notNull().default(""),
  campaignId: text("campaign_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostMedia = pgTable("community_post_media", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  position: integer("position").notNull().default(0),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityModerationEvents = pgTable("community_moderation_events", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  reason: text("reason").notNull().default(""),
  adminId: text("admin_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityFollows = pgTable("community_follows", {
  followerMemberId: integer("follower_member_id").notNull().references(() => members.id),
  followedMemberId: integer("followed_member_id").notNull().references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityTopics = pgTable("community_topics", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  featured: integer("featured").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostTopics = pgTable("community_post_topics", {
  postId: text("post_id").notNull().references(() => communityPosts.id),
  topicId: text("topic_id").notNull().references(() => communityTopics.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityNotifications = pgTable("community_notifications", {
  id: text("id").primaryKey(),
  recipientMemberId: integer("recipient_member_id").notNull().references(() => members.id),
  eventKey: text("event_key").notNull(),
  eventType: text("event_type").notNull(),
  actorMemberId: integer("actor_member_id").references(() => members.id),
  entityType: text("entity_type").notNull().default("post"),
  entityId: text("entity_id").notNull().default(""),
  postId: text("post_id").references(() => communityPosts.id),
  payloadJson: text("payload_json").notNull().default("{}"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostLikes = pgTable("community_post_likes", {
  postId: text("post_id").notNull().references(() => communityPosts.id),
  memberId: integer("member_id").notNull().references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostBookmarks = pgTable("community_post_bookmarks", {
  postId: text("post_id").notNull().references(() => communityPosts.id),
  memberId: integer("member_id").notNull().references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityComments = pgTable("community_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  memberId: integer("member_id").notNull().references(() => members.id),
  parentCommentId: text("parent_comment_id"),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityReports = pgTable("community_reports", {
  id: text("id").primaryKey(),
  reporterMemberId: integer("reporter_member_id").notNull().references(() => members.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  commentId: text("comment_id"),
  reason: text("reason").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status").notNull().default("pending"),
  resolutionNote: text("resolution_note").notNull().default(""),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityReportEvents = pgTable("community_report_events", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => communityReports.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  action: text("action").notNull(),
  note: text("note").notNull().default(""),
  adminId: text("admin_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostProducts = pgTable("community_post_products", {
  postId: text("post_id").notNull().references(() => communityPosts.id),
  productSlug: text("product_slug").notNull().references(() => products.slug),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostPromotions = pgTable("community_post_promotions", {
  postId: text("post_id").primaryKey().references(() => communityPosts.id),
  placement: text("placement").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  note: text("note").notNull().default(""),
  promotedBy: text("promoted_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityContentEvents = pgTable("community_content_events", {
  id: serial("id").primaryKey(),
  eventKey: text("event_key").notNull().unique(),
  eventType: text("event_type").notNull(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  productSlug: text("product_slug").references(() => products.slug),
  memberId: integer("member_id").references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityCampaigns = pgTable("community_campaigns", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  rules: text("rules").notNull().default(""),
  topicId: text("topic_id").references(() => communityTopics.id),
  productSlug: text("product_slug").references(() => products.slug),
  rewardPoints: integer("reward_points").notNull().default(0),
  status: text("status").notNull().default("draft"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPostVersions = pgTable("community_post_versions", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  version: integer("version").notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  status: text("status").notNull(),
  topicSlugsJson: text("topic_slugs_json").notNull().default("[]"),
  productSlugsJson: text("product_slugs_json").notNull().default("[]"),
  mediaIdsJson: text("media_ids_json").notNull().default("[]"),
  changeType: text("change_type").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityCampaignEntries = pgTable("community_campaign_entries", {
  campaignId: text("campaign_id").notNull().references(() => communityCampaigns.id),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  memberId: integer("member_id").notNull().references(() => members.id),
  status: text("status").notNull().default("pending"),
  rewardPoints: integer("reward_points").notNull().default(0),
  reviewNote: text("review_note").notNull().default(""),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityRewardGrants = pgTable("community_reward_grants", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  rewardKey: text("reward_key").notNull(),
  points: integer("points").notNull(),
  status: text("status").notNull().default("granted"),
  referenceId: text("reference_id").notNull(),
  grantedAt: text("granted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reversedAt: text("reversed_at"),
});
