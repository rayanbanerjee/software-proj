import { describe, expect, it } from "vitest";

import {
  fixtureDocumentMetadata,
  makeAiProposalFixture,
  makeAiRequestFixture,
  makeDocumentMetadata,
  makeDocumentSummary,
  sampleDocumentSummaries
} from "../src/index";

describe("document fixtures", () => {
  it("ships reusable sample document summaries", () => {
    expect(sampleDocumentSummaries).toHaveLength(3);
    expect(sampleDocumentSummaries[0]?.title).toBe("Untitled document");
  });

  it("builds summary overrides from the shared fixture baseline", () => {
    expect(makeDocumentSummary({ role: "viewer", title: "Read only" })).toEqual({
      id: "doc_demo",
      title: "Read only",
      role: "viewer",
      updatedAt: "2026-03-31T08:15:00.000Z"
    });
  });

  it("merges metadata permission overrides without dropping defaults", () => {
    expect(
      makeDocumentMetadata({
        permissions: {
          canShare: false,
          role: "editor"
        }
      })
    ).toEqual({
      ...fixtureDocumentMetadata,
      permissions: {
        ...fixtureDocumentMetadata.permissions,
        canShare: false,
        role: "editor"
      }
    });
  });
});

describe("ai fixtures", () => {
  it("ships reusable AI request and proposal fixtures", () => {
    expect(makeAiRequestFixture()).toMatchObject({
      action: "summarize",
      maskPersonalData: false,
      context: {
        scope: "selection"
      }
    });
    expect(makeAiProposalFixture({ isStale: true })).toMatchObject({
      proposalId: "proposal_fixture",
      isStale: true
    });
  });
});
