import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getRequest } from "@nomicfoundation/hardhat-utils/request";

import {
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SOLX_RELEASES_BASE_URL,
} from "../src/internal/constants.js";

// Every release asset the mirror must serve for a solx version (the
// platform-specific names from platform.ts). A user on any supported
// platform downloads exactly one of these, so a missing asset means a
// broken compile for that platform. The `.sha256` sidecars are included
// because the downloader treats a missing sidecar as a soft warning and
// skips verification — this test is the only hard check that they exist.
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
          for (const file of [asset, `${asset}.sha256`]) {
            // 1-byte range request: availability check without downloading
            // the ~60 MB binaries.
            const response = await getRequest(
              `${SOLX_RELEASES_BASE_URL}/${file}`,
              { extraHeaders: { Range: "bytes=0-0" } },
            );
            await response.body.text();
            if (response.statusCode !== 200 && response.statusCode !== 206) {
              missing.push(`${file} (${response.statusCode})`);
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
