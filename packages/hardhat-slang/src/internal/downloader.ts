import type { SlangRelease } from "./constants.js";
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

import { SLANG_RELEASES_BASE_URL } from "./constants.js";
import { getSlangAssetName } from "./platform.js";

const log = createDebug("hardhat:slang:downloader");

const DOWNLOAD_RETRY_COUNT = 3;
const SHA256_HEX_DIGEST_LENGTH = 64;
const DOWNLOAD_RETRY_DELAY_MS = 2000;

/**
 * Returns the deterministic path where the binary of the given slang release
 * would be cached. This is a pure function — it does not check whether the
 * binary exists on disk.
 */
export async function getSlangBinaryPath(
  slangVersion: string,
  release: SlangRelease,
): Promise<string> {
  const assetName = getSlangAssetName(slangVersion, release);
  const globalCacheDir = await getCacheDir();
  return path.join(
    globalCacheDir,
    "compilers-v3",
    `slang-v${slangVersion}`,
    assetName,
  );
}

export interface DownloadSlangOptions {
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
 * Downloads the binary of the given slang release if not already cached.
 * Returns the path to the binary on disk.
 *
 * @param slangVersion - The slang version to download (e.g. "0.1.0-pre.2026-10-01")
 * @param release - The release table row for that version
 * @param onBinaryDownloadStart - A callback invoked once the compiler download is about to start
 * @param options - See {@link DownloadSlangOptions}.
 */
export async function downloadSlang(
  slangVersion: string,
  release: SlangRelease,
  onBinaryDownloadStart: () => void,
  options: DownloadSlangOptions = {},
): Promise<string> {
  const { dispatcher, retryDelayMs = DOWNLOAD_RETRY_DELAY_MS } = options;
  const binaryPath = await getSlangBinaryPath(slangVersion, release);

  // Return cached binary if it already exists
  if (await exists(binaryPath)) {
    log(`Using cached slang binary at ${binaryPath}`);
    return binaryPath;
  }

  const globalCacheDir = await getCacheDir();
  const mutex = new MultiProcessMutex(
    path.join(globalCacheDir, `slang-download-${slangVersion}`),
  );
  const assetName = getSlangAssetName(slangVersion, release);
  const baseUrl = release.assetOverride?.baseUrl ?? SLANG_RELEASES_BASE_URL;
  const url = `${baseUrl}/${assetName}`;

  // The checksum is required, we fail immediately if we can't get it.
  const expectedChecksum = await downloadExpectedChecksum(
    slangVersion,
    `${url}.sha256`,
    dispatcher,
  );

  log(`Downloading slang ${slangVersion} from ${url}`);

  for (let attempt = 1; attempt <= DOWNLOAD_RETRY_COUNT; attempt++) {
    try {
      // Use a mutex per retry iteration so other processes can proceed
      // between retries
      return await mutex.use(async () => {
        // Check if another process downloaded it while we waited for the mutex
        if (await exists(binaryPath)) {
          log(
            `Using cached slang binary at ${binaryPath} (downloaded by another process)`,
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
            HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.INVALID_DOWNLOAD,
            { version: slangVersion },
          );
        }

        // Set executable permission on Unix
        if (process.platform !== "win32") {
          await chmod(downloadPath, 0o755);
        }

        await move(downloadPath, binaryPath);

        log(`Successfully downloaded slang ${slangVersion}`);
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
          HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.DOWNLOAD_FAILED,
          {
            version: slangVersion,
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
 * Downloads the expected SHA-256 checksum of a slang asset from its `.sha256`
 * sidecar file on the mirror.
 */
async function downloadExpectedChecksum(
  slangVersion: string,
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
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: slangVersion,
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
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: slangVersion,
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
