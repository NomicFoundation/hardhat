// NOTE: We don't use the `semver` package because it's slow to load, and this
// is always run during the initialization of the CLI.
//
// NOTE: This file shouldn't import any non-builtin dependency, as it's imported
// before enabling source maps support.
//
// EXCEPTION: we share `getRuntimeInfo` with the rest of the codebase instead
// of duplicating it. The helper has no transitive dependencies, so the risk of
// an unreadable stack trace from its import graph is negligible.

import { getRuntimeInfo } from "@nomicfoundation/hardhat-utils/runtime";

/**
 * The minimum supported version of each Node.js major that has one, sorted by
 * major.
 *
 * Majors below the first entry aren't supported. Majors above it without an
 * entry of their own (e.g. odd majors, or newer ones) are supported.
 */
export const MIN_SUPPORTED_NODE_VERSIONS: Array<[number, number, number]> = [
  [22, 18, 0],
  [24, 3, 0],
];

/**
 * Returns the minimum supported version of the given Node.js major, or the
 * lowest minimum supported version if that major doesn't have its own.
 */
export function getMinSupportedNodeVersion(
  major: number,
): [number, number, number] {
  return (
    MIN_SUPPORTED_NODE_VERSIONS.find(([minMajor]) => minMajor === major) ??
    MIN_SUPPORTED_NODE_VERSIONS[0]
  );
}

export function isNodeVersionSupported(): boolean {
  try {
    const [majorStr, minorStr, patchStr] = process.versions.node.split(".");
    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    const [minMajor, minMinor, minPatch] = getMinSupportedNodeVersion(major);

    if (major < minMajor) {
      return false;
    } else if (major > minMajor) {
      return true;
    }

    if (minor < minMinor) {
      return false;
    } else if (minor > minMinor) {
      return true;
    }

    if (patch < minPatch) {
      return false;
    }
  } catch {
    // If our parsing of the version fails we assume it's supported.
    return true;
  }

  return true;
}

export function exitIfNodeVersionNotSupported(): void {
  // Only enforce the Node.js version when we're actually running on Node.js.
  // Bun and Deno emulate `process.versions.node`, so checking it there would
  // incorrectly reject users on those runtimes.
  if (getRuntimeInfo()?.runtime !== "node") {
    return;
  }

  if (!isNodeVersionSupported()) {
    const major = parseInt(process.versions.node.split(".")[0], 10);

    console.error(
      `\nERROR: You are using Node.js ${process.versions.node} which is not supported by Hardhat.\n` +
        `Please upgrade to Node.js ${getMinSupportedNodeVersion(major).join(".")} or later.\n`,
    );

    process.exit(1);
  }
}
