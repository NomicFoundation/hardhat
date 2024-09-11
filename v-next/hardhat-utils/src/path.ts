import path from "node:path";

/**
 * Resolves a user-provided path into an absolute path.
 *
 * If the path is already absolute, it is returned as is, otherwise it is
 * resolved relative to the root.
 *
 * @param root A root path to resolve relative paths against.
 * @param target The target path to resolve.
 * @returns An absolute path.
 */
export function resolveFromRoot(root: string, target: string): string {
  if (path.isAbsolute(target)) {
    return target;
  }

  return path.resolve(root, target);
}
