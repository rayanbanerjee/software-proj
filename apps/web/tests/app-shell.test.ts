import { describe, expect, it } from "vitest";

import {
  activeOverlayCopy,
  authShellStates,
  documentListSections,
  getDocumentRecord,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseOfflineFlag,
  workspaceNavigation
} from "../src/lib/app-shell";

describe("workspace navigation", () => {
  it("defines the core routes introduced by the workspace shell tasks", () => {
    expect(workspaceNavigation).toEqual([
      {
        href: "/documents",
        label: "Documents",
        summary: "List shell and launch points into the editor scaffold."
      },
      {
        href: "/documents/project-kickoff",
        label: "Editor",
        summary: "Toolbar, presence, history, modal, and state shells.",
        matchPrefix: "/documents/"
      },
      {
        href: "/auth",
        label: "Auth",
        summary: "Signed-out, loading, and signed-in shell previews."
      }
    ]);
  });
});

describe("auth shell data", () => {
  it("covers signed-out, loading, and signed-in shell states", () => {
    expect(authShellStates.map((state) => state.state)).toEqual([
      "signed-out",
      "loading",
      "signed-in"
    ]);
  });
});

describe("document shell data", () => {
  it("seeds the document list with placeholder cards for the list route", () => {
    const documentIds = documentListSections.flatMap((section) =>
      section.documents.map((document) => document.id)
    );

    expect(documentIds).toEqual([
      "project-kickoff",
      "design-review-notes",
      "retrospective-archive"
    ]);
  });

  it("returns a generated fallback record for unknown document routes", () => {
    expect(getDocumentRecord("planning-memo")).toMatchObject({
      id: "planning-memo",
      title: "Planning Memo",
      role: "owner"
    });
  });
});

describe("editor route query parsing", () => {
  it("normalizes the supported view, overlay, and offline values", () => {
    expect(parseDocumentScreenState("empty")).toBe("empty");
    expect(parseDocumentScreenState(["error"])).toBe("error");
    expect(parseDocumentScreenState(undefined)).toBe("ready");
    expect(parseDocumentOverlay("sharing")).toBe("sharing");
    expect(parseDocumentOverlay(["ai"])).toBe("ai");
    expect(parseDocumentOverlay("unknown")).toBeNull();
    expect(parseOfflineFlag("1")).toBe(true);
    expect(parseOfflineFlag(["0"])).toBe(false);
    expect(activeOverlayCopy.export).toBe("export options preview");
  });
});
