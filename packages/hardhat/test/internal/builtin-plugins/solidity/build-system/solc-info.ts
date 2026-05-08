import assert from "node:assert/strict";
import os from "node:os";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  hasArm64MirrorBuild,
  hasOfficialArm64Build,
  missesSomeOfficialNativeBuilds,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/solc-info.js";

describe("solc-info", () => {
  describe("hasOfficialArm64Build", () => {
    it("returns false for versions before 0.8.31", () => {
      assert.equal(hasOfficialArm64Build("0.5.0"), false);
      assert.equal(hasOfficialArm64Build("0.8.0"), false);
      assert.equal(hasOfficialArm64Build("0.8.28"), false);
      assert.equal(hasOfficialArm64Build("0.8.30"), false);
    });

    it("returns true for 0.8.31 and later", () => {
      assert.equal(hasOfficialArm64Build("0.8.31"), true);
      assert.equal(hasOfficialArm64Build("0.8.32"), true);
      assert.equal(hasOfficialArm64Build("0.9.0"), true);
      assert.equal(hasOfficialArm64Build("1.0.0"), true);
    });

    it("throws INVALID_SOLC_VERSION for malformed input", () => {
      assertThrowsHardhatError(
        () => hasOfficialArm64Build("not-a-version"),
        HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
        { version: "not-a-version" },
      );
      assertThrowsHardhatError(
        () => hasOfficialArm64Build("0.8"),
        HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
        { version: "0.8" },
      );
    });
  });

  describe("hasArm64MirrorBuild", () => {
    it("returns false for versions before 0.5.0 (no native ARM64 build anywhere)", () => {
      assert.equal(hasArm64MirrorBuild("0.4.0"), false);
      assert.equal(hasArm64MirrorBuild("0.4.26"), false);
    });

    it("returns true for versions in the mirror range (0.5.0 to 0.8.30)", () => {
      assert.equal(hasArm64MirrorBuild("0.5.0"), true);
      assert.equal(hasArm64MirrorBuild("0.6.12"), true);
      assert.equal(hasArm64MirrorBuild("0.8.0"), true);
      assert.equal(hasArm64MirrorBuild("0.8.30"), true);
    });

    it("returns false for versions with official ARM64 builds (>= 0.8.31)", () => {
      assert.equal(hasArm64MirrorBuild("0.8.31"), false);
      assert.equal(hasArm64MirrorBuild("0.9.0"), false);
      assert.equal(hasArm64MirrorBuild("1.0.0"), false);
    });

    it("throws INVALID_SOLC_VERSION for malformed input", () => {
      assertThrowsHardhatError(
        () => hasArm64MirrorBuild("not-a-version"),
        HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
        { version: "not-a-version" },
      );
      assertThrowsHardhatError(
        () => hasArm64MirrorBuild("0.8"),
        HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
        { version: "0.8" },
      );
    });
  });

  describe("missesSomeOfficialNativeBuilds", () => {
    it("returns a boolean based on the platform", () => {
      const result = missesSomeOfficialNativeBuilds();
      assert.equal(result, os.platform() === "linux" && os.arch() === "arm64");
    });
  });
});
