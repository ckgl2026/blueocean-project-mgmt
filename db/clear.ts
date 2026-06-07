import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function clear() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log("[clear] Dropping all tables...");

  await db.execute("DROP TABLE IF EXISTS rework_ledgers CASCADE");
  await db.execute("DROP TABLE IF EXISTS idle_logs CASCADE");
  await db.execute("DROP TABLE IF EXISTS quality_records CASCADE");
  await db.execute("DROP TABLE IF EXISTS project_budgets CASCADE");
  await db.execute("DROP TABLE IF EXISTS contracts CASCADE");
  await db.execute("DROP TABLE IF EXISTS contract_templates CASCADE");
  await db.execute("DROP TABLE IF EXISTS projects CASCADE");
  await db.execute("DROP TABLE IF EXISTS users CASCADE");

  console.log("[clear] All tables dropped.");
  await pool.end();
  process.exit(0);
}

clear().catch((err) => {
  console.error("[clear] Error:", err);
  process.exit(1);
});
