import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSolxAssetName,
  getSolxBinaryBaseName,
} from "../src/internal/platform.js";

describe("hardhat-solx platform detection", () => {
  it("returns a valid base name for the current platform", () => {
    const baseName = getSolxBinaryBaseName();
    assert.ok(typeof baseName === "string", "base name should be a string");
    assert.ok(
      baseName.startsWith("solx-"),
      "base name should start with 'solx-'",
    );
    assert.ok(baseName.length > 5, "base name should have meaningful length");
  });

  it("base name matches expected platform format", () => {
    const baseName = getSolxBinaryBaseName();
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

  it("asset name includes version suffix", () => {
    const assetName = getSolxAssetName("0.1.3");
    assert.ok(
      assetName.includes("-v0.1.3"),
      `asset name should include version suffix: ${assetName}`,
    );
    assert.ok(
      assetName.startsWith("solx-"),
      `asset name should start with 'solx-': ${assetName}`,
    );
  });
});
