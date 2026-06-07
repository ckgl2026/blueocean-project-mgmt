import { z } from "zod";
import { createRouter, contractAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contractTemplates } from "@db/schema";
import { eq, like } from "drizzle-orm";

export const contractTemplateRouter = createRouter({
  list: contractAdminQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(contractTemplates)
          .where(like(contractTemplates.name, `%${input.search}%`));
      }
      return db.select().from(contractTemplates);
    }),

  getById: contractAdminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(contractTemplates)
        .where(eq(contractTemplates.id, input.id))
        .limit(1);

      if (found.length === 0) {
        throw new Error("模板不存在");
      }
      return found[0];
    }),

  create: contractAdminQuery
    .input(
      z.object({
        name: z.string().min(1).max(200),
        content: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(contractTemplates).values({
        name: input.name,
        content: input.content,
        description: input.description,
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  update: contractAdminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(contractTemplates)
        .set(data)
        .where(eq(contractTemplates.id, id));
      return { success: true };
    }),

  delete: contractAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(contractTemplates)
        .where(eq(contractTemplates.id, input.id));
      return { success: true };
    }),
});
