import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置，无法执行数据库迁移");

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock(hashtext('pusy-schema-migrations'))");
  const directory = new URL("../db/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
  )`);
  for (const file of files) {
    const rawSql = await readFile(new URL(file, directory), "utf8");
    const checksum = createHash("sha256").update(rawSql).digest("hex");
    const applied = await client.query("SELECT checksum FROM schema_migrations WHERE name = $1 LIMIT 1", [file]);
    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) throw new Error(`已执行的迁移文件发生变化：${file}`);
      console.log(`数据库迁移已跳过：${file}`);
      continue;
    }
    const sql = rawSql.replace(/^\s*BEGIN;\s*$/gim, "").replace(/^\s*COMMIT;\s*$/gim, "");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
      await client.query("COMMIT");
      console.log(`数据库迁移完成：${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('pusy-schema-migrations'))").catch(() => undefined);
  client.release();
  await pool.end();
}
