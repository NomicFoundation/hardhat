import type { SlangRelease } from "./constants.js";

import os from "node:os";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Returns the platform-specific base name for the slang binary (without version suffix).
 * The full asset name is `${baseName}-v${version}` (or `.exe` on Windows),
 * unless the release overrides the suffix.
 *
 * The slang pipeline ships as the `solx` binary built with its Slang front
 * end, so the assets keep the `solx-` prefix for now:
 *   solx-linux-amd64-gnu-v0.1.4
 *   solx-linux-arm64-gnu-v0.1.4
 *   solx-macosx-v0.1.4           (universal binary)
 *   solx-windows-amd64-gnu-v0.1.4.exe
 */
export function getSlangBinaryBaseName(): string {
  // TODO: revisit before release to finalize.
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "linux" && arch === "x64") return "solx-linux-amd64-gnu";
  if (platform === "linux" && arch === "arm64") return "solx-linux-arm64-gnu";
  if (platform === "darwin") return "solx-macosx";
  if (platform === "win32" && arch === "x64") return "solx-windows-amd64-gnu";

  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.UNSUPPORTED_PLATFORM,
    {
      platform,
      arch,
    },
  );
}

/**
 * Returns the release asset name for the given slang release on the current
 * platform: `${baseName}-v${version}`, or the release's own suffix when it
 * isn't published under the standard naming.
 */
export function getSlangAssetName(
  version: string,
  release: SlangRelease,
): string {
  const baseName = getSlangBinaryBaseName();
  const suffix = release.assetOverride?.assetSuffix ?? `v${version}`;
  if (process.platform === "win32") {
    return `${baseName}-${suffix}.exe`;
  }
  return `${baseName}-${suffix}`;
}
