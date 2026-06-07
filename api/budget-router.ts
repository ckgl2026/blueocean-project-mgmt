import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projectBudgets, contracts } from "@db/schema";

export const budgetRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(projectBudgets)
          .where(ilike(projectBudgets.projectName, `%${input.search}%`))
          .orderBy(projectBudgets.createdAt);
      }
      return db.select().from(projectBudgets).orderBy(projectBudgets.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(projectBudgets)
        .where(eq(projectBudgets.id, input.id))
        .limit(1);
      if (found.length === 0) throw new Error("预算不存在");
      let contract = null;
      if (found[0].contractId) {
        const cList = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, found[0].contractId))
          .limit(1);
        if (cList.length > 0) contract = cList[0];
      }
      return { ...found[0], contract };
    }),

  create: adminQuery
    .input(
      z.object({
        projectName: z.string().min(1),
        contractId: z.number(),
        budgetNo: z.string().optional(),
        part1Materials: z.array(z.object({
          materialName: z.string(),
          quantity: z.number(),
          price: z.number(),
          exclTaxPrice: z.number(),
          amount: z.number(),
          taxRate: z.number(),
          materialCost: z.number(),
          supplier: z.string(),
          arrivalDate: z.string(),
        })).optional(),
        part2Labor: z.object({
          workshopFee: z.number(),
          pmSalary: z.number(),
          staffSalary: z.number(),
          otherLabor: z.number(),
        }).optional(),
        part3Other: z.object({
          processingFee: z.number(),
          fuelFee: z.number(),
          weldingFee: z.number(),
          transportFee: z.number(),
          certFee: z.number(),
          auditFee: z.number(),
          otherFee: z.number(),
        }).optional(),
        budgetSummary: z.object({
          budgetQty: z.number(),
          budgetAmount: z.number(),
          actualQty: z.number(),
          actualAmount: z.number(),
          diffQty: z.number(),
          diffAmount: z.number(),
          diffReason: z.string(),
        }).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      let budgetNo = input.budgetNo;
      if (!budgetNo) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const latest = await db
          .select()
          .from(projectBudgets)
          .where(ilike(projectBudgets.budgetNo, `YS-${yearMonth}-%`))
          .orderBy(projectBudgets.budgetNo);
        let seq = 1;
        if (latest.length > 0) {
          const lastSeq = parseInt(latest[latest.length - 1].budgetNo.split("-")[2]);
          seq = lastSeq + 1;
        }
        budgetNo = `YS-${yearMonth}-${String(seq).padStart(4, "0")}`;
      }
      const result = await db
        .insert(projectBudgets)
        .values({
          projectName: input.projectName,
          contractId: input.contractId,
          budgetNo,
          part1Materials: input.part1Materials || [],
          part2Labor: input.part2Labor || { workshopFee: 0, pmSalary: 0, staffSalary: 0, otherLabor: 0 },
          part3Other: input.part3Other || { processingFee: 0, fuelFee: 0, weldingFee: 0, transportFee: 0, certFee: 0, auditFee: 0, otherFee: 0 },
          budgetSummary: input.budgetSummary || { budgetQty: 0, budgetAmount: 0, actualQty: 0, actualAmount: 0, diffQty: 0, diffAmount: 0, diffReason: "" },
          notes: input.notes,
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, budgetNo, success: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        projectName: z.string().optional(),
        part1Materials: z.array(z.object({
          materialName: z.string(),
          quantity: z.number(),
          price: z.number(),
          exclTaxPrice: z.number(),
          amount: z.number(),
          taxRate: z.number(),
          materialCost: z.number(),
          supplier: z.string(),
          arrivalDate: z.string(),
        })).optional(),
        part2Labor: z.object({
          workshopFee: z.number(),
          pmSalary: z.number(),
          staffSalary: z.number(),
          otherLabor: z.number(),
        }).optional(),
        part3Other: z.object({
          processingFee: z.number(),
          fuelFee: z.number(),
          weldingFee: z.number(),
          transportFee: z.number(),
          certFee: z.number(),
          auditFee: z.number(),
          otherFee: z.number(),
        }).optional(),
        budgetSummary: z.object({
          budgetQty: z.number(),
          budgetAmount: z.number(),
          actualQty: z.number(),
          actualAmount: z.number(),
          diffQty: z.number(),
          diffAmount: z.number(),
          diffReason: z.string(),
        }).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.projectName) updateData.projectName = data.projectName;
      if (data.part1Materials) updateData.part1Materials = data.part1Materials;
      if (data.part2Labor) updateData.part2Labor = data.part2Labor;
      if (data.part3Other) updateData.part3Other = data.part3Other;
      if (data.budgetSummary) updateData.budgetSummary = data.budgetSummary;
      if (data.notes !== undefined) updateData.notes = data.notes;
      await db.update(projectBudgets).set(updateData).where(eq(projectBudgets.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(projectBudgets).where(eq(projectBudgets.id, input.id));
      return { success: true };
    }),
});
