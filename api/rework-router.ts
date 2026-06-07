import { z } from "zod";
import { createRouter, projectManagerQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reworkLedgers } from "@db/schema";
import { eq, like } from "drizzle-orm";

export const reworkRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ projectName: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.projectName) {
        return db
          .select()
          .from(reworkLedgers)
          .where(like(reworkLedgers.projectName, `%${input.projectName}%`))
          .orderBy(reworkLedgers.createdAt);
      }
      if (input?.search) {
        return db
          .select()
          .from(reworkLedgers)
          .where(like(reworkLedgers.reworkItem, `%${input.search}%`))
          .orderBy(reworkLedgers.createdAt);
      }
      return db.select().from(reworkLedgers).orderBy(reworkLedgers.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(reworkLedgers)
        .where(eq(reworkLedgers.id, input.id))
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
        reworkDate: z.string(),
        reason: z.string().min(1),
        causeCategory: z.enum(["design_error", "client_change", "material_defect", "construction_error", "other"]),
        reworkItem: z.string().min(1),
        quantity: z.number().positive(),
        cost: z.number().min(0),
        responsibleParty: z.string().optional(),
        solution: z.string().optional(),
        deadline: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(reworkLedgers).values({
        projectName: input.projectName,
        reworkDate: new Date(input.reworkDate),
        reason: input.reason,
        causeCategory: input.causeCategory,
        reworkItem: input.reworkItem,
        quantity: String(input.quantity),
        cost: String(input.cost),
        responsibleParty: input.responsibleParty,
        solution: input.solution,
        deadline: input.deadline ? new Date(input.deadline) : null,
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  update: projectManagerQuery
    .input(
      z.object({
        id: z.number(),
        projectName: z.string().min(1).optional(),
        reworkDate: z.string().optional(),
        reason: z.string().min(1).optional(),
        causeCategory: z.enum(["design_error", "client_change", "material_defect", "construction_error", "other"]).optional(),
        reworkItem: z.string().min(1).optional(),
        quantity: z.number().positive().optional(),
        cost: z.number().min(0).optional(),
        responsibleParty: z.string().optional(),
        solution: z.string().optional(),
        deadline: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.projectName) updateData.projectName = data.projectName;
      if (data.reworkDate) updateData.reworkDate = new Date(data.reworkDate);
      if (data.reason) updateData.reason = data.reason;
      if (data.causeCategory) updateData.causeCategory = data.causeCategory;
      if (data.reworkItem) updateData.reworkItem = data.reworkItem;
      if (data.quantity !== undefined) updateData.quantity = String(data.quantity);
      if (data.cost !== undefined) updateData.cost = String(data.cost);
      if (data.responsibleParty !== undefined) updateData.responsibleParty = data.responsibleParty;
      if (data.solution !== undefined) updateData.solution = data.solution;
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;

      await db.update(reworkLedgers).set(updateData).where(eq(reworkLedgers.id, id));
      return { success: true };
    }),

  delete: projectManagerQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(reworkLedgers).where(eq(reworkLedgers.id, input.id));
      return { success: true };
    }),
});
