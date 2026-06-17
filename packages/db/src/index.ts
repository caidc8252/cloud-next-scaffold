import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // 运行时优先走 PgBouncer（生产 transaction 池化连接），回退到直连 DATABASE_URL。
  // 本地/CI 只设 DATABASE_URL 时行为不变；迁移/CLI 仍由 prisma.config.ts 用 DATABASE_URL 直连，
  // 因为 db push/migrate 的 DDL 与 advisory lock 在 transaction 池化模式下会失效。
  const connectionString = process.env.PGBOUNCER_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
