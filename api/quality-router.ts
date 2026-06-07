import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { qualityRecords } from "@db/schema";

export const qualityRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(qualityRecords)
          .where(ilike(qualityRecords.projectName, `%${input.search}%`))
          .orderBy(qualityRecords.createdAt);
      }
      return db.select().from(qualityRecords).orderBy(qualityRecords.createdAt);
    }),

  create: anyRoleQuery
    .input(z.object({
      projectName: z.string().min(1),
      recordDate: z.string(),
      itemName: z.string().min(1),
      specification: z.string().optional(),
      checkMethod: z.string().optional(),
      checkResult: z.enum(["pass", "fail", "pending"]).default("pending"),
      inspector: z.string().optional(),
      remark: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .insert(qualityRecords)
        .values({
          ...input,
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, success: true };
    }),

  update: anyRoleQuery
    .input(z.object({
      id: z.number(),
      projectName: z.string().optional(),
      recordDate: z.string().optional(),
      itemName: z.string().optional(),
      specification: z.string().optional(),
      checkMethod: z.string().optional(),
      checkResult: z.enum(["pass", "fail", "pending"]).optional(),
      inspector: z.string().optional(),
      remark: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) updateData[key] = value;
      });
      await db.update(qualityRecords).set(updateData).where(eq(qualityRecords.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(qualityRecords).where(eq(qualityRecords.id, input.id));
      return { success: true };
    }),
});
