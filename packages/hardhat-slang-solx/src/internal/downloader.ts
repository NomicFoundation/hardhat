import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import type { Dispatcher } from "@nomicfoundation/hardhat-utils/request";

import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { sha256 } from "@nomicfoundation/hardhat-utils/crypto";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  chmod,
  exists,
  move,
  readBinaryFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import {
  bytesToHexString,
  getPrefixedHexString,
  getUnprefixedHexString,
  isHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import {
  download,
  getRequest,
  ResponseStatusCodeError,
} from "@nomicfoundation/hardhat-utils/request";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { SOLX_RELEASES_BASE_URL } from "./constants.js";
import { getSolxAssetName } from "./platform.js";

const log = createDebug("hardhat:slang-solx:downloader");

const DOWNLOAD_RETRY_COUNT = 3;
const SHA256_HEX_DIGEST_LENGTH = 64;
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

export interface DownloadSolxOptions {
  /**
   * The dispatcher used for the checksum and binary requests. Intended for
   * tests.
   */
  dispatcher?: Dispatcher;

  /**
   * How long to wait between download attempts. Intended for tests.
   */
  retryDelayMs?: number;
}

/**
 * Downloads the solx binary for the given version if not already cached.
 * Returns the path to the binary on disk.
 *
 * @param solxVersion - The solx version to download (e.g. "0.1.3")
 * @param onBinaryDownloadStart - A callback invoked once the compiler download is about to start
 * @param options - See {@link DownloadSolxOptions}.
 */
export async function downloadSolx(
  solxVersion: string,
  onBinaryDownloadStart: () => void,
  options: DownloadSolxOptions = {},
): Promise<string> {
  const { dispatcher, retryDelayMs = DOWNLOAD_RETRY_DELAY_MS } = options;
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

  // The checksum is required, we fail immediately if we can't get it.
  const expectedChecksum = await downloadExpectedChecksum(
    solxVersion,
    `${url}.sha256`,
    dispatcher,
  );

  log(`Downloading solx ${solxVersion} from ${url}`);

  for (let attempt = 1; attempt <= DOWNLOAD_RETRY_COUNT; attempt++) {
    try {
      // Use a mutex per retry iteration so other processes can proceed
      // between retries
      return await mutex.use(async () => {
        // Check if another process downloaded it while we waited for the mutex
        if (await exists(binaryPath)) {
          log(
            `Using cached solx binary at ${binaryPath} (downloaded by another process)`,
          );

          return binaryPath;
        }

        // Signal download start only on the first attempt
        if (attempt === 1) {
          onBinaryDownloadStart();
        }

        // Download to a temporary path, we move into place after verifying the checksum
        const downloadPath = `${binaryPath}.tmp`;

        await download(url, downloadPath, {}, dispatcher);

        const checksumValid = await verifyChecksum(
          downloadPath,
          expectedChecksum,
        );

        if (!checksumValid) {
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL.INVALID_DOWNLOAD,
            { version: solxVersion },
          );
        }

        // Set executable permission on Unix
        if (process.platform !== "win32") {
          await chmod(downloadPath, 0o755);
        }

        await move(downloadPath, binaryPath);

        log(`Successfully downloaded solx ${solxVersion}`);
        return binaryPath;
      });
    } catch (error) {
      ensureError(error);
      log(
        `Download attempt ${attempt}/${DOWNLOAD_RETRY_COUNT} failed: ${error.message}`,
      );

      if (attempt === DOWNLOAD_RETRY_COUNT) {
        if (HardhatError.isHardhatError(error)) {
          throw error;
        }

        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL.DOWNLOAD_FAILED,
          {
            version: solxVersion,
            attempts: DOWNLOAD_RETRY_COUNT.toString(),
            reason: error.message,
          },
          error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  assertHardhatInvariant(
    false,
    "the retry loop always returns or throws on its last attempt",
  );
}

/**
 * Compares a downloaded binary against its expected SHA-256 checksum. On a
 * mismatch the file is deleted and false is returned, leaving the caller to
 * raise the error.
 *
 * This runs against the path the binary was downloaded to, before it is
 * published to the path callers read, so a mismatch is deleted without ever
 * having been visible.
 */
async function verifyChecksum(
  downloadPath: string,
  expectedChecksum: PrefixedHexString,
): Promise<boolean> {
  const binaryContents = await readBinaryFile(downloadPath);
  const actualChecksum = bytesToHexString(await sha256(binaryContents));

  if (expectedChecksum !== actualChecksum) {
    log(
      `SHA-256 mismatch for ${downloadPath}: expected ${expectedChecksum}, got ${actualChecksum}`,
    );

    await remove(downloadPath);

    return false;
  }

  log(`SHA-256 checksum verified for ${downloadPath}`);
  return true;
}

/**
 * Downloads the expected SHA-256 checksum of a solx asset from its `.sha256`
 * sidecar file on the mirror.
 */
async function downloadExpectedChecksum(
  solxVersion: string,
  checksumUrl: string,
  dispatcher?: Dispatcher,
): Promise<PrefixedHexString> {
  let body: string;

  try {
    const response = await getRequest(checksumUrl, {}, dispatcher);

    body = (await response.body.text()).trim();
  } catch (error) {
    ensureError(error);

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: solxVersion,
        url: checksumUrl,
        reason: describeChecksumRequestFailure(error),
      },
      error,
    );
  }

  // The sidecar file contains the hex-encoded SHA-256 digest, possibly with a
  // filename suffix, the way sha256sum writes it. We only need the digest.
  const expectedChecksum = body.split(/\s+/)[0].toLowerCase();

  // This is a guard against a failed HTTP lookup returning an HTML error rather
  // than the expected digest.
  if (
    !isHexString(expectedChecksum) ||
    getUnprefixedHexString(expectedChecksum).length !== SHA256_HEX_DIGEST_LENGTH
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_SLANG_SOLX.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: solxVersion,
        url: checksumUrl,
        reason: "the response didn't contain a SHA-256 digest",
      },
    );
  }

  return getPrefixedHexString(expectedChecksum);
}

function describeChecksumRequestFailure(error: Error): string {
  if (error instanceof ResponseStatusCodeError) {
    return `the mirror responded with status ${error.statusCode}`;
  }

  const { cause } = error;
  if (cause instanceof Error && cause.message !== "") {
    return cause.message;
  }

  return error.message;
}
