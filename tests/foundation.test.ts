import { describe, expect, it } from "vitest";

import { webAppModules } from "../apps/web/src/lib/app-shell";
import { editorNodeKinds } from "../packages/editor-schema/src/index";
import { aiActions } from "../packages/prompt-templates/src/index";
import { fixtureDocument } from "../packages/test-fixtures/src/index";

describe("repository foundation", () => {
  it("exposes the planned web app modules", () => {
    expect(webAppModules).toContain("ai");
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
