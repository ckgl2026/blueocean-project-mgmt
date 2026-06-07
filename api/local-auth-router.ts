import { z } from "zod";
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import {
  signLocalSessionToken,
  verifyLocalSessionToken,
  getLocalTokenFromHeaders,
  getLocalCookieName,
} from "./local-auth";

export const localAuthRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (found.length === 0) {
        throw new Error("用户名或密码错误");
      }

      const user = found[0];
      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        throw new Error("用户名或密码错误");
      }

      if (user.status !== "active") {
        throw new Error("账号已停用，请联系管理员");
      }

      const token = await signLocalSessionToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const token = getLocalTokenFromHeaders(ctx.req.headers);
    if (!token) {
      // Try Kimi OAuth
      if (ctx.user) {
        return {
          id: ctx.user.id,
          username: ctx.user.username,
          name: ctx.user.name,
          role: ctx.user.role,
        };
      }
      return null;
    }

    const claim = await verifyLocalSessionToken(token);
    if (!claim) return null;

    const db = getDb();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.id, claim.userId))
      .limit(1);

    if (found.length === 0) return null;
    const user = found[0];
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const cookieName = getLocalCookieName();
    const opts = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: false,
    };

    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(cookieName, "", {
        ...opts,
        maxAge: 0,
      })
    );

    // Also clear Kimi cookie
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize("kimi_sid", "", {
        ...opts,
        maxAge: 0,
      })
    );

    return { success: true };
  }),

  changePassword: authedQuery
    .input(
      z.object({
        oldPassword: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user!.id))
        .limit(1);

      if (found.length === 0) {
        throw new Error("用户不存在");
      }

      const user = found[0];
      const valid = await bcrypt.compare(input.oldPassword, user.password);
      if (!valid) {
        throw new Error("原密码错误");
      }

      const hashed = await bcrypt.hash(input.newPassword, 10);
      await db
        .update(users)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return { success: true };
    }),
});
