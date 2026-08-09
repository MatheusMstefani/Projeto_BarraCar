import { PrismaClient } from "@prisma/client";
import { applyNormalizedDatabaseEnvironment } from "@/lib/database-url";

applyNormalizedDatabaseEnvironment();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
