import { describe, expect, it } from "vitest";

import {
  getEditorHistoryState,
  runRedo,
  runUndo
} from "../src/editor/history";

function createHistoryEditor(canUndo: boolean, canRedo: boolean) {
  return {
    can() {
      return {
        chain() {
          return {
            focus() {
              return {
                undo() {
                  return {
                    run: () => canUndo
                  };
                },
                redo() {
                  return {
                    run: () => canRedo
                  };
                }
              };
            }
          };
        }
      };
    },
    chain() {
      return {
        focus() {
          return {
            undo() {
              return {
                run: () => true
              };
            },
            redo() {
              return {
                run: () => true
              };
            }
          };
        }
      };
    }
  };
}

describe("editor history helpers", () => {
  it("summarizes available undo and redo actions", () => {
    expect(getEditorHistoryState(createHistoryEditor(true, false))).toEqual({
      canUndo: true,
      canRedo: false
    });
  });

  it("executes undo and redo safely", () => {
    const editor = createHistoryEditor(true, true);

    expect(runUndo(editor)).toBe(true);
    expect(runRedo(editor)).toBe(true);
    expect(runUndo(null)).toBe(false);
    expect(runRedo(null)).toBe(false);
  });
});
