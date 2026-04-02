import os from "node:os";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Returns the platform-specific base name for the solx binary (without version suffix).
 * The full asset name is `${baseName}-v${version}` (or `.exe` on Windows).
 *
 * Actual GitHub release assets (e.g., for v0.1.3):
 *   solx-linux-amd64-gnu-v0.1.3
 *   solx-linux-arm64-gnu-v0.1.3
 *   solx-macosx-v0.1.3           (universal binary)
 *   solx-windows-amd64-gnu-v0.1.3.exe
 */
export function getSolxBinaryBaseName(): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "linux" && arch === "x64") return "solx-linux-amd64-gnu";
  if (platform === "linux" && arch === "arm64") return "solx-linux-arm64-gnu";
  if (platform === "darwin") return "solx-macosx";
  if (platform === "win32" && arch === "x64") return "solx-windows-amd64-gnu";

  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_SOLX.GENERAL.UNSUPPORTED_PLATFORM,
    {
      platform,
      arch,
    },
  );
}

export function getSolxAssetName(version: string): string {
  const baseName = getSolxBinaryBaseName();
  if (process.platform === "win32") {
    return `${baseName}-v${version}.exe`;
  }
  return `${baseName}-v${version}`;
}
