import { defineConfig } from "vitest/config";
import { sharedVitestConfig } from "./tests/config/shared-vitest";

export default defineConfig({
  test: sharedVitestConfig
});
