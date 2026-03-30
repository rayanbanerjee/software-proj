import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "docs/process/documentation-pipeline.md",
  "docs/process/task-backlog.md",
  "docs/process/notion-backlog.csv",
  "docs/templates/adr-template.md",
  "docs/templates/task-template.md",
  "docs/templates/handoff-template.md",
  "docs/templates/change-template.md",
  "docs/templates/spec-template.md",
  "docs/tasks/TASK-0001-documentation-pipeline.md",
  "docs/specs/README.md",
  "docs/api/README.md",
  "docs/diagrams/README.md"
];

const requiredDirectories = [
  "docs/adr",
  "docs/api",
  "docs/changes",
  "docs/diagrams",
  "docs/handoffs",
  "docs/process",
  "docs/specs",
  "docs/tasks",
  "docs/templates"
];

async function ensurePathExists(relativePath) {
  await access(path.join(root, relativePath));
}

async function validateTaskNaming() {
  const entries = await readdir(path.join(root, "docs/tasks"));
  const invalid = entries.filter((entry) => !/^TASK-\d{4}-.+\.md$/.test(entry));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid task file names: ${invalid.join(", ")}. Expected TASK-0001-short-name.md format.`
    );
  }
}

async function validateHandoffNaming() {
  const entries = await readdir(path.join(root, "docs/handoffs"));
  const invalid = entries.filter((entry) => !/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid handoff file names: ${invalid.join(", ")}. Expected YYYY-MM-DD-topic.md format.`
    );
  }
}

async function validatePipelineMentionsTemplates() {
  const content = await readFile(
    path.join(root, "docs/process/documentation-pipeline.md"),
    "utf8"
  );

  const requiredMentions = [
    "docs/templates/task-template.md",
    "docs/templates/adr-template.md",
    "docs/templates/handoff-template.md",
    "docs/templates/change-template.md",
    "docs/process/task-backlog.md",
    "docs/process/notion-backlog.csv"
  ];

  const missing = requiredMentions.filter((mention) => !content.includes(mention));
  if (missing.length > 0) {
    throw new Error(
      `Pipeline doc is missing required template references: ${missing.join(", ")}`
    );
  }
}

async function main() {
  for (const directory of requiredDirectories) {
    await ensurePathExists(directory);
  }

  for (const file of requiredFiles) {
    await ensurePathExists(file);
  }

  await validateTaskNaming();
  await validateHandoffNaming();
  await validatePipelineMentionsTemplates();

  console.log("Documentation pipeline check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
