import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-toolbox-mocha-ethers", function () {
  describe("all the expected plugins are available", function () {
    useFixtureProject("toolbox");

    it.skip("should not throw because all the plugins should exist", async function () {
      const hardhatConfig = await import(
        pathToFileURL(path.join(process.cwd(), "hardhat.config.js")).href
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // This will check that the node test runner is available
      assert.notEqual(hre.tasks.getTask(["test", "mocha"]), undefined);

      // This will check that ethers, chai and network helpers are available
      await hre.tasks.getTask(["run"]).run({ script: "scripts/script.ts" });

      // This will check that the keystore is available
      assert.notEqual(hre.tasks.getTask(["keystore", "list"]), undefined);

      // This will check that ignition is available
      assert.notEqual(hre.tasks.getTask(["ignition"]), undefined);

      // This will check that typechain is available
      await remove(path.join(process.cwd(), "types")); // Be sure the folder doesn't exist
      await hre.tasks.getTask(["compile"]).run();
      await exists(path.join(process.cwd(), "types"));
      await remove(path.join(process.cwd(), "types"));
    });
  });
});
