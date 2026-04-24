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

export const MIN_SUPPORTED_NODE_VERSION: number[] = [22, 10, 0];

export function isNodeVersionSupported(): boolean {
  try {
    const [majorStr, minorStr, patchStr] = process.versions.node.split(".");
    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    if (major < MIN_SUPPORTED_NODE_VERSION[0]) {
      return false;
    } else if (major > MIN_SUPPORTED_NODE_VERSION[0]) {
      return true;
    }

    if (minor < MIN_SUPPORTED_NODE_VERSION[1]) {
      return false;
    } else if (minor > MIN_SUPPORTED_NODE_VERSION[1]) {
      return true;
    }

    if (patch < MIN_SUPPORTED_NODE_VERSION[2]) {
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
    process.stderr.write(
      `\nERROR: You are using Node.js ${process.versions.node} which is not supported by Hardhat.\n` +
        `Please upgrade to Node.js ${MIN_SUPPORTED_NODE_VERSION.join(".")} or later.\n\n`,
    );

    process.exit(1);
  }
}

export function warnIfUnofficialRuntime(): void {
  const info = getRuntimeInfo();

  if (info === undefined || info.runtime === "node") {
    return;
  }

  const runtimeName = info.runtime === "bun" ? "Bun" : "Deno";

  process.stderr.write(
    `\nWARNING: You are running Hardhat on ${runtimeName} ${info.version}. ${runtimeName} is not officially supported yet, so some functionality may not work as expected.\n\n`,
  );
}
