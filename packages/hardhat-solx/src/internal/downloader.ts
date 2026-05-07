import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  chmod,
  exists,
  readBinaryFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import { download, getRequest } from "@nomicfoundation/hardhat-utils/request";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { SOLX_RELEASES_BASE_URL } from "./constants.js";
import { getSolxAssetName } from "./platform.js";

const log = createDebug("hardhat:solx:downloader");

const DOWNLOAD_RETRY_COUNT = 3;
const DOWNLOAD_RETRY_DELAY_MS = 2000;

/**
 * Returns the deterministic path where a solx binary for the given version
 * would be cached. This is a pure function — it does not check whether the
 * binary exists on disk.
 */
export async function getSolxBinaryPath(solxVersion: string): Promise<string> {
  const assetName = getSolxAssetName(solxVersion);
  const globalCacheDir = await getCacheDir();
  return path.join(
    globalCacheDir,
    "compilers-v3",
    `solx-v${solxVersion}`,
    assetName,
  );
}

/**
 * Verifies the SHA-256 checksum of a downloaded binary against a `.sha256`
 * sidecar file on the mirror. If the sidecar file is not available (e.g. for
 * stable releases), verification is skipped. If it is available and the
 * checksum doesn't match, the downloaded file is deleted and false is returned.
 */
async function verifyChecksum(
  binaryPath: string,
  checksumUrl: string,
): Promise<boolean> {
  try {
    const response = await getRequest(checksumUrl);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      log(
        `No .sha256 sidecar file at ${checksumUrl} (status ${response.statusCode}), skipping verification`,
      );
      return true;
    }

    // The sidecar file contains the hex-encoded SHA-256 hash, possibly with
    // a filename suffix (like sha256sum output). We only need the hash part.
    const text = (await response.body.text()).trim();
    const expectedHash = text.split(/\s+/)[0].toLowerCase();

    const { sha256 } = await import("@nomicfoundation/hardhat-utils/crypto");
    const { bytesToHexString } = await import(
      "@nomicfoundation/hardhat-utils/hex"
    );

    const binaryContents = await readBinaryFile(binaryPath);
    const actualHash = bytesToHexString(await sha256(binaryContents))
      .slice(2) // remove 0x prefix
      .toLowerCase();

    if (expectedHash !== actualHash) {
      log(
        `SHA-256 mismatch for ${binaryPath}: expected ${expectedHash}, got ${actualHash}`,
      );
      await remove(binaryPath);
      return false;
    }

    log(`SHA-256 checksum verified for ${binaryPath}`);
    return true;
  } catch (error) {
    ensureError(error);
    log(
      `Could not verify checksum from ${checksumUrl}: ${error.message}, skipping verification`,
    );
    return true;
  }
}

/**
 * Downloads the solx binary for the given version if not already cached.
 * Returns the path to the binary on disk.
 *
 * @param solxVersion - The solx version to download (e.g. "0.1.3")
 * @param downloadFunction - Optional injectable download function for testing.
 *   Defaults to the real `download` from `@nomicfoundation/hardhat-utils/request`.
 */
export async function downloadSolx(
  solxVersion: string,
  downloadFunction: typeof download = download,
): Promise<string> {
  const binaryPath = await getSolxBinaryPath(solxVersion);

  // Return cached binary if it already exists
  if (await exists(binaryPath)) {
    log(`Using cached solx binary at ${binaryPath}`);
    return binaryPath;
  }

  const globalCacheDir = await getCacheDir();
  const mutex = new MultiProcessMutex(
    path.join(globalCacheDir, `solx-download-${solxVersion}`),
  );
  const assetName = getSolxAssetName(solxVersion);
  const url = `${SOLX_RELEASES_BASE_URL}/${assetName}`;
  log(`Downloading solx ${solxVersion} from ${url}`);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= DOWNLOAD_RETRY_COUNT; attempt++) {
    // Use a mutex per retry iteration so other processes can proceed
    // between retries
    const result = await mutex.use(async () => {
      // Check if another process downloaded it while we waited for the mutex
      if (await exists(binaryPath)) {
        log(
          `Using cached solx binary at ${binaryPath} (downloaded by another process)`,
        );
        return binaryPath;
      }

      try {
        await downloadFunction(url, binaryPath);

        // Verify SHA-256 checksum if a sidecar file is available
        const checksumUrl = `${SOLX_RELEASES_BASE_URL}/${assetName}.sha256`;
        const checksumValid = await verifyChecksum(binaryPath, checksumUrl);
        if (!checksumValid) {
          lastError = new Error("SHA-256 checksum verification failed");
          return undefined;
        }

        // Set executable permission on Unix
        if (process.platform !== "win32") {
          await chmod(binaryPath, 0o755);
        }

        log(`Successfully downloaded solx ${solxVersion}`);
        return binaryPath;
      } catch (error) {
        ensureError(error);
        lastError = error;
        log(
          `Download attempt ${attempt}/${DOWNLOAD_RETRY_COUNT} failed: ${lastError.message}`,
        );
        return undefined;
      }
    });

    if (result !== undefined) {
      return result;
    }

    if (attempt < DOWNLOAD_RETRY_COUNT) {
      await new Promise((resolve) =>
        setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS),
      );
    }
  }

  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_SOLX.GENERAL.DOWNLOAD_FAILED,
    {
      version: solxVersion,
      attempts: DOWNLOAD_RETRY_COUNT.toString(),
      reason: lastError?.message ?? "unknown error",
    },
    lastError,
  );
}
