import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { getLocalTokenFromHeaders, verifyLocalSessionToken } from "./local-auth";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try local auth first (cookie)
  try {
    const localToken = getLocalTokenFromHeaders(opts.req.headers);
    if (localToken) {
      const claim = await verifyLocalSessionToken(localToken);
      if (claim) {
        const db = getDb();
        const found = await db.select().from(users).where(eq(users.id, claim.userId)).limit(1);
        if (found.length > 0) {
          ctx.user = found[0];
          return ctx;
        }
      }
    }
  } catch {
    // Local auth (cookie) failed
  }

  // Try Authorization header (Bearer token)
  try {
    const authHeader = opts.req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const claim = await verifyLocalSessionToken(token);
      if (claim) {
        const db = getDb();
        const found = await db.select().from(users).where(eq(users.id, claim.userId)).limit(1);
        if (found.length > 0) {
          ctx.user = found[0];
          return ctx;
        }
      }
    }
  } catch {
    // Header auth failed
  }

  // Fall back to Kimi OAuth
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }

  return ctx;
}
