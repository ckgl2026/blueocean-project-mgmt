import "dotenv/config";

function getEnv(name: string, required = false): string {
  const value = process.env[name];
  if (!value && required && process.env.NODE_ENV === "production") {
    console.warn(`[env] Missing environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: getEnv("APP_ID") || getEnv("VITE_APP_ID"),
  appSecret: getEnv("APP_SECRET") || getEnv("VITE_APP_SECRET") || getEnv("KIMI_APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getEnv("DATABASE_URL", true),
  kimiAuthUrl: getEnv("KIMI_AUTH_URL") || getEnv("VITE_KIMI_AUTH_URL") || "",
  kimiOpenUrl: getEnv("KIMI_OPEN_URL") || "",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
