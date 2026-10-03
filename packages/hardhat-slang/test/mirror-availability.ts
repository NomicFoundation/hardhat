import type { SlangRelease } from "../src/internal/constants.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getRequest,
  ResponseStatusCodeError,
} from "@nomicfoundation/hardhat-utils/request";

import {
  SLANG_RELEASES,
  SLANG_RELEASES_BASE_URL,
} from "../src/internal/constants.js";

// Mirrors the per-platform asset names built in src/internal/platform.ts.
function assetNames(version: string, release: SlangRelease): string[] {
  const suffix = release.assetOverride?.assetSuffix ?? `v${version}`;
  return [
    `solx-linux-amd64-gnu-${suffix}`,
    `solx-linux-arm64-gnu-${suffix}`,
    `solx-macosx-${suffix}`,
    `solx-windows-amd64-gnu-${suffix}.exe`,
  ];
}

describe(
  "slang releases availability",
  // Opt-in: run by the path-filtered mirror-availability job in ci.yml,
  // not on every PR that rebuilds this package.
  { skip: process.env.HARDHAT_RUN_MIRROR_TESTS !== "true" },
  () => {
    for (const [slangVersion, release] of Object.entries(SLANG_RELEASES)) {
      const baseUrl = release.assetOverride?.baseUrl ?? SLANG_RELEASES_BASE_URL;

      it(`serves every slang ${slangVersion} asset and checksum from ${baseUrl}`, async () => {
        const missing: string[] = [];
        for (const asset of assetNames(slangVersion, release)) {
          // Sidecars too: the downloader refuses to use a binary it can't verify
          for (const file of [asset, `${asset}.sha256`]) {
            try {
              const response = await getRequest(
                `${baseUrl}/${file}`,
                // 1-byte range: don't pull the ~100 MB binaries.
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
          `not served: ${missing.join(", ")} — the release table must not point at a slang release before its assets are published`,
        );
      });
    }
  },
);
