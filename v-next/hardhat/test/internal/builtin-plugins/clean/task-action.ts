import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";

import { getCacheDir } from "@ignored/hardhat-vnext-core/global-dir";
import {
  exists,
  mkdir,
  readdir,
  remove,
  writeUtf8File,
} from "@ignored/hardhat-vnext-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import cleanAction from "../../../../src/internal/builtin-plugins/clean/task-action.js";
import { useFixtureProject } from "../../../helpers/project.js";

function assertCleanBehavior(global: boolean, globalCacheDir: string) {
  it("should empty the cache dir", async () => {
    const cacheContents = await readdir(path.join(process.cwd(), "cache"));
    assert.ok(cacheContents.length === 0, "Cache dir is not empty");
  });

  it("should remove the artifacts dir", async () => {
    assert.ok(
      exists(path.join(process.cwd(), "artifacts")),
      "Artifacts dir does not exist",
    );
  });

  if (global) {
    it("should empty the global cache dir when the global flag is true", async () => {
      const globalCacheContents = await readdir(globalCacheDir);
      assert.ok(
        globalCacheContents.length === 0,
        "Global cache dir is not empty",
      );
    });
  } else {
    it("should not empty the global cache dir when the global flag is false", async () => {
      const globalCacheContents = await readdir(globalCacheDir);
      assert.ok(globalCacheContents.length > 0, "Global cache dir is empty");
    });
  }
}

describe("clean/task-action", () => {
  let hre: HardhatRuntimeEnvironment;
  let globalCacheDir: string;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
    globalCacheDir = await getCacheDir();
  });

  describe("cleanAction", () => {
    useFixtureProject("loaded-config");

    describe("when cache and artifact dirs don't exist", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(path.join(process.cwd(), "cache"));
        await remove(path.join(process.cwd(), "artifacts"));
      });

      await cleanAction({ global: true }, hre);
      assertCleanBehavior(true, globalCacheDir);
    });

    describe("when cache and artifact are empty dirs", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(path.join(process.cwd(), "cache"));
        await remove(path.join(process.cwd(), "artifacts"));
        await getCacheDir(); // Recreate the cache dir
        await mkdir(path.join(process.cwd(), "cache"));
        await mkdir(path.join(process.cwd(), "artifacts"));
      });

      await cleanAction({ global: true }, hre);
      assertCleanBehavior(true, globalCacheDir);
    });

    describe("when cache and artifact dirs aren't empty", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await remove(path.join(process.cwd(), "cache"));
        await remove(path.join(process.cwd(), "artifacts"));
        await getCacheDir(); // Recreate the cache dir
        await writeUtf8File(path.join(globalCacheDir, "a"), "");
        await writeUtf8File(path.join(process.cwd(), "cache", "a"), "");
        await writeUtf8File(path.join(process.cwd(), "artifacts", "a"), "");
      });

      await cleanAction({ global: true }, hre);
      assertCleanBehavior(true, globalCacheDir);
    });

    describe("when global flag is false", async () => {
      beforeEach(async () => {
        await remove(globalCacheDir);
        await getCacheDir(); // Recreate the cache dir
        await writeUtf8File(path.join(globalCacheDir, "a"), "");
      });

      await cleanAction({ global: false }, hre);
      assertCleanBehavior(false, globalCacheDir);
    });
  });
});
