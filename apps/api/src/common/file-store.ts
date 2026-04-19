import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export function ensureDirectory(dirPath: string) {
  mkdirSync(dirPath, { recursive: true });
}

export function resolveDataPath(rootDir: string, ...segments: string[]) {
  return path.join(rootDir, ...segments);
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, value: unknown) {
  ensureDirectory(path.dirname(filePath));
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export function writeBufferFile(filePath: string, value: Buffer) {
  ensureDirectory(path.dirname(filePath));
  writeFileSync(filePath, value);
}

export function readFileStats(filePath: string) {
  return statSync(filePath);
}

export function createFileReadStream(filePath: string) {
  return createReadStream(filePath);
}
