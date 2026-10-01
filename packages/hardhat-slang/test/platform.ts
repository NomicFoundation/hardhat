import type { SlangRelease } from "../src/internal/constants.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import {
  getSlangAssetName,
  getSlangBinaryBaseName,
} from "../src/internal/platform.js";

const PINNED_RELEASE = SLANG_RELEASES["0.1.0-pre.2026-10-01"];

// A release served by the mirror under the standard `v${version}` naming.
const MIRROR_RELEASE: SlangRelease = {
  minSolidity: "0.8.0",
  maxSolidity: "0.8.36",
  extraArgs: [],
};

const EXE = process.platform === "win32" ? ".exe" : "";

describe("hardhat-slang platform detection", () => {
  it("returns a valid base name for the current platform", () => {
    const baseName = getSlangBinaryBaseName();
    assert.ok(typeof baseName === "string", "base name should be a string");
    assert.ok(
      baseName.startsWith("solx-"),
      "base name should start with 'solx-'",
    );
    assert.ok(baseName.length > 5, "base name should have meaningful length");
  });

  it("base name matches expected platform format", () => {
    const baseName = getSlangBinaryBaseName();
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "linux" && arch === "x64") {
      assert.equal(baseName, "solx-linux-amd64-gnu");
    } else if (platform === "linux" && arch === "arm64") {
      assert.equal(baseName, "solx-linux-arm64-gnu");
    } else if (platform === "darwin") {
      assert.equal(baseName, "solx-macosx");
    } else if (platform === "win32" && arch === "x64") {
      assert.equal(baseName, "solx-windows-amd64-gnu");
    }
  });

  it("names a mirror-served release's asset with the version suffix", () => {
    assert.equal(
      getSlangAssetName("0.2.0", MIRROR_RELEASE),
      `${getSlangBinaryBaseName()}-v0.2.0${EXE}`,
    );
  });

  it("names the pinned prerelease's asset with its override suffix instead of the version", () => {
    assert.equal(
      getSlangAssetName("0.1.0-pre.2026-10-01", PINNED_RELEASE),
      `${getSlangBinaryBaseName()}-slang-2026-10-01${EXE}`,
    );
  });
});
