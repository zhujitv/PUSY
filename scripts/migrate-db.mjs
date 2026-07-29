import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置，无法执行数据库迁移");

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

try {
  const directory = new URL("../db/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(await readFile(new URL(file, directory), "utf8"));
    console.log(`数据库迁移完成：${file}`);
  }
} finally {
  await pool.end();
}
