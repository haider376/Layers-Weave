import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./dbUrl";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const datasourceUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Use the resolved URL when present so the app works regardless of which
    // env var name the host injected; otherwise fall back to the schema default.
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
