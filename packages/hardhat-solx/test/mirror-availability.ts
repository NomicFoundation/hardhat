import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getRequest,
  ResponseStatusCodeError,
} from "@nomicfoundation/hardhat-utils/request";

import {
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SOLX_RELEASES_BASE_URL,
} from "../src/internal/constants.js";

// Mirrors the per-platform asset names built in src/internal/platform.ts.
function assetNames(version: string): string[] {
  return [
    `solx-linux-amd64-gnu-v${version}`,
    `solx-linux-arm64-gnu-v${version}`,
    `solx-macosx-v${version}`,
    `solx-windows-amd64-gnu-v${version}.exe`,
  ];
}

describe(
  "solx releases mirror availability",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    for (const [solidityVersion, solxVersion] of Object.entries(
      SOLIDITY_TO_SOLX_VERSION_MAP,
    )) {
      it(`serves every solx ${solxVersion} asset and checksum (mapped from Solidity ${solidityVersion})`, async () => {
        const missing: string[] = [];
        for (const asset of assetNames(solxVersion)) {
          // Sidecars too: a missing one only soft-warns in the downloader.
          for (const file of [asset, `${asset}.sha256`]) {
            try {
              const response = await getRequest(
                `${SOLX_RELEASES_BASE_URL}/${file}`,
                // 1-byte range: don't pull the ~60 MB binaries.
                { extraHeaders: { Range: "bytes=0-0" } },
                // isTestDispatcher drops keep-alive to 10ms; these dispatchers
                // are never closed and would otherwise hang the suite.
                { timeout: 30_000, isTestDispatcher: true },
              );
              if (response.statusCode !== 200 && response.statusCode !== 206) {
                missing.push(`${file} (${response.statusCode})`);
              }
              await response.body.text();
            } catch (error) {
              // getRequest throws on >= 400 instead of returning the status.
              if (!(error instanceof ResponseStatusCodeError)) {
                throw error;
              }
              missing.push(`${file} (${error.statusCode})`);
            }
          }
        }
        assert.deepEqual(
          missing,
          [],
          `the mirror does not serve: ${missing.join(", ")} — the version map must not point at a solx release before solx-releases-mirror serves its assets`,
        );
      });
    }
  },
);
