import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, like, and, or } from "drizzle-orm";

export const userRouter = createRouter({
  list: adminQuery
    .input(
      z
        .object({
          search: z.string().optional(),
          role: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.search) {
        conditions.push(
          or(
            like(users.username, `%${input.search}%`),
            like(users.name, `%${input.search}%`)
          )
        );
      }

      if (input?.role) {
        conditions.push(eq(users.role, input.role as "super_admin" | "contract_admin" | "project_manager"));
      }

      // Exclude current admin from results if needed
      conditions.push(eq(users.role, "contract_admin"));

      const result = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(and(...conditions));

      // Also get project managers
      const pmCondition = eq(users.role, "project_manager");
      const pmResult = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(input?.search ? and(pmCondition, or(like(users.username, `%${input.search}%`), like(users.name, `%${input.search}%`))) : pmCondition);

      return [...result, ...pmResult];
    }),

  getById: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (found.length === 0) {
        throw new Error("用户不存在");
      }
      return found[0];
    }),

  create: adminQuery
    .input(
      z.object({
        username: z.string().min(2).max(50),
        name: z.string().min(1).max(100),
        password: z.string().min(6).max(50),
        role: z.enum(["contract_admin", "project_manager"]),
        status: z.enum(["active", "inactive"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if username exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("用户名已存在");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const result = await db.insert(users).values({
        username: input.username,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        status: input.status,
      });

      return { id: Number(result[0].insertId), success: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        username: z.string().min(2).max(50).optional(),
        name: z.string().min(1).max(100).optional(),
        password: z.string().min(6).max(50).optional(),
        role: z.enum(["contract_admin", "project_manager"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      // Check if user exists and is not super admin
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("用户不存在");
      }

      if (existing[0].role === "super_admin") {
        throw new Error("不能修改超级管理员");
      }

      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.role) updateData.role = data.role;
      if (data.status) updateData.status = data.status;
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id));

      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("用户不存在");
      }

      if (existing[0].role === "super_admin") {
        throw new Error("不能删除超级管理员");
      }

      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
