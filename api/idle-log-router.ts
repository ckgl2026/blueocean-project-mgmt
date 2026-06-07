import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { idleLogs } from "@db/schema";

export const idleLogRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(idleLogs)
          .where(ilike(idleLogs.projectName, `%${input.search}%`))
          .orderBy(idleLogs.createdAt);
      }
      return db.select().from(idleLogs).orderBy(idleLogs.createdAt);
    }),

  create: anyRoleQuery
    .input(z.object({
      projectName: z.string().min(1),
      idleDate: z.string(),
      reason: z.string().min(1),
      causeCategory: z.enum(["material_delay", "drawing_incomplete", "site_not_ready", "other"]),
      peopleDays: z.number(),
      directCost: z.number(),
      scheduleImpact: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .insert(idleLogs)
        .values({
          ...input,
          peopleDays: String(input.peopleDays),
          directCost: String(input.directCost),
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, success: true };
    }),

  update: anyRoleQuery
    .input(z.object({
      id: z.number(),
      projectName: z.string().optional(),
      idleDate: z.string().optional(),
      reason: z.string().optional(),
      causeCategory: z.enum(["material_delay", "drawing_incomplete", "site_not_ready", "other"]).optional(),
      peopleDays: z.number().optional(),
      directCost: z.number().optional(),
      scheduleImpact: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) updateData[key] = value;
      });
      await db.update(idleLogs).set(updateData).where(eq(idleLogs.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(idleLogs).where(eq(idleLogs.id, input.id));
      return { success: true };
    }),
});
