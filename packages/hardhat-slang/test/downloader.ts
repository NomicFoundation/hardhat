import type {
  Interceptable,
  TestDispatcher,
} from "@nomicfoundation/hardhat-utils/request";

import assert from "node:assert/strict";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  makeWorkspaceTmpDir,
  safeRemoveTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { sha256 } from "@nomicfoundation/hardhat-utils/crypto";
import { ensureDir, exists } from "@nomicfoundation/hardhat-utils/fs";
import {
  resetMockCacheDir,
  setMockCacheDir,
} from "@nomicfoundation/hardhat-utils/global-dir";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { getTestDispatcher } from "@nomicfoundation/hardhat-utils/request";

import { SLANG_RELEASES_BASE_URL } from "../src/internal/constants.js";
import {
  downloadSlang,
  getSlangBinaryPath,
} from "../src/internal/downloader.js";
import { getSlangAssetName } from "../src/internal/platform.js";

const TEST_SLANG_VERSION = "0.0.1-test";

const BINARY_CONTENTS = "#!/bin/sh\necho slang 0.0.1-test\n";

const RETRY_COUNT = 3;

const noop = (): void => {};

describe("hardhat-slang downloader", () => {
  let tmpDir: string;
  let mockAgent: TestDispatcher;
  let assetName: string;
  let expectedDigest: string;

  let mockedInterceptor: Interceptable;

  function interceptChecksum(
    interceptable: Interceptable,
    body: string,
    times = 1,
  ): void {
    interceptable
      .intercept({ path: `/${assetName}.sha256`, method: "GET" })
      .reply(200, body)
      .times(times);
  }

  function interceptBinary(
    interceptable: Interceptable,
    body: string,
    times = 1,
  ): void {
    interceptable
      .intercept({ path: `/${assetName}`, method: "GET" })
      .reply(200, body)
      .times(times);
  }

  beforeEach(async () => {
    tmpDir = await makeWorkspaceTmpDir("slang-downloader");
    setMockCacheDir(tmpDir);

    assetName = getSlangAssetName(TEST_SLANG_VERSION);
    expectedDigest = bytesToHexString(
      await sha256(Buffer.from(BINARY_CONTENTS)),
    ).slice(2);

    mockAgent = await getTestDispatcher();
    mockedInterceptor = mockAgent.get(SLANG_RELEASES_BASE_URL);

    // Any request the tests don't intercept is a bug, not a network call.
    mockAgent.disableNetConnect();
  });

  afterEach(async () => {
    mockAgent.enableNetConnect();
    await mockAgent.close();

    resetMockCacheDir();

    await safeRemoveTmpDir(tmpDir);
  });

  it("should successfully verify the download against the sidecar and keep the binary", async () => {
    interceptChecksum(mockedInterceptor, expectedDigest);
    interceptBinary(mockedInterceptor, BINARY_CONTENTS);

    const binaryPath = await downloadSlang(TEST_SLANG_VERSION, noop, {
      dispatcher: mockAgent,
    });

    assert.equal(binaryPath, await getSlangBinaryPath(TEST_SLANG_VERSION));
    assert.ok(await exists(binaryPath), "the binary should have been kept");

    if (process.platform === "win32") {
      return;
    }

    const { mode } = await stat(binaryPath);
    assert.equal(
      mode.toString(8).slice(-3),
      "755",
      "the binary should be executable",
    );
  });

  it("should accept a sha256sum-style sidecar, with the filename after the digest", async () => {
    interceptChecksum(mockedInterceptor, `${expectedDigest}  ${assetName}`);
    interceptBinary(mockedInterceptor, BINARY_CONTENTS);

    const binaryPath = await downloadSlang(TEST_SLANG_VERSION, noop, {
      dispatcher: mockAgent,
    });

    assert.ok(
      await exists(binaryPath),
      "the digest should have been read from before the filename",
    );
  });

  it("should accept an uppercase digest", async () => {
    interceptChecksum(mockedInterceptor, expectedDigest.toUpperCase());
    interceptBinary(mockedInterceptor, BINARY_CONTENTS);

    const binaryPath = await downloadSlang(TEST_SLANG_VERSION, noop, {
      dispatcher: mockAgent,
    });

    assert.ok(
      await exists(binaryPath),
      "digest comparison should be case-insensitive",
    );
  });

  it("fails when the sidecar request errors", async () => {
    mockedInterceptor
      .intercept({ path: `/${assetName}.sha256`, method: "GET" })
      .replyWithError(new Error("socket hang up"));

    await assertRejectsWithHardhatError(
      downloadSlang(TEST_SLANG_VERSION, noop, { dispatcher: mockAgent }),
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: TEST_SLANG_VERSION,
        url: `${SLANG_RELEASES_BASE_URL}/${assetName}.sha256`,
        reason: "socket hang up",
      },
    );
  });

  it("should fail without downloading the binary when the sidecar is missing", async () => {
    mockedInterceptor
      .intercept({ path: `/${assetName}.sha256`, method: "GET" })
      .reply(404, "Not Found");

    await assertRejectsWithHardhatError(
      downloadSlang(TEST_SLANG_VERSION, noop, { dispatcher: mockAgent }),
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: TEST_SLANG_VERSION,
        url: `${SLANG_RELEASES_BASE_URL}/${assetName}.sha256`,
        reason: "the mirror responded with status 404",
      },
    );

    assert.equal(
      await exists(await getSlangBinaryPath(TEST_SLANG_VERSION)),
      false,
      "no binary should be left behind",
    );
  });

  it("fails when the sidecar isn't a digest, without downloading the binary", async () => {
    // A proxy serving its own error page with a 200 is the realistic case.
    interceptChecksum(mockedInterceptor, "<html><body>Not Found</body></html>");

    await assertRejectsWithHardhatError(
      downloadSlang(TEST_SLANG_VERSION, noop, { dispatcher: mockAgent }),
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.CHECKSUM_DOWNLOAD_FAILED,
      {
        version: TEST_SLANG_VERSION,
        url: `${SLANG_RELEASES_BASE_URL}/${assetName}.sha256`,
        reason: "the response didn't contain a SHA-256 digest",
      },
    );

    assert.equal(
      await exists(await getSlangBinaryPath(TEST_SLANG_VERSION)),
      false,
      "no binary should be left behind",
    );
  });

  it("deletes the binary and fails when the digest doesn't match", async () => {
    interceptChecksum(mockedInterceptor, expectedDigest, RETRY_COUNT);
    interceptBinary(
      mockedInterceptor,
      "a different binary entirely",
      RETRY_COUNT,
    );

    await assertRejectsWithHardhatError(
      downloadSlang(TEST_SLANG_VERSION, noop, {
        dispatcher: mockAgent,
        retryDelayMs: 0,
      }),
      HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.INVALID_DOWNLOAD,
      { version: TEST_SLANG_VERSION },
    );

    assert.equal(
      await exists(await getSlangBinaryPath(TEST_SLANG_VERSION)),
      false,
      "a binary that failed verification must not be left on disk",
    );
  });

  it("recovers when a retry downloads the binary correctly", async () => {
    interceptChecksum(mockedInterceptor, expectedDigest, 2);
    interceptBinary(mockedInterceptor, "truncated");
    interceptBinary(mockedInterceptor, BINARY_CONTENTS);

    const binaryPath = await downloadSlang(TEST_SLANG_VERSION, noop, {
      dispatcher: mockAgent,
      retryDelayMs: 0,
    });

    assert.ok(
      await exists(binaryPath),
      "the retry should have replaced the truncated download",
    );
  });

  it("leaves no temporary file behind after a successful download", async () => {
    interceptChecksum(mockedInterceptor, expectedDigest);
    interceptBinary(mockedInterceptor, BINARY_CONTENTS);

    const binaryPath = await downloadSlang(TEST_SLANG_VERSION, noop, {
      dispatcher: mockAgent,
    });

    assert.ok(
      !(await exists(`${binaryPath}.tmp`)),
      "the download path should have been renamed into place, not copied",
    );
  });

  it("returns a cached binary without making any request", async () => {
    // No interceptors at all: reaching the network would throw.
    const binaryPath = await getSlangBinaryPath(TEST_SLANG_VERSION);

    await ensureDir(path.dirname(binaryPath));
    await writeFile(binaryPath, BINARY_CONTENTS);

    assert.equal(
      await downloadSlang(TEST_SLANG_VERSION, noop, {
        dispatcher: mockAgent,
      }),
      binaryPath,
    );
  });
});
