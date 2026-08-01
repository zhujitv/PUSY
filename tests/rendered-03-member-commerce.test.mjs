import assert from "node:assert/strict";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


test("commerce feature set covers discovery, cart, membership, reviews and content operations", async () => {
  const [catalog, cart, account, productPage, gallery, reviews, reviewsApi, admin, adminApi, contentApi, schema, css] = await Promise.all([
    read("app/components/CatalogClient.tsx"),
    read("app/cart/page.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductGallery.tsx"),
    read("app/products/[slug]/ProductReviews.tsx"),
    read("app/api/reviews/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("app/api/content/route.ts"),
    read("db/railway-postgres.sql"),
    read("app/globals.css"),
  ]);
  assert.match(catalog, /只看有货/);
  assert.match(catalog, /最低价（元）/);
  assert.match(catalog, /商品标签/);
  assert.match(cart, /shipping-progress/);
  assert.match(cart, /顺手带上/);
  assert.match(account, /我的收藏/);
  assert.match(productPage, /ProductGallery/);
  assert.match(productPage, /ProductReviews/);
  assert.match(gallery, /product-gallery-thumbs/);
  assert.match(reviews, /写下你的评价/);
  assert.match(reviewsApi, /verified_purchase/);
  assert.match(admin, /评价审核/);
  assert.match(admin, /内容运营/);
  assert.match(adminApi, /update-review-status/);
  assert.match(adminApi, /update-site-content/);
  assert.match(contentApi, /getSiteContent/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS product_reviews/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS site_content/);
  assert.match(css, /product-gallery-stage img[^}]*object-fit: contain/);
});

test("member center always exposes a working sign-out entry", async () => {
  const [account, accountClient, logout, login, authApi] = await Promise.all([
    read("app/account/page.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/account/logout/route.ts"),
    read("app/account/login/MemberAuthClient.tsx"),
    read("app/api/account/auth/route.ts"),
  ]);
  assert.doesNotMatch(account, /canSignOut/);
  assert.match(account, /redirect\("\/account\/login"\)/);
  assert.match(accountClient, /href="\/account\/logout">退出登录/);
  assert.match(logout, /Response\.redirect\(new URL\("\/account\/login"/);
  assert.match(logout, /clearPreviewMemberCookie/);
  assert.match(login, /会员登录/);
  assert.match(login, /注册会员/);
  assert.match(login, /邮箱地址/);
  assert.match(login, /手机号码（选填）/);
  assert.match(authApi, /member_verification_codes/);
  assert.match(authApi, /crypto\.getRandomValues/);
  assert.doesNotMatch(authApi, /123456|MEMBER_VERIFICATION_CODE/);
  assert.doesNotMatch(accountClient, /会员编号|会员 #/);
  assert.match(accountClient, /PÚSY CLUB 会员/);
});

test("member profile supports complete personal and beauty preferences", async () => {
  const [account, accountApi, profileSchema, railwaySchema, css] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/api/account/route.ts"),
    read("db/member-profile.ts"),
    read("db/railway-postgres.sql"),
    read("app/globals.css"),
  ]);
  assert.match(account, /资料完整度/);
  assert.match(account, /美妆档案/);
  assert.match(account, /主要护理诉求/);
  assert.match(account, /感兴趣的品类/);
  assert.match(account, /邮件新品通知/);
  assert.match(accountApi, /validBirthday/);
  assert.match(accountApi, /skinConcernValues/);
  assert.match(accountApi, /preferred_categories/);
  assert.match(profileSchema, /INSERT INTO member_profiles/);
  assert.doesNotMatch(profileSchema, /CREATE TABLE/);
  assert.match(railwaySchema, /CREATE TABLE IF NOT EXISTS member_profiles/);
  assert.match(css, /profile-completion/);
});

test("protects admin and member sessions from spoofed identity headers", async () => {
  const [adminApi, adminPage, adminAuth, memberAuth, accountApi, reviewsApi] = await Promise.all([
    read("app/api/admin/route.ts"),
    read("app/admin/page.tsx"),
    read("lib/admin-auth.ts"),
    read("lib/preview-member-auth.ts"),
    read("app/api/account/route.ts"),
    read("app/api/reviews/route.ts"),
  ]);
  const combined = [adminApi, adminPage, accountApi, reviewsApi].join("\n");
  assert.doesNotMatch(combined, /oai-authenticated-user-email|getChatGPTUser/);
  assert.match(adminApi, /getAdminIdentity/);
  assert.match(adminAuth, /HMAC/);
  assert.match(memberAuth, /member_sessions/);
  assert.match(memberAuth, /sha256\(token\)/);
  assert.match(memberAuth, /HttpOnly; SameSite=Lax/);
});

test("reserves order resources atomically and commits them only after payment", async () => {
  const [orders, reservations, paymentService, checkout, paymentApi, success] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("lib/orders/reservations.ts"),
    read("lib/payments/service.ts"),
    read("app/checkout/page.tsx"),
    read("app/api/payments/route.ts"),
    read("app/checkout/success/page.tsx"),
  ]);
  assert.match(orders, /stock >= \?/);
  assert.match(orders, /requireChanges/);
  assert.match(orders, /reservationExpiresAt/);
  assert.match(orders, /'pending'/);
  assert.doesNotMatch(orders, /total_orders = total_orders \+ 1/);
  assert.match(paymentService, /commitPaidOrder/);
  assert.match(reservations, /resources_committed/);
  assert.match(reservations, /status = 'void'/);
  assert.doesNotMatch(checkout, /Date\.now\(\)\.toString\(\)\.slice/);
  assert.doesNotMatch(checkout, /token=\$\{/);
  assert.match(paymentApi, /HttpOnly; SameSite=Lax/);
  assert.match(success, /payment_token_hash/);
});
