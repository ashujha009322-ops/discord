import "server-only";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (
    process.env.NODE_ENV === "development" &&
    connectionString &&
    connectionString.includes("supabase.com:5432")
  ) {
    console.warn(
      "[prisma] DATABASE_URL is using port 5432 (Session mode). Switching to Supabase's Transaction pooler (port 6543 with ?pgbouncer=true) avoids connection-slot queuing.",
    );
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      // Keep pool compact so dev/serverless instances do not exhaust Supabase
      // pooler slots (which causes 4-6s connection queue stalls).
      max: 3,
      // Keep TCP+TLS sockets warm for 60s (pg defaults to 10s, which drops
      // the connection every time you pause to type a message).
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

// Lazy initialization prevents Turbopack proxy errors during server bundle evaluation
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma[prop];
  },
});
