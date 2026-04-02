import { describe, expect, it } from "vitest";

import { documentListSections, workspaceNavigation } from "../apps/web/src/lib/app-shell";
import { editorNodeKinds } from "../packages/editor-schema/src/index";
import { aiActions } from "../packages/prompt-templates/src/index";
import { fixtureDocument } from "../packages/test-fixtures/src/index";

describe("repository foundation", () => {
  it("exposes the planned web app workspace routes", () => {
    expect(workspaceNavigation.map((item) => item.href)).toEqual([
      "/documents",
      "/documents/project-kickoff",
      "/auth"
    ]);
    expect(documentListSections.flatMap((section) => section.documents).map((document) => document.id)).toContain(
      "project-kickoff"
    );
  });

  it("keeps the minimal editor schema available", () => {
    expect(editorNodeKinds).toContain("paragraph");
  });

  it("tracks the supported AI actions", () => {
    expect(aiActions).toEqual(["rewrite", "summarize", "translate", "restructure"]);
  });

  it("ships a demo fixture document", () => {
    expect(fixtureDocument.title).toBe("Untitled document");
  });
});
