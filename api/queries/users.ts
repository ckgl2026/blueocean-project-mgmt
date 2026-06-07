import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";

export async function findUserByUnionId(unionId: string) {
  // Keep for backward compatibility with Kimi OAuth
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  await getDb()
    .insert(schema.users)
    .values(values)
    .onConflictDoUpdate({
      target: schema.users.username,
      set: {
        name: data.name,
        role: data.role,
        status: data.status,
        updatedAt: new Date(),
      },
    });
}

export async function findUserByUsername(username: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}
