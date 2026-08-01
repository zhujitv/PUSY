import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("首页与内页共用同一页脚内容并保留首页订阅配置", async () => {
  const [home, chrome] = await Promise.all([
    read("app/page.tsx"),
    read("app/components/SiteChrome.tsx"),
  ]);

  assert.match(home, /import \{ SiteFooter \}/);
  assert.match(home, /<SiteFooter newsletterTitle=\{homeContent\.newsletter_title\}/);
  assert.match(home, /source="homepage"/);
  assert.doesNotMatch(home, /<footer className="pusy-footer"/);
  assert.match(chrome, /href="\/community">PÚSY CLUB 社区/);
  assert.match(chrome, /href="\/return">退换货政策/);
  assert.match(chrome, /showNewsletter &&/);
});
