import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";
import { sharedVitestConfig } from "./tests/config/shared-vitest";

export default defineConfig({
  resolve: {
    alias: {
      "@repo/authz": fileURLToPath(new URL("./packages/authz/src/index.ts", import.meta.url)),
      "@repo/editor-schema": fileURLToPath(new URL("./packages/editor-schema/src/index.ts", import.meta.url)),
      "@repo/prompt-templates": fileURLToPath(
        new URL("./packages/prompt-templates/src/index.ts", import.meta.url)
      ),
      "@repo/shared-types": fileURLToPath(
        new URL("./packages/shared-types/src/index.ts", import.meta.url)
      ),
      "@repo/test-fixtures": fileURLToPath(
        new URL("./packages/test-fixtures/src/index.ts", import.meta.url)
      ),
      "@repo/ui": fileURLToPath(new URL("./packages/ui/src/index.ts", import.meta.url))
    }
  },
  test: sharedVitestConfig
});

