import type { UserProfile } from "@repo/shared-types";
import type { User } from "@prisma/client";

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    googleSubject: user.googleSubject
  };
}

