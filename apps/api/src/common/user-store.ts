import type { PrismaClient } from "@prisma/client";

export async function ensureUser(
  prisma: PrismaClient,
  input: {
    email: string;
    id: string;
    imageUrl?: string | null;
    name?: string | null;
  }
) {
  return prisma.user.upsert({
    where: {
      id: input.id
    },
    update: {
      email: input.email,
      imageUrl: input.imageUrl ?? null,
      name: input.name ?? null
    },
    create: {
      id: input.id,
      email: input.email,
      imageUrl: input.imageUrl ?? null,
      name: input.name ?? null
    }
  });
}
