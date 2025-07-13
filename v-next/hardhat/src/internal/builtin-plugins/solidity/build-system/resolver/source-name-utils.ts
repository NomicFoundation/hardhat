import path from "node:path";

/**
 * Transforms an fs path into a sourceName or import path, by normalizing their
 * path separators to /.
 *
 * Note that source
 *
 * Note: This function is exported for testing purposes, but it's not meant to
 * be used outside of the resolver.
 */
export function fsPathToSourceNamePath(fsPath: string): string {
  if (path.sep === "/") {
    return fsPath;
  }

  return fsPath.replace(/\\/g, "/");
}

/**
 * Transforms a sourceName or import path into an fs path, by normalizing their
 * path separators to /.
 *
 * Note: This function is exported for testing purposes, but it's not meant to
 * be used outside of the resolver.
 */
export function sourceNamePathToFsPath(sourceNamePath: string): string {
  if (path.sep === "/") {
    return sourceNamePath;
  }

  return sourceNamePath.replace(/\//g, "\\");
}

/**
 * The equivalent of path.join but for sourceName or import paths, not fs paths.
 *
 * Note: This function preserves trailing slashes.
 */
export function sourceNamePathJoin(...parts: string[]): string {
  return fsPathToSourceNamePath(path.join(...parts));
}
