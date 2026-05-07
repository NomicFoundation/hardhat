import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dirname, "..", "..");

export interface FilePackage {
  name: string;
  path: string;
  filePathInPackage: string;
}

export interface FileGroup {
  pkg: { name: string; path: string };
  files: string[];
}

export function getRootDir(): string {
  return ROOT_DIR;
}

/**
 * Walk up from a file path to find the owning workspace package by locating
 * the nearest ancestor `package.json` with a `name` field. Stops at ROOT_DIR
 * (the root package.json is not a workspace package for this purpose).
 */
export function resolveFilePackage(filePath: string): FilePackage {
  const absolute = isAbsolute(filePath) ? filePath : resolve(filePath);
  let dir = absolute;

  while (true) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not find an owning workspace package for: ${filePath}`,
      );
    }
    dir = parent;

    if (dir === ROOT_DIR) {
      throw new Error(
        `Path is not inside a workspace package: ${filePath}\n` +
          `Files outside packages/* are not supported by file-level wrappers.`,
      );
    }

    const candidate = resolve(dir, "package.json");
    if (!existsSync(candidate)) {
      continue;
    }

    const pkg: { name?: string } = JSON.parse(readFileSync(candidate, "utf-8"));
    if (pkg.name === undefined) {
      continue;
    }

    return {
      name: pkg.name,
      path: dir,
      filePathInPackage: relative(dir, absolute),
    };
  }
}

/**
 * Group file paths by their owning workspace package. Returns a Map keyed by
 * package name; each entry has the package metadata and the list of file
 * paths relative to the package root.
 */
export function groupByPackage(filePaths: string[]): Map<string, FileGroup> {
  const groups = new Map<string, FileGroup>();
  for (const filePath of filePaths) {
    const resolved = resolveFilePackage(filePath);
    let group = groups.get(resolved.name);
    if (group === undefined) {
      group = {
        pkg: { name: resolved.name, path: resolved.path },
        files: [],
      };
      groups.set(resolved.name, group);
    }
    group.files.push(resolved.filePathInPackage);
  }
  return groups;
}
