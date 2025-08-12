export const ANONYMIZED_PATH = "<user-path>";

/**
 * Anonymizes all user paths contained in str, except for:
 *   - Node.js core modules
 *   - node_modules files
 *   - Yarn cache files
 *   - pnpm global store
 *   - bare file names (i.e. foo.json)
 *
 * Note that in the case where a path is not a Node.js core module,
 * it does anonymize the directory containing the outermost node_modules or
 * yarn cache folder.
 * e.g. `/home/user/node_modules/my-package/node_modules/some-other-package`
 * will be anonymized to `<user-path>/node_modules/my-package/node_modules/some-other-package`.
 *
 * This function supports both Windows and Unix paths, as well as `file://` URLs,
 * preserving the original format. It may normalize all path separators to `/`.
 *
 * It also supports all major node package managers, including pnpm, yarn, and npm.
 *
 * Finally, it should work with strings that are paths in their entirety, as well as
 * messages that contain paths, such as error messages.
 **/
export function anonymizeUserPaths(str: string): string {
  if (str === "") {
    return str;
  }

  const parts = [
    // 1) file:// URLs (host optional). Stops at whitespace or common closers.
    String.raw`file:\/\/[^\s'")<>]+`,

    // 2) node: URIs (e.g., node:fs, node:fs/promises)
    String.raw`node:[A-Za-z][A-Za-z0-9._-]*(?:\/[A-Za-z][A-Za-z0-9._-]*)*`,

    // 3) Windows UNC paths: \\server\share\folder\...
    String.raw`\\\\[^\\\/\s'")<>]+[\\\/][^\\\/\s'")<>]+(?:[\\\/][^\\\/\s'")<>]+)*[\\\/]?`,

    // 4) Windows absolute (drive): C:\a or D:/a/b
    String.raw`[A-Za-z]:[\\\/][^\\\/\s'")<>]+(?:[\\\/][^\\\/\s'")<>]+)*[\\\/]?`,

    // 5) Windows relative with dot(s): .\a, ..\a\b, ..\..\a
    String.raw`(?:\.{1,2}[\\\/])+[^\\\/\s'")<>]+(?:[\\\/][^\\\/\s'")<>]+)*[\\\/]?`,

    // 6) Unix relative with dot(s): ./a, ../a/b, ../../a
    String.raw`(?:\.{1,2}\/)+[^\/\s'")<>]+(?:\/[^\/\s'")<>]+)*\/?`,

    // 7) Windows relative without dot: a\b or a\b\c (must contain a separator)
    String.raw`[^\\\/\s'")<>]+[\\\/][^\\\/\s'")<>]+(?:[\\\/][^\\\/\s'")<>]+)*[\\\/]?`,

    // 8) Unix absolute: /a or /a/b
    String.raw`\/[^\/\s'")<>]+(?:\/[^\/\s'")<>]+)*\/?`,

    // 9) Unix relative without dot: a/b or a/b/c
    String.raw`[^\/\s'")<>]+\/[^\/\s'")<>]+(?:\/[^\/\s'")<>]+)*\/?`,
  ];

  const PATH_REGEX = new RegExp(`(?:${parts.join("|")})`, "gi");

  // We treat :line:column as part of the path, so we have a special case for
  // them
  const LOCATION_END_REGEX = /(:?:\d*)+$/;

  return str.replace(PATH_REGEX, (pathMatch) => {
    const locationMatch = pathMatch.match(LOCATION_END_REGEX);

    let anonymizedPath;
    if (locationMatch === null) {
      anonymizedPath = anonymizeSinglePath(pathMatch);
    } else {
      const locationEnd = locationMatch[0];
      anonymizedPath =
        anonymizeSinglePath(pathMatch.substring(0, locationMatch.index)) +
        locationEnd;
    }

    return anonymizedPath;
  });
}

function anonymizeSinglePath(path: string): string {
  // We don't anonymize node internals
  if (path.startsWith("node:") || path.startsWith("internal/")) {
    return path;
  }

  // Handle file:// URLs recursively
  if (path.startsWith("file://")) {
    const urlPath = path.substring(7); // Remove 'file://'
    const anonymizedPath = anonymizeSinglePath(urlPath);
    return `file://${anonymizedPath}`;
  }

  // Normalize path separators for easier processing
  const normalizedPath = path.replace(/\\/g, "/");

  // If the path starts with node_modules, we return it as is
  if (normalizedPath.startsWith("node_modules")) {
    return normalizedPath;
  }

  // We first get the index of the first /node_modules to desambiguate some
  // special cases below
  const nodeModulesIndex = normalizedPath.indexOf("/node_modules");

  // If the path is in the yarn cache
  const YARN_CACHE_VARIANTS = [".yarn/cache", ".cache/yarn", "Caches/Yarn"];
  for (const yarnCacheVariant of YARN_CACHE_VARIANTS) {
    const yarnCacheIndex = normalizedPath.indexOf(yarnCacheVariant);
    if (yarnCacheIndex !== -1) {
      // If the node_modules is before, we prioritize it
      if (nodeModulesIndex !== -1 && nodeModulesIndex < yarnCacheIndex) {
        continue;
      }

      const yarnCachePart = normalizedPath.substring(yarnCacheIndex);
      return `<user-path>/${yarnCachePart}`;
    }
  }

  // If the path is in the pnpm store
  const PNPM_STORE_VARIANTS = [".pnpm", ".pnpm-store"];
  for (const pnpmStoreVariant of PNPM_STORE_VARIANTS) {
    const pnpmStoreIndex = normalizedPath.indexOf(pnpmStoreVariant);
    if (pnpmStoreIndex !== -1) {
      // If the node_modules is before, we prioritize it
      if (nodeModulesIndex !== -1 && nodeModulesIndex < pnpmStoreIndex) {
        continue;
      }

      const pnpmStorePart = normalizedPath.substring(pnpmStoreIndex);
      return `<user-path>/${pnpmStorePart}`;
    }
  }

  // Finally, if the path contains node_modules
  if (nodeModulesIndex !== -1) {
    const nodeModulesPart = normalizedPath.substring(nodeModulesIndex);
    return `<user-path>${nodeModulesPart}`;
  }

  // Or we anonymize the entire path
  return "<user-path>";
}
