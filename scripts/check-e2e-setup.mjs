import { existsSync } from "node:fs";

const requiredFiles = [
  "apps/web/playwright.config.mjs",
  "apps/web/tests/e2e/workspace-shell.spec.mjs"
];

const missing = requiredFiles.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error(`Missing E2E setup files: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("E2E setup files present.");
