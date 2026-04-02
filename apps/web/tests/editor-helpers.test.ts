import { describe, expect, it } from "vitest";

import {
  getEditorModeLabel,
  isEditorReadOnly
} from "../src/editor/access";
import {
  LOCAL_EDITOR_DRAFT_KEY_PREFIX,
  createLocalDraftKey,
  readStoredDraft
} from "../src/editor/local-persistence";
import {
  getCurrentBlock,
  getSelectionSummary,
  hasExpandedSelection
} from "../src/editor/selection";

describe("editor local persistence", () => {
  it("builds a stable local draft key per document", () => {
    expect(createLocalDraftKey("project-kickoff")).toBe(
      `${LOCAL_EDITOR_DRAFT_KEY_PREFIX}:project-kickoff`
    );
  });

  it("parses stored JSON drafts and ignores invalid payloads", () => {
    expect(
      readStoredDraft(
        {
          getItem: () => "{\"type\":\"doc\"}"
        },
        "draft"
      )
    ).toEqual({ type: "doc" });

    expect(
      readStoredDraft(
        {
          getItem: () => "{not-json"
        },
        "draft"
      )
    ).toBeNull();
  });
});

describe("editor access helpers", () => {
  it("marks commenter mode as read-only and owner mode as editable", () => {
    expect(isEditorReadOnly("commenter")).toBe(true);
    expect(isEditorReadOnly("owner")).toBe(false);
    expect(getEditorModeLabel("editor")).toBe("editable");
    expect(getEditorModeLabel("commenter")).toBe("read-only");
  });
});

describe("editor selection helpers", () => {
  const baseEditor = {
    state: {
      selection: {
        empty: false,
        from: 4,
        to: 12
      }
    },
    isActive(name: string, attributes?: Record<string, unknown>) {
      if (name === "heading" && attributes?.level === 2) {
        return true;
      }

      return false;
    }
  };

  it("summarizes selection coordinates and current block", () => {
    expect(getSelectionSummary(baseEditor)).toEqual({
      empty: false,
      from: 4,
      to: 12,
      currentBlock: "heading-2"
    });
  });

  it("detects expanded selections and unknown editors safely", () => {
    expect(hasExpandedSelection(baseEditor)).toBe(true);
    expect(hasExpandedSelection(null)).toBe(false);
    expect(getCurrentBlock(null)).toBe("unknown");
  });
});
