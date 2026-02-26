import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { chmod, exists } from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import { download } from "@nomicfoundation/hardhat-utils/request";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import debug from "debug";

import { SOLX_GITHUB_RELEASES_BASE_URL } from "./constants.js";
import { getSolxAssetName } from "./platform.js";

const log = debug("hardhat:solx:downloader");

const DOWNLOAD_RETRY_COUNT = 3;
const DOWNLOAD_RETRY_DELAY_MS = 2000;

async function getSolxCacheDir(version: string): Promise<string> {
  const globalCacheDir = await getCacheDir();
  return path.join(globalCacheDir, `solx-v${version}`);
}

export async function downloadSolx(version: string): Promise<string> {
  const assetName = getSolxAssetName(version);
  const cacheDir = await getSolxCacheDir(version);
  const binaryPath = path.join(cacheDir, assetName);

  // Return cached binary if it already exists
  if (await exists(binaryPath)) {
    log(`Using cached solx binary at ${binaryPath}`);
    return binaryPath;
  }

  // Use a mutex to prevent concurrent downloads of the same version
  const mutex = new MultiProcessMutex(`solx-download-${version}`);

  return mutex.use(async () => {
    // Re-check after acquiring the mutex (another process may have downloaded it)
    if (await exists(binaryPath)) {
      log(
        `Using cached solx binary at ${binaryPath} (downloaded by another process)`,
      );
      return binaryPath;
    }

    // Tag format: no "v" prefix (e.g., "0.1.3" not "v0.1.3")
    const url = `${SOLX_GITHUB_RELEASES_BASE_URL}/${version}/${assetName}`;
    log(`Downloading solx ${version} from ${url}`);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= DOWNLOAD_RETRY_COUNT; attempt++) {
      try {
        await download(url, binaryPath);

        // Set executable permission on Unix
        if (process.platform !== "win32") {
          await chmod(binaryPath, 0o755);
        }

        log(`Successfully downloaded solx ${version}`);
        return binaryPath;
      } catch (error) {
        ensureError(error);
        lastError = error;
        log(
          `Download attempt ${attempt}/${DOWNLOAD_RETRY_COUNT} failed: ${lastError.message}`,
        );

        if (attempt < DOWNLOAD_RETRY_COUNT) {
          await new Promise((resolve) =>
            setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS),
          );
        }
      }
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.UNSUPPORTED_OPERATION,
      {
        operation: `download solx ${version} (failed after ${DOWNLOAD_RETRY_COUNT} attempts: ${lastError?.message})`,
      },
    );
  });
}
