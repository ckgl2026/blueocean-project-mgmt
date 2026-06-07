import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

let pool: Pool | null = null;

export function getDb() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/blueocean";
    pool = new Pool({ connectionString });
  }
  return drizzle(pool, { schema });
}
