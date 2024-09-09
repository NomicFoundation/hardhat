import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCacheDir,
  getConfigDir,
  getTelemetryDir,
} from "../src/global-dir.js";

async function getExpectedPath(packageName: string) {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}

describe("global-dir", () => {
  const HARDHAT_PACKAGE_NAME = "hardhat";
  const CUSTOM_PACKAGE_NAME = "custom-name";

  describe("getConfigDir", () => {
    it("should return the path to the configuration directory with default name 'hardhat'", async () => {
      const path = await getConfigDir();
      assert.equal(path, (await getExpectedPath(HARDHAT_PACKAGE_NAME)).config);
    });

    it("should return the path to the configuration directory with custom name", async () => {
      const path = await getConfigDir(CUSTOM_PACKAGE_NAME);
      assert.equal(path, (await getExpectedPath(CUSTOM_PACKAGE_NAME)).config);
    });
  });

  describe("getCacheDir", () => {
    it("should return the path to the cache directory with default name 'hardhat'", async () => {
      const path = await getCacheDir();
      assert.equal(path, (await getExpectedPath(HARDHAT_PACKAGE_NAME)).cache);
    });

    it("should return the path to the cache directory with custom name", async () => {
      const path = await getCacheDir(CUSTOM_PACKAGE_NAME);
      assert.equal(path, (await getExpectedPath(CUSTOM_PACKAGE_NAME)).cache);
    });
  });

  describe("getTelemetryDir", () => {
    it("should return the path to the telemetry directory with default name 'hardhat'", async () => {
      const path = await getTelemetryDir();
      assert.equal(path, (await getExpectedPath(HARDHAT_PACKAGE_NAME)).data);
    });

    it("should return the path to the telemetry directory with custom name", async () => {
      const path = await getTelemetryDir(CUSTOM_PACKAGE_NAME);
      assert.equal(path, (await getExpectedPath(CUSTOM_PACKAGE_NAME)).data);
    });
  });
});
