import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("首页与内页共用同一页脚内容并保留首页订阅配置", async () => {
  const [home, chrome, foundationCss, storefrontCss] = await Promise.all([
    read("app/HomeClient.tsx"),
    read("app/components/SiteChrome.tsx"),
    read("app/styles/01-foundation.css"),
    read("app/styles/04-storefront.css"),
  ]);

  assert.match(home, /import \{ SiteFooter \}/);
  assert.match(home, /newsletterTitle=\{homeContent\.newsletter_title\}/);
  assert.match(home, /newsletterSuccess=\{homeContent\.newsletter_success\}/);
  assert.match(home, /source="homepage"/);
  assert.doesNotMatch(home, /<footer className="pusy-footer"/);
  assert.match(chrome, /href="\/community">PÚSY CLUB 社区/);
  assert.match(chrome, /href="\/return">退换货政策/);
  assert.match(chrome, /showNewsletter &&/);
  assert.match(foundationCss, /footer\.pusy-footer \{/);
  assert.doesNotMatch(foundationCss, /(^|\})\s*footer\s*\{/m);
  assert.match(storefrontCss, /footer\.pusy-footer \{/);
  assert.doesNotMatch(storefrontCss, /(^|\})\s*footer\s*\{/m);
});
