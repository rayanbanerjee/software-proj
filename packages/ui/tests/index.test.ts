import { describe, expect, it } from "vitest";

import {
  buttonPrimitive,
  cardPrimitive,
  dialogPrimitive,
  surfaceVariants,
  toneVariants,
  uiPackageReady
} from "../src/index";

describe("ui package primitives", () => {
  it("exports a ready shared UI package baseline", () => {
    expect(uiPackageReady).toBe(true);
  });

  it("defines core primitive presets", () => {
    expect(buttonPrimitive.kind).toBe("button");
    expect(cardPrimitive.kind).toBe("card");
    expect(dialogPrimitive.kind).toBe("dialog");
  });

  it("keeps supported variants explicit", () => {
    expect(surfaceVariants).toContain("solid");
    expect(toneVariants).toContain("primary");
  });
});
