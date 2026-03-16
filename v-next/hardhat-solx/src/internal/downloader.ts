import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { chmod, exists } from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import { download } from "@nomicfoundation/hardhat-utils/request";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import debug from "debug";

import { SOLX_RELEASES_BASE_URL } from "./constants.js";
import { getSolxAssetName } from "./platform.js";

const log = debug("hardhat:solx:downloader");

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
 * Downloads the solx binary for the given version if not already cached.
 * Returns the path to the binary on disk.
 */
export async function downloadSolx(solxVersion: string): Promise<string> {
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
  const url = `${SOLX_RELEASES_BASE_URL}/${solxVersion}/${getSolxAssetName(solxVersion)}`;
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
        await download(url, binaryPath);

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
  );
}
