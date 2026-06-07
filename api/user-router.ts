import { z } from "zod";
import { eq, or, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";

export const userRouter = createRouter({
  list: adminQuery
    .input(
      z
        .object({
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(users)
          .where(
            or(
              ilike(users.username, `%${input.search}%`),
              ilike(users.name, `%${input.search}%`)
            )
          )
          .orderBy(users.createdAt);
      }
      return db.select().from(users).orderBy(users.createdAt);
    }),

  create: adminQuery
    .input(
      z.object({
        username: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        password: z.string().optional(),
        role: z.enum(["contract_admin", "project_manager"]),
        status: z.enum(["active", "inactive"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const password = input.password || " ";
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db
        .insert(users)
        .values({
          username: input.username,
          name: input.name,
          password: hashedPassword,
          role: input.role,
          status: input.status,
        })
        .returning();
      return { id: result[0].id, success: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        password: z.string().optional(),
        role: z.enum(["contract_admin", "project_manager"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }
      await db.update(users).set(updateData).where(eq(users.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
