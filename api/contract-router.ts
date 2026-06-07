import { z } from "zod";
import { createRouter, contractAdminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contracts, contractTemplates } from "@db/schema";
import { eq, like, and } from "drizzle-orm";

export const contractRouter = createRouter({
  list: anyRoleQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(contracts.status, input.status as "signed" | "executing" | "completed"));
      }

      if (input?.search) {
        conditions.push(
          like(contracts.contractNo, `%${input.search}%`)
        );
      }

      if (conditions.length > 0) {
        return db
          .select()
          .from(contracts)
          .where(and(...conditions))
          .orderBy(contracts.createdAt);
      }

      return db.select().from(contracts).orderBy(contracts.createdAt);
    }),

  getById: anyRoleQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, input.id))
        .limit(1);

      if (found.length === 0) {
        throw new Error("合同不存在");
      }

      // Get template if exists
      let template = null;
      if (found[0].templateId) {
        const templates = await db
          .select()
          .from(contractTemplates)
          .where(eq(contractTemplates.id, found[0].templateId))
          .limit(1);
        if (templates.length > 0) template = templates[0];
      }

      return { ...found[0], template };
    }),

  create: contractAdminQuery
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.number().optional(),
        partyB: z.string().min(1),
        contractDate: z.string(),
        productName: z.string().min(1),
        quantity: z.number().positive(),
        taxPrice: z.number().positive(),
        taxAmount: z.number().positive(),
        taxRate: z.number().min(0).max(100),
        invoiceType: z.string().min(1),
        projectName: z.string().min(1),
        paymentSchedule: z.array(
          z.object({
            date: z.string(),
            amount: z.number(),
            note: z.string(),
          })
        ).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Generate contract number: BH-YYYYMM-NNNN
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Find the latest contract number for this month
      const latest = await db
        .select()
        .from(contracts)
        .where(like(contracts.contractNo, `BH-${yearMonth}-%`))
        .orderBy(contracts.contractNo);

      let sequence = 1;
      if (latest.length > 0) {
        const lastSeq = parseInt(
          latest[latest.length - 1].contractNo.split("-")[2]
        );
        sequence = lastSeq + 1;
      }

      const contractNo = `BH-${yearMonth}-${String(sequence).padStart(4, "0")}`;

      // Get template content if templateId provided
      let contractContent = input.content || "";
      if (input.templateId && !input.content) {
        const template = await db
          .select()
          .from(contractTemplates)
          .where(eq(contractTemplates.id, input.templateId))
          .limit(1);

        if (template.length > 0) {
          contractContent = template[0].content;
        }
      }

      const result = await db.insert(contracts).values({
        contractNo,
        name: input.name,
        templateId: input.templateId,
        partyB: input.partyB,
        contractDate: new Date(input.contractDate),
        productName: input.productName,
        quantity: String(input.quantity),
        taxPrice: String(input.taxPrice),
        taxAmount: String(input.taxAmount),
        taxRate: String(input.taxRate),
        invoiceType: input.invoiceType,
        projectName: input.projectName,
        paymentSchedule: input.paymentSchedule || [],
        content: contractContent,
        createdBy: ctx.user!.id,
      });

      return { id: Number(result[0].insertId), contractNo, success: true };
    }),

  update: contractAdminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        partyB: z.string().min(1).optional(),
        contractDate: z.string().optional(),
        productName: z.string().min(1).optional(),
        quantity: z.number().positive().optional(),
        taxPrice: z.number().positive().optional(),
        taxAmount: z.number().positive().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        invoiceType: z.string().min(1).optional(),
        projectName: z.string().min(1).optional(),
        paymentSchedule: z
          .array(
            z.object({
              date: z.string(),
              amount: z.number(),
              note: z.string(),
            })
          )
          .optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.partyB) updateData.partyB = data.partyB;
      if (data.contractDate) updateData.contractDate = new Date(data.contractDate);
      if (data.productName) updateData.productName = data.productName;
      if (data.quantity !== undefined) updateData.quantity = String(data.quantity);
      if (data.taxPrice !== undefined) updateData.taxPrice = String(data.taxPrice);
      if (data.taxAmount !== undefined) updateData.taxAmount = String(data.taxAmount);
      if (data.taxRate !== undefined) updateData.taxRate = String(data.taxRate);
      if (data.invoiceType) updateData.invoiceType = data.invoiceType;
      if (data.projectName) updateData.projectName = data.projectName;
      if (data.paymentSchedule) updateData.paymentSchedule = data.paymentSchedule;
      if (data.content) updateData.content = data.content;

      await db.update(contracts).set(updateData).where(eq(contracts.id, id));
      return { success: true };
    }),

  updateStatus: contractAdminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["signed", "executing", "completed"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(contracts)
        .set({ status: input.status })
        .where(eq(contracts.id, input.id));
      return { success: true };
    }),

  delete: contractAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(contracts).where(eq(contracts.id, input.id));
      return { success: true };
    }),
});
