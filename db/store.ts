import { Pool, type PoolClient, type QueryResult } from "pg";

type DbResult<T> = {
  results: T[];
  success: true;
  meta: { changes: number };
};

type Queryable = Pool | PoolClient;

function postgresSql(sql: string) {
  let parameter = 0;
  let quoted: "'" | '"' | null = null;
  let output = "";

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (quoted) {
      output += character;
      if (character === quoted && next === quoted) {
        output += next;
        index += 1;
      } else if (character === quoted) {
        quoted = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quoted = character;
      output += character;
    } else if (character === "?") {
      parameter += 1;
      output += `$${parameter}`;
    } else {
      output += character;
    }
  }

  return output;
}

class PostgresStatement {
  private values: unknown[] = [];
  private requiredChangeMessage: string | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  requireChanges(message: string) {
    this.requiredChangeMessage = message;
    return this;
  }

  async execute(queryable: Queryable = this.pool): Promise<QueryResult> {
    const result = await queryable.query(postgresSql(this.sql), this.values);
    if (this.requiredChangeMessage && !result.rowCount) throw new Error(this.requiredChangeMessage);
    return result;
  }

  async all<T>(): Promise<DbResult<T>> {
    const result = await this.execute();
    return {
      results: result.rows as T[],
      success: true,
      meta: { changes: result.rowCount ?? 0 },
    };
  }

  async first<T>(): Promise<T | null> {
    const result = await this.execute();
    return (result.rows[0] as T | undefined) ?? null;
  }

  async run(): Promise<DbResult<Record<string, unknown>>> {
    const result = await this.execute();
    return {
      results: result.rows,
      success: true,
      meta: { changes: result.rowCount ?? 0 },
    };
  }
}

class PostgresStoreDb {
  constructor(private readonly pool: Pool) {}

  prepare(sql: string) {
    return new PostgresStatement(this.pool, sql);
  }

  async batch(statements: PostgresStatement[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const statement of statements) {
        const result = await statement.execute(client);
        results.push({
          results: result.rows,
          success: true as const,
          meta: { changes: result.rowCount ?? 0 },
        });
      }
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

declare global {
  var pusyPostgresPool: Pool | undefined;
}

let store: PostgresStoreDb | undefined;

export async function getStoreDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("商城数据库尚未配置");

  if (!globalThis.pusyPostgresPool) {
    globalThis.pusyPostgresPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  store ??= new PostgresStoreDb(globalThis.pusyPostgresPool);
  return store;
}

export type DbProduct = {
  id: number; slug: string; name: string; category: string; description: string;
  image: string; image_alt: string | null; badge: string | null; price: number;
  old_price: number | null; stock: number; low_stock_threshold: number; inventory_verified: number; images_json: string; variants_json: string; status: string; created_at: string; updated_at: string;
  sku: string | null; volume: string | null; ingredients: string | null; usage: string | null;
};
