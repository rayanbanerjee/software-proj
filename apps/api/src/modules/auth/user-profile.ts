import type { UserProfile } from "@repo/shared-types";

type UserProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toUserProfile(user: UserProfileRecord): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl
  };
}
