import { describe, expect, it } from "vitest";

import {
  applySyncPermissionState,
  applySyncViewOverride,
  activeOverlayCopy,
  authShellStates,
  createDraftDocumentRecord,
  documentListSections,
  getDocumentRecord,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseSyncConnectionState,
  parseSyncPermissionState,
  parseSyncStateVector,
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

  it("builds predictable local draft records for the create-document stub", () => {
    expect(createDraftDocumentRecord(2)).toMatchObject({
      id: "draft-02",
      title: "Untitled Draft 02",
      role: "owner",
      collaborators: 1
    });
  });
});

describe("editor route query parsing", () => {
  it("normalizes the supported view, overlay, and sync values", () => {
    expect(parseDocumentScreenState("empty")).toBe("empty");
    expect(parseDocumentScreenState(["error"])).toBe("error");
    expect(parseDocumentScreenState(undefined)).toBe("ready");
    expect(parseDocumentOverlay("sharing")).toBe("sharing");
    expect(parseDocumentOverlay(["ai"])).toBe("ai");
    expect(parseDocumentOverlay("unknown")).toBeNull();
    expect(parseSyncConnectionState("offline")).toBe("offline");
    expect(parseSyncConnectionState(["reconnecting"])).toBe("reconnecting");
    expect(parseSyncConnectionState("unknown")).toBe("online");
    expect(parseSyncPermissionState("read-only")).toBe("read-only");
    expect(parseSyncPermissionState("anything-else")).toBe("normal");
    expect(parseSyncStateVector(["sv-42"])).toBe("sv-42");
    expect(activeOverlayCopy.export).toBe("export options preview");
  });

  it("applies offline permission changes to the workspace document and view", () => {
    const document = applySyncPermissionState(getDocumentRecord("project-kickoff"), "read-only");
    const revokedDocument = applySyncPermissionState(getDocumentRecord("project-kickoff"), "revoked");

    expect(document.role).toBe("viewer");
    expect(document.summary).toContain("Access was downgraded while the client was offline");
    expect(revokedDocument.role).toBe("viewer");
    expect(applySyncViewOverride("ready", "revoked")).toBe("error");
    expect(applySyncViewOverride("empty", "normal")).toBe("empty");
  });
});
