// import assert from "node:assert/strict";
// import path from "node:path";
import { describe, it } from "node:test";
// import { pathToFileURL } from "node:url";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-toolbox-viem", function () {
  describe("all the expected plugins are available", function () {
    useFixtureProject("toolbox");

    it("should not throw because all the plugins should exist", async function () {
      const hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow in tests
        "./fixture-projects/toolbox/hardhat.config.js"
      );

      const _hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // This will check that the node test runner is available
      // assert.notEqual(hre.tasks.getTask(["test", "node"]), undefined);

      // // This will check that network helpers and viem are available
      // await hre.tasks.getTask(["run"]).run({ script: "scripts/script.ts" });

      // // This will check that ignition is available
      // assert.notEqual(hre.tasks.getTask(["ignition"]), undefined);

      // // This will check that the keystore is available
      // assert.notEqual(hre.tasks.getTask(["keystore"]), undefined);
    });
  });
});
