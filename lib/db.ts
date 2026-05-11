import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrisma() {
  // PrismaLibSql takes the same config object as @libsql/client's createClient
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN, // solo per Turso cloud (ignorato in locale)
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
