import { describe, expect, it } from "vitest";

import { DEFAULT_JOB_OPTIONS, DEFAULT_WORKER_CONCURRENCY } from "../src/jobs/defaults";

describe("worker defaults", () => {
  it("exposes centralized retry and backoff defaults", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 1000
    });
  });

  it("exposes a default worker concurrency", () => {
    expect(DEFAULT_WORKER_CONCURRENCY).toBe(5);
  });
});