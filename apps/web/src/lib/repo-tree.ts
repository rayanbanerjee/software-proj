import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

export type RepoTreeNode = {
  children?: RepoTreeNode[];
  kind: "directory" | "file";
  name: string;
  path: string;
};

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const MAX_DEPTH = 2;
const MAX_CHILDREN = 10;
const EXCLUDED_NAMES = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  ".turbo",
  "coverage",
  "dist",
  "node_modules"
]);

function compareNodes(a: RepoTreeNode, b: RepoTreeNode) {
  if (a.kind !== b.kind) {
    return a.kind === "directory" ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

function buildNode(absolutePath: string, relativePath: string, depth: number): RepoTreeNode | null {
  const name = relativePath === "" ? path.basename(absolutePath) : path.basename(relativePath);

  if (EXCLUDED_NAMES.has(name)) {
    return null;
  }

  const stats = statSync(absolutePath);

  if (!stats.isDirectory()) {
    return {
      kind: "file",
      name,
      path: relativePath || name
    };
  }

  const node: RepoTreeNode = {
    kind: "directory",
    name,
    path: relativePath || name
  };

  if (depth >= MAX_DEPTH) {
    return node;
  }

  const entries = readdirSync(absolutePath)
    .map((entryName) => {
      const entryRelativePath = relativePath ? path.join(relativePath, entryName) : entryName;
      return buildNode(path.join(absolutePath, entryName), entryRelativePath, depth + 1);
    })
    .filter((entry): entry is RepoTreeNode => entry !== null)
    .sort(compareNodes)
    .slice(0, MAX_CHILDREN);

  if (entries.length > 0) {
    node.children = entries;
  }

  return node;
}

export const getRepoTree = cache((): RepoTreeNode[] => {
  const entries = readdirSync(REPO_ROOT)
    .map((entryName) => buildNode(path.join(REPO_ROOT, entryName), entryName, 0))
    .filter((entry): entry is RepoTreeNode => entry !== null)
    .sort(compareNodes)
    .slice(0, MAX_CHILDREN);

  return entries;
});
