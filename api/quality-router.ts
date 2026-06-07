import { z } from "zod";
import { createRouter, projectManagerQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { qualityRecords } from "@db/schema";
import { eq, like } from "drizzle-orm";

export const qualityRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ projectName: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.projectName) {
        return db
          .select()
          .from(qualityRecords)
          .where(like(qualityRecords.projectName, `%${input.projectName}%`))
          .orderBy(qualityRecords.createdAt);
      }
      if (input?.search) {
        return db
          .select()
          .from(qualityRecords)
          .where(like(qualityRecords.itemName, `%${input.search}%`))
          .orderBy(qualityRecords.createdAt);
      }
      return db.select().from(qualityRecords).orderBy(qualityRecords.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(qualityRecords)
        .where(eq(qualityRecords.id, input.id))
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
        recordDate: z.string(),
        itemName: z.string().min(1),
        specification: z.string().optional(),
        checkMethod: z.string().optional(),
        checkResult: z.enum(["pass", "fail", "pending"]),
        inspector: z.string().optional(),
        remark: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(qualityRecords).values({
        projectName: input.projectName,
        recordDate: new Date(input.recordDate),
        itemName: input.itemName,
        specification: input.specification,
        checkMethod: input.checkMethod,
        checkResult: input.checkResult,
        inspector: input.inspector,
        remark: input.remark,
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  update: projectManagerQuery
    .input(
      z.object({
        id: z.number(),
        projectName: z.string().min(1).optional(),
        recordDate: z.string().optional(),
        itemName: z.string().min(1).optional(),
        specification: z.string().optional(),
        checkMethod: z.string().optional(),
        checkResult: z.enum(["pass", "fail", "pending"]).optional(),
        inspector: z.string().optional(),
        remark: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.projectName) updateData.projectName = data.projectName;
      if (data.recordDate) updateData.recordDate = new Date(data.recordDate);
      if (data.itemName) updateData.itemName = data.itemName;
      if (data.specification !== undefined) updateData.specification = data.specification;
      if (data.checkMethod !== undefined) updateData.checkMethod = data.checkMethod;
      if (data.checkResult) updateData.checkResult = data.checkResult;
      if (data.inspector !== undefined) updateData.inspector = data.inspector;
      if (data.remark !== undefined) updateData.remark = data.remark;

      await db.update(qualityRecords).set(updateData).where(eq(qualityRecords.id, id));
      return { success: true };
    }),

  delete: projectManagerQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(qualityRecords).where(eq(qualityRecords.id, input.id));
      return { success: true };
    }),
});
