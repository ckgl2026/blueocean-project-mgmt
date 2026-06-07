import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function clear() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const pool = mysql.createPool(url);
  const db = drizzle(pool);

  console.log("[clear] Dropping all tables...");

  await db.execute("DROP TABLE IF EXISTS `rework_ledgers`");
  await db.execute("DROP TABLE IF EXISTS `idle_logs`");
  await db.execute("DROP TABLE IF EXISTS `quality_records`");
  await db.execute("DROP TABLE IF EXISTS `project_budgets`");
  await db.execute("DROP TABLE IF EXISTS `contracts`");
  await db.execute("DROP TABLE IF EXISTS `contract_templates`");
  await db.execute("DROP TABLE IF EXISTS `projects`");
  await db.execute("DROP TABLE IF EXISTS `users`");
  await db.execute("DROP TABLE IF EXISTS `__drizzle_migrations`");

  console.log("[clear] All tables dropped.");
  await pool.end();
  process.exit(0);
}

clear().catch((err) => {
  console.error("[clear] Error:", err);
  process.exit(1);
});
