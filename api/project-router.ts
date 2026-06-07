import { z } from "zod";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projects } from "@db/schema";
import { eq, like, and } from "drizzle-orm";

export const projectRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.search) {
        conditions.push(like(projects.name, `%${input.search}%`));
      }
      if (input?.status) {
        conditions.push(eq(projects.status, input.status as "active" | "completed" | "archived"));
      }
      if (conditions.length > 0) {
        return db.select().from(projects).where(and(...conditions)).orderBy(projects.createdAt);
      }
      return db.select().from(projects).orderBy(projects.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      if (found.length === 0) throw new Error("项目不存在");
      return found[0];
    }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      status: z.enum(["active", "completed", "archived"]).default("active"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(projects).values({
        name: input.name,
        description: input.description,
        status: input.status,
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      status: z.enum(["active", "completed", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(projects).set(data).where(eq(projects.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),
});
