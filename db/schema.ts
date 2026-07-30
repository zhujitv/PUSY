import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull(),
  imageAlt: text("image_alt"),
  badge: text("badge"),
  price: integer("price").notNull(),
  oldPrice: integer("old_price"),
  stock: integer("stock").notNull().default(0),
  inventoryVerified: integer("inventory_verified", { mode: "boolean" }).notNull().default(false),
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

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("active"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberVerificationCodes = sqliteTable("member_verification_codes", {
  id: text("id").primaryKey(),
  target: text("target").notNull(),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberSessions = sqliteTable("member_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberProfiles = sqliteTable("member_profiles", {
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
  emailMarketing: integer("email_marketing", { mode: "boolean" }).notNull().default(false),
  smsMarketing: integer("sms_marketing", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberAddresses = sqliteTable("member_addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id),
  label: text("label").notNull().default("家"),
  recipient: text("recipient").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull().default(""),
  detail: text("detail").notNull(),
  postcode: text("postcode").notNull().default(""),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
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
  resourcesReleased: integer("resources_released", { mode: "boolean" }).notNull().default(false),
  resourcesCommitted: integer("resources_committed", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("待付款"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().references(() => orders.id),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("active"),
  subscribedAt: text("subscribed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const retailPartnerships = sqliteTable("retail_partnerships", {
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

export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const returns = sqliteTable("returns", {
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

export const supportThreads = sqliteTable("support_threads", {
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
  starred: integer("starred").notNull().default(0),
  archivedAt: text("archived_at"),
  deletedAt: text("deleted_at"),
  dueAt: text("due_at"),
  lastMessageAt: text("last_message_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportCannedReplies = sqliteTable("support_canned_replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().unique(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const invoices = sqliteTable("invoices", {
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

export const supportMessages = sqliteTable("support_messages", {
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

export const returnEvents = sqliteTable("return_events", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => returns.id),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("system"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const giftCards = sqliteTable("gift_cards", {
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

export const paymentProviders = sqliteTable("payment_providers", {
  provider: text("provider").primaryKey(),
  displayName: text("display_name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  mode: text("mode").notNull().default("production"),
  appId: text("app_id").notNull().default(""),
  merchantId: text("merchant_id").notNull().default(""),
  publicKeyId: text("public_key_id").notNull().default(""),
  certificateSerial: text("certificate_serial").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  merchantTradeNo: text("merchant_trade_no").notNull().unique(),
  providerTransactionId: text("provider_transaction_id"),
  amountFen: integer("amount_fen").notNull(),
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

export const paymentEvents = sqliteTable("payment_events", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").references(() => payments.id),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payloadDigest: text("payload_digest").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  result: text("result").notNull(),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => payments.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  merchantRefundNo: text("merchant_refund_no").notNull().unique(),
  providerRefundId: text("provider_refund_id"),
  amountFen: integer("amount_fen").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: text("next_retry_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationSettings = sqliteTable("notification_settings", {
  channel: text("channel").primaryKey(),
  displayName: text("display_name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  provider: text("provider").notNull(),
  senderName: text("sender_name").notNull().default("PUSY.CN"),
  senderAddress: text("sender_address").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationTemplates = sqliteTable("notification_templates", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  emailSubject: text("email_subject").notNull().default(""),
  emailBody: text("email_body").notNull().default(""),
  smsBody: text("sms_body").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationJobs = sqliteTable("notification_jobs", {
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

export const notificationDeliveryEvents = sqliteTable("notification_delivery_events", {
  id: text("id").primaryKey(),
  providerMessageId: text("provider_message_id").notNull(),
  eventType: text("event_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
