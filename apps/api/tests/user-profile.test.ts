import { describe, expect, it } from "vitest";

import { toUserProfile } from "../src/modules/auth/user-profile.js";
import { makeUserFixture } from "../../../packages/test-fixtures/src/index.js";

describe("user profile mapping", () => {
  it("normalizes a prisma user into the shared user profile shape", () => {
    const profile = toUserProfile({
      ...makeUserFixture(),
      createdAt: new Date("2026-03-30T00:00:00.000Z"),
      updatedAt: new Date("2026-03-30T00:00:00.000Z")
    });

    expect(profile).toEqual({
      email: "user@example.com",
      googleSubject: "google-subject",
      id: "user_123",
      imageUrl: "https://example.com/avatar.png",
      name: "User Example"
    });
  });
});
