import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reworkLedgers } from "@db/schema";

export const reworkRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(reworkLedgers)
          .where(ilike(reworkLedgers.projectName, `%${input.search}%`))
          .orderBy(reworkLedgers.createdAt);
      }
      return db.select().from(reworkLedgers).orderBy(reworkLedgers.createdAt);
    }),

  create: anyRoleQuery
    .input(z.object({
      projectName: z.string().min(1),
      reworkDate: z.string(),
      reason: z.string().min(1),
      causeCategory: z.enum(["design_error", "client_change", "material_defect", "construction_error", "other"]),
      reworkItem: z.string().min(1),
      quantity: z.number(),
      cost: z.number(),
      responsibleParty: z.string().optional(),
      solution: z.string().optional(),
      deadline: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .insert(reworkLedgers)
        .values({
          ...input,
          quantity: String(input.quantity),
          cost: String(input.cost),
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, success: true };
    }),

  update: anyRoleQuery
    .input(z.object({
      id: z.number(),
      projectName: z.string().optional(),
      reworkDate: z.string().optional(),
      reason: z.string().optional(),
      causeCategory: z.enum(["design_error", "client_change", "material_defect", "construction_error", "other"]).optional(),
      reworkItem: z.string().optional(),
      quantity: z.number().optional(),
      cost: z.number().optional(),
      responsibleParty: z.string().optional(),
      solution: z.string().optional(),
      deadline: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) updateData[key] = value;
      });
      await db.update(reworkLedgers).set(updateData).where(eq(reworkLedgers.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(reworkLedgers).where(eq(reworkLedgers.id, input.id));
      return { success: true };
    }),
});
