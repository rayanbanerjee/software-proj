import { describe, expect, it } from "vitest";

import { deliveryTracks, webAppModules } from "../src/lib/app-shell";

describe("web app shell data", () => {
  it("exposes the planned product modules for the landing page", () => {
    expect(webAppModules.map((module) => module.slug)).toEqual([
      "editor",
      "presence",
      "sharing",
      "versions",
      "ai",
      "export"
    ]);
  });

  it("documents the delivery tracks shown in the real app shell", () => {
    expect(deliveryTracks).toHaveLength(3);
    expect(deliveryTracks.map((track) => track.title)).toContain("Auth and Identity");
  });
});
