import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序认证前模式连接统一商品 API 并保留本地回退", async () => {
  const [config, request, catalog, productsApi, home, category, product, cart] = await Promise.all([
    read("miniprogram/config/index.js"),
    read("miniprogram/utils/request.js"),
    read("miniprogram/utils/catalog.js"),
    read("app/api/miniprogram/products/route.ts"),
    read("miniprogram/pages/home/index.js"),
    read("miniprogram/pages/category/index.js"),
    read("miniprogram/pages/product/index.js"),
    read("miniprogram/utils/cart.js"),
  ]);
  assert.match(config, /apiBaseUrl: "http:\/\/localhost:3000"/);
  assert.match(config, /previewMode: true/);
  assert.match(request, /wx\.request/);
  assert.match(request, /url: apiUrl\(path\)/);
  assert.match(request, /authorization: `Bearer \$\{token\}`/);
  assert.match(catalog, /request\("\/api\/miniprogram\/products"\)/);
  assert.match(catalog, /localCatalog\.products/);
  assert.match(productsApi, /RUB_TO_CNY \* 100/);
  assert.match(productsApi, /source: "database"/);
  assert.match(productsApi, /source: "preview"/);
  assert.match(productsApi, /miniProduct\(origin, product, true\)/);
  assert.match(productsApi, /purchasable: preview \|\| Boolean/);
  assert.match(productsApi, /new URL\(value, origin\)/);
  for (const page of [home, category, product]) assert.match(page, /refreshCatalog/);
  assert.match(cart, /product\.inventoryVerified/);
});

test("正式微信登录只在服务器交换凭证并复用会员会话", async () => {
  const [loginRoute, accountRoute, auth, session, profile, migration, env] = await Promise.all([
    read("app/api/miniprogram/auth/wechat/login/route.ts"),
    read("app/api/miniprogram/account/route.ts"),
    read("lib/preview-member-auth.ts"),
    read("miniprogram/utils/session.js"),
    read("miniprogram/pages/profile/index.js"),
    read("db/migrations/2026-07-30-zzzzzzzzzzzzz-miniprogram-phase-one.sql"),
    read(".env.example"),
  ]);
  assert.match(loginRoute, /process\.env\.WECHAT_MINIPROGRAM_APP_ID/);
  assert.match(loginRoute, /process\.env\.WECHAT_MINIPROGRAM_APP_SECRET/);
  assert.match(loginRoute, /api\.weixin\.qq\.com\/sns\/jscode2session/);
  assert.match(loginRoute, /issueMemberSession/);
  assert.doesNotMatch(loginRoute, /session_key[^\n]*(INSERT|UPDATE|Response\.json)/);
  assert.match(accountRoute, /getMemberIdentityFromRequest/);
  assert.match(accountRoute, /private, no-store/);
  assert.match(auth, /authorization\.match\(\/\^Bearer/);
  assert.match(session, /if \(config\.previewMode\)/);
  assert.match(session, /pusy_member_token_v1/);
  assert.match(profile, /本地预览会员/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS member_wechat_identities/);
  assert.match(migration, /UNIQUE\(app_id, openid\)/);
  assert.match(env, /WECHAT_MINIPROGRAM_APP_ID=/);
  assert.match(env, /WECHAT_MINIPROGRAM_APP_SECRET=/);
});

test("小程序前端不包含服务器微信密钥或 code2Session 调用", async () => {
  const directories = ["config", "utils", "pages", "components", "data"];
  const files = [];
  async function collect(path) {
    for (const entry of await readdir(new URL(`../${path}/`, import.meta.url), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await collect(child);
      else files.push(child);
    }
  }
  for (const directory of directories) await collect(`miniprogram/${directory}`);
  const source = (await Promise.all(files.map(read))).join("\n");
  assert.doesNotMatch(source, /WECHAT_MINIPROGRAM_APP_SECRET|api\.weixin\.qq\.com\/sns\/jscode2session/);
});
