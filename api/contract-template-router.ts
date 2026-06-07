import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { createRouter, adminQuery, anyRoleQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contractTemplates } from "@db/schema";

export const contractTemplateRouter = createRouter({
  list: anyRoleQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db
          .select()
          .from(contractTemplates)
          .where(ilike(contractTemplates.name, `%${input.search}%`))
          .orderBy(contractTemplates.createdAt);
      }
      return db.select().from(contractTemplates).orderBy(contractTemplates.createdAt);
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        content: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .insert(contractTemplates)
        .values({
          name: input.name,
          content: input.content,
          description: input.description,
          createdBy: ctx.user!.id,
        })
        .returning();
      return { id: result[0].id, success: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        content: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(contractTemplates).set(data).where(eq(contractTemplates.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(contractTemplates).where(eq(contractTemplates.id, input.id));
      return { success: true };
    }),
});
