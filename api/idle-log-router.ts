import { z } from "zod";
import { createRouter, projectManagerQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { idleLogs } from "@db/schema";
import { eq, like } from "drizzle-orm";

export const idleLogRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ projectName: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.projectName) {
        return db
          .select()
          .from(idleLogs)
          .where(like(idleLogs.projectName, `%${input.projectName}%`))
          .orderBy(idleLogs.createdAt);
      }
      if (input?.search) {
        return db
          .select()
          .from(idleLogs)
          .where(like(idleLogs.reason, `%${input.search}%`))
          .orderBy(idleLogs.createdAt);
      }
      return db.select().from(idleLogs).orderBy(idleLogs.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(idleLogs)
        .where(eq(idleLogs.id, input.id))
        .limit(1);

      if (found.length === 0) {
        throw new Error("记录不存在");
      }
      return found[0];
    }),

  create: projectManagerQuery
    .input(
      z.object({
        projectName: z.string().min(1),
        idleDate: z.string(),
        reason: z.string().min(1),
        causeCategory: z.enum(["material_delay", "drawing_incomplete", "site_not_ready", "other"]),
        peopleDays: z.number().positive(),
        directCost: z.number().min(0),
        scheduleImpact: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(idleLogs).values({
        projectName: input.projectName,
        idleDate: new Date(input.idleDate),
        reason: input.reason,
        causeCategory: input.causeCategory,
        peopleDays: String(input.peopleDays),
        directCost: String(input.directCost),
        scheduleImpact: input.scheduleImpact,
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  update: projectManagerQuery
    .input(
      z.object({
        id: z.number(),
        projectName: z.string().min(1).optional(),
        idleDate: z.string().optional(),
        reason: z.string().min(1).optional(),
        causeCategory: z.enum(["material_delay", "drawing_incomplete", "site_not_ready", "other"]).optional(),
        peopleDays: z.number().positive().optional(),
        directCost: z.number().min(0).optional(),
        scheduleImpact: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.projectName) updateData.projectName = data.projectName;
      if (data.idleDate) updateData.idleDate = new Date(data.idleDate);
      if (data.reason) updateData.reason = data.reason;
      if (data.causeCategory) updateData.causeCategory = data.causeCategory;
      if (data.peopleDays !== undefined) updateData.peopleDays = String(data.peopleDays);
      if (data.directCost !== undefined) updateData.directCost = String(data.directCost);
      if (data.scheduleImpact !== undefined) updateData.scheduleImpact = data.scheduleImpact;

      await db.update(idleLogs).set(updateData).where(eq(idleLogs.id, id));
      return { success: true };
    }),

  delete: projectManagerQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(idleLogs).where(eq(idleLogs.id, input.id));
      return { success: true };
    }),
});
