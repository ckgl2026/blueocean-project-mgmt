import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contracts } from "@db/schema";

export const contractRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.search) {
        conditions.push(ilike(contracts.contractNo, `%${input.search}%`));
      }
      if (input?.status) {
        conditions.push(eq(contracts.status, input.status as "signed" | "executing" | "completed"));
      }
      if (conditions.length > 0) {
        return db.select().from(contracts).where(and(...conditions)).orderBy(contracts.createdAt);
      }
      return db.select().from(contracts).orderBy(contracts.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db.select().from(contracts).where(eq(contracts.id, input.id)).limit(1);
      if (found.length === 0) throw new Error("合同不存在");
      return found[0];
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.number().optional(),
        partyB: z.string().min(1),
        contractDate: z.string(),
        productName: z.string().min(1),
        quantity: z.number(),
        taxPrice: z.number(),
        taxAmount: z.number(),
        taxRate: z.number(),
        invoiceType: z.string(),
        projectName: z.string().min(1),
        paymentSchedule: z.array(z.object({ date: z.string(), amount: z.number(), note: z.string() })).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = await db
        .select()
        .from(contracts)
        .where(ilike(contracts.contractNo, `BH-${yearMonth}-%`))
        .orderBy(contracts.contractNo);
      let seq = 1;
      if (existing.length > 0) {
        const lastSeq = parseInt(existing[existing.length - 1].contractNo.split("-")[2]);
        seq = lastSeq + 1;
      }
      const contractNo = `BH-${yearMonth}-${String(seq).padStart(4, "0")}`;
      const result = await db
        .insert(contracts)
        .values({
          contractNo,
          name: input.name,
          templateId: input.templateId || null,
          partyB: input.partyB,
          contractDate: input.contractDate,
          productName: input.productName,
          quantity: String(input.quantity),
          taxPrice: String(input.taxPrice),
          taxAmount: String(input.taxAmount),
          taxRate: String(input.taxRate),
          invoiceType: input.invoiceType,
          projectName: input.projectName,
          paymentSchedule: input.paymentSchedule || [],
          content: input.content,
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, contractNo, success: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        partyB: z.string().optional(),
        contractDate: z.string().optional(),
        productName: z.string().optional(),
        quantity: z.number().optional(),
        taxPrice: z.number().optional(),
        taxAmount: z.number().optional(),
        taxRate: z.number().optional(),
        invoiceType: z.string().optional(),
        projectName: z.string().optional(),
        paymentSchedule: z.array(z.object({ date: z.string(), amount: z.number(), note: z.string() })).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) updateData[key] = value;
      });
      await db.update(contracts).set(updateData).where(eq(contracts.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(contracts).where(eq(contracts.id, input.id));
      return { success: true };
    }),
});
