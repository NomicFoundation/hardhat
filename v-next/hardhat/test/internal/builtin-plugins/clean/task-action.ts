import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";

import {
  exists,
  mkdir,
  readdir,
  remove,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import cleanAction from "../../../../src/internal/builtin-plugins/clean/task-action.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-intialization.js";

let hre: HardhatRuntimeEnvironment;
let globalCacheDir: string;
let cacheDir: string;
let artifactsDir: string;

function assertCleanBehavior(global: boolean) {
  it("should clean the cache and artifacts directories", async () => {
    await cleanAction({ global }, hre);

    // If the cache dir exists, it should be empty
    if (await exists(cacheDir)) {
      const cacheContents = await readdir(cacheDir);
      assert.ok(cacheContents.length === 0, "Cache dir is not empty");
    }

    // The artifacts dir should not exist
    assert.ok(!(await exists(artifactsDir)), "Artifacts dir exists");

    // If the global cache dir exists, it should be empty if the global flag is
    // true, and not empty otherwise
    if (await exists(globalCacheDir)) {
      const globalCacheContents = await readdir(globalCacheDir);
      if (global) {
        assert.ok(
          globalCacheContents.length === 0,
          "Global cache dir is not empty",
        );
      } else {
        assert.ok(
          globalCacheContents.length > 0,
          "Global cache dir is empty when it shouldn't be",
        );
      }
    }
  });
}

describe("clean/task-action", () => {
  describe("cleanAction", () => {
    useFixtureProject("loaded-config");

    before(async function () {
      globalCacheDir = await getCacheDir();
      cacheDir = path.join(process.cwd(), "cache");
      artifactsDir = path.join(process.cwd(), "artifacts");
      hre = await createHardhatRuntimeEnvironment({
        // TODO remove this once cache and artifacts are resolved in the config
        paths: { cache: cacheDir, artifacts: artifactsDir },
      });
    });

    describe("when cache and artifact dirs don't exist", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(cacheDir);
        await remove(artifactsDir);
      });

      assertCleanBehavior(true);
    });

    describe("when cache and artifact are empty dirs", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(cacheDir);
        await remove(artifactsDir);
        await getCacheDir(); // Calling this recreates the cache dir
        await mkdir(cacheDir);
        await mkdir(artifactsDir);
      });

      assertCleanBehavior(true);
    });

    describe("when cache and artifact dirs aren't empty", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(cacheDir);
        await remove(artifactsDir);
        await getCacheDir(); // Calling this recreates the cache dir
        await writeUtf8File(path.join(globalCacheDir, "a"), "");
        await writeUtf8File(path.join(cacheDir, "a"), "");
        await writeUtf8File(path.join(artifactsDir, "a"), "");
      });

      assertCleanBehavior(true);
    });

    describe("when global flag is false", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await getCacheDir(); // Calling this recreates the cache dir
        await writeUtf8File(path.join(globalCacheDir, "a"), "");
      });

      assertCleanBehavior(false);
    });
  });
});
