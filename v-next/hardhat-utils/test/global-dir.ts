import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { mkdir, remove } from "../src/fs.js";
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
      const configPath = await getConfigDir();
      assert.equal(
        configPath,
        (await getExpectedPath(HARDHAT_PACKAGE_NAME)).config,
      );
    });

    it("should return the path to the configuration directory with custom name", async () => {
      const configPath = await getConfigDir(CUSTOM_PACKAGE_NAME);
      assert.equal(
        configPath,
        (await getExpectedPath(CUSTOM_PACKAGE_NAME)).config,
      );
    });
  });

  describe("getCacheDir", () => {
    it("should return the path to the cache directory with default name 'hardhat'", async () => {
      const cachePath = await getCacheDir();
      assert.equal(
        cachePath,
        (await getExpectedPath(HARDHAT_PACKAGE_NAME)).cache,
      );
    });

    it("should return the path to the cache directory with custom name", async () => {
      const cachePath = await getCacheDir(CUSTOM_PACKAGE_NAME);
      assert.equal(
        cachePath,
        (await getExpectedPath(CUSTOM_PACKAGE_NAME)).cache,
      );
    });

    it("should use HARDHAT_TEST_CACHE_DIR when set (for testing purposes only)", async () => {
      const customPath = path.join(
        os.tmpdir(),
        `hardhat-test-cache-override-${Date.now()}`,
      );
      await mkdir(customPath);
      const originalValue = process.env.HARDHAT_TEST_CACHE_DIR;

      try {
        process.env.HARDHAT_TEST_CACHE_DIR = customPath;
        const result = await getCacheDir();
        assert.equal(result, customPath);
      } finally {
        if (originalValue === undefined) {
          delete process.env.HARDHAT_TEST_CACHE_DIR;
        } else {
          process.env.HARDHAT_TEST_CACHE_DIR = originalValue;
        }
        await remove(customPath);
      }
    });
  });

  describe("getTelemetryDir", () => {
    it("should return the path to the telemetry directory with default name 'hardhat'", async () => {
      const telemetryPath = await getTelemetryDir();
      assert.equal(
        telemetryPath,
        (await getExpectedPath(HARDHAT_PACKAGE_NAME)).data,
      );
    });

    it("should return the path to the telemetry directory with custom name", async () => {
      const telemetryPath = await getTelemetryDir(CUSTOM_PACKAGE_NAME);
      assert.equal(
        telemetryPath,
        (await getExpectedPath(CUSTOM_PACKAGE_NAME)).data,
      );
    });
  });
});
