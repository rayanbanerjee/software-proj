import { spawnSync } from "node:child_process";

const projects = [
  "apps/web/tsconfig.json",
  "apps/api/tsconfig.json",
  "apps/collab/tsconfig.json",
  "apps/worker/tsconfig.json",
  "packages/shared-types/tsconfig.json",
  "packages/editor-schema/tsconfig.json",
  "packages/authz/tsconfig.json",
  "packages/prompt-templates/tsconfig.json",
  "packages/ui/tsconfig.json",
  "packages/test-fixtures/tsconfig.json"
];

const tscBinary =
  process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

for (const project of projects) {
  const result = spawnSync(tscBinary, ["-p", project], {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Typecheck passed for all configured projects.");

