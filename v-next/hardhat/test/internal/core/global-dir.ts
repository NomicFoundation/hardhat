import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getConfigDir } from "../../../src/internal/core/global-dir.js";

describe("global-dir", () => {
  describe("getGlobalDir", () => {
    it("should return the path to the configuration directory with default name 'hardhat'", async () => {
      const { default: envPaths } = await import("env-paths");
      const expectedPath = envPaths("hardhat").config;

      assert.equal(await getConfigDir(), expectedPath);
    });
  });
});
