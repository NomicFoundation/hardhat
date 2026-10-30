import type { SlangRelease } from "../src/internal/constants.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import {
  getSlangAssetName,
  getSlangBinaryBaseName,
} from "../src/internal/platform.js";
import { getLatestSlangVersion } from "../src/internal/utils/slang-release-version.js";

const PINNED_VERSION = getLatestSlangVersion();
const PINNED_RELEASE = SLANG_RELEASES[PINNED_VERSION];

// A release served by the mirror under the standard `v${version}` naming.
const MIRROR_RELEASE: SlangRelease = {
  minSolidity: "0.8.0",
  maxSolidity: "0.8.36",
};

const EXE = process.platform === "win32" ? ".exe" : "";

describe("hardhat-slang platform detection", () => {
  it("returns a valid base name for the current platform", () => {
    const baseName = getSlangBinaryBaseName();
    assert.ok(typeof baseName === "string", "base name should be a string");
    assert.ok(
      baseName.startsWith("slang-"),
      "base name should start with 'slang-'",
    );
    assert.ok(baseName.length > 5, "base name should have meaningful length");
  });

  it("base name matches expected platform format", () => {
    const baseName = getSlangBinaryBaseName();
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "linux" && arch === "x64") {
      assert.equal(baseName, "slang-linux-amd64-gnu");
    } else if (platform === "linux" && arch === "arm64") {
      assert.equal(baseName, "slang-linux-arm64-gnu");
    } else if (platform === "darwin") {
      assert.equal(baseName, "slang-macosx");
    } else if (platform === "win32" && arch === "x64") {
      assert.equal(baseName, "slang-windows-amd64-gnu");
    }
  });

  it("names a mirror-served release's asset with the version suffix", () => {
    assert.equal(
      getSlangAssetName("0.2.0", MIRROR_RELEASE),
      `${getSlangBinaryBaseName()}-v0.2.0${EXE}`,
    );
  });

  it("names the pinned prerelease's asset with its override suffix instead of the version", () => {
    const assetSuffix = PINNED_RELEASE.assetOverride?.assetSuffix;
    assert.ok(
      assetSuffix !== undefined,
      "the pinned prerelease row must carry an asset override",
    );
    assert.equal(
      getSlangAssetName(PINNED_VERSION, PINNED_RELEASE),
      `${getSlangBinaryBaseName()}-${assetSuffix}${EXE}`,
    );
  });
});
