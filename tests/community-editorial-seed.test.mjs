import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { editorialPosts, editorialProfiles, editorialSeedActor } from "../scripts/community-editorial-seed-data.mjs";
import { validateEditorialSeed } from "../scripts/community-editorial-seed-validation.mjs";

const projectRoot = new URL("../", import.meta.url);

test("official editorial seed is explicit, complete and locally valid", async () => {
  const result = await validateEditorialSeed(projectRoot);
  assert.deepEqual(result, { profileCount: 3, postCount: 18, topicCount: 5 });
  assert.equal(new Set(editorialPosts.map((post) => post.id)).size, 18);
  assert.equal(new Set(editorialPosts.map((post) => post.topicSlug)).size, 5);
  assert.ok(editorialProfiles.every((profile) => profile.officialLabel === "官方示例"));
  assert.ok(editorialProfiles.every((profile) => profile.email.endsWith(".invalid")));
  assert.ok(editorialPosts.every((post) => !post.title.startsWith("官方示例｜")));
  assert.ok(editorialPosts.every((post) => !post.body.startsWith("【官方示例内容】")));
  assert.ok(editorialPosts.every((post) => post.body.length >= 60));
  assert.equal(new Set(editorialPosts.map((post) => post.title)).size, 18);
});

test("editorial seeder is idempotent and does not fabricate engagement or commerce", async () => {
  const source = await readFile(new URL("../scripts/seed-community-editorial.mjs", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(source, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(source, /ON CONFLICT \(member_id\) DO UPDATE/);
  assert.match(source, /--rollback/);
  assert.match(source, /pg_advisory_lock/);
  assert.match(source, /BEGIN/);
  assert.match(source, /ROLLBACK/);
  assert.equal(editorialSeedActor, "system:community-editorial-seed-v1");
  assert.match(source, /moderated_by = \$2/);
  assert.match(source, /跳过重复写入/);
  assert.equal(packageJson.scripts["vercel-build"], "npm run db:migrate && npm run community:editorial:apply && next build --webpack");
  for (const forbiddenTable of [
    "community_post_likes", "community_comments", "community_follows", "community_reward_grants",
    "community_content_events", "community_order_attributions", "community_purchase_share_tasks",
  ]) assert.doesNotMatch(source, new RegExp(`INSERT INTO ${forbiddenTable}`));
});
