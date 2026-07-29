import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置，无法执行数据库迁移");

const sql = await readFile(new URL("../db/migrations/2026-07-29-security-and-order-integrity.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

try {
  await pool.query(sql);
  console.log("数据库安全与订单一致性迁移完成");
} finally {
  await pool.end();
}
