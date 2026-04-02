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

/**
 * Tries to return a shorter version of the path if its inside the given folder.
 *
 * This is useful for displaying paths in the terminal, as they can be shorter
 * when they are inside the current working directory. For example, if the
 * current working directory is `/home/user/project`, and the path is
 * `/home/user/project/contracts/File.sol`, the shorter path is
 * `contracts/File.sol`.
 *
 * @param absolutePath The path to shorten.
 * @param folder The absolute path to the folder.
 * @returns The shorter path, if possible, or the original path.
 */
export function shortenPath(absolutePath: string): string {
  const cwd = process.cwd();
  let relativePath = path.relative(cwd, absolutePath);

  if (relativePath === "..") {
    return ".." + path.sep;
  }

  if (
    !relativePath.startsWith(".." + path.sep) &&
    !relativePath.startsWith("." + path.sep) &&
    !path.isAbsolute(relativePath)
  ) {
    relativePath = "." + path.sep + relativePath;
  }

  if (relativePath.length < absolutePath.length) {
    return relativePath;
  }

  return absolutePath;
}
