import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "./lib/env";

const JWT_ALG = "HS256";
const LOCAL_COOKIE_NAME = "blueocean_sid";

export interface LocalSessionPayload {
  userId: number;
  username: string;
  role: string;
}

export async function signLocalSessionToken(payload: LocalSessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret + "_local");
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyLocalSessionToken(token: string): Promise<LocalSessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret + "_local");
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    const { userId, username, role } = payload as unknown as LocalSessionPayload;
    if (!userId || !username || !role) return null;
    return { userId, username, role };
  } catch {
    return null;
  }
}

export function getLocalTokenFromHeaders(headers: Headers): string | undefined {
  const cookies = cookie.parse(headers.get("cookie") || "");
  return cookies[LOCAL_COOKIE_NAME];
}

export function getLocalCookieName(): string {
  return LOCAL_COOKIE_NAME;
}
