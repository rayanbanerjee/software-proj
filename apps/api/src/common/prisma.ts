import prismaClientPkg from "@prisma/client";
import type { PrismaClient as PrismaClientInstance } from "@prisma/client";

const { PrismaClient } = prismaClientPkg;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientInstance;
};

export function createPrismaClient() {
  if (process.env.NODE_ENV === "test") {
    return new PrismaClient();
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}
