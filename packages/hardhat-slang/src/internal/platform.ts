import os from "node:os";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Returns the platform-specific base name for the slang binary (without version suffix).
 * The full asset name is `${baseName}-v${version}` (or `.exe` on Windows).
 *
 * Actual GitHub release assets (e.g., for v0.1.4):
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

export function getSlangAssetName(version: string): string {
  const baseName = getSlangBinaryBaseName();
  if (process.platform === "win32") {
    return `${baseName}-v${version}.exe`;
  }
  return `${baseName}-v${version}`;
}
