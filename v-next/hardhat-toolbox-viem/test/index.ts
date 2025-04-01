import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-toolbox-viem", function () {
  describe("all the expected plugins are available", function () {
    useFixtureProject("toolbox");

    it("should not throw because all the plugins should exist", async function () {
      const hardhatConfig = await import(
        pathToFileURL(path.join(process.cwd(), "hardhat.config.js")).href
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // This will check that the node test runner is available
      hre.tasks.getTask(["test"]);

      // This will check that network helpers and viem are available
      await hre.tasks.getTask(["run"]).run({ script: "scripts/script.ts" });

      // This will check that ignition is available
      hre.tasks.getTask(["ignition"]);

      // This will check that the keystore is available
      hre.tasks.getTask(["keystore"]);
    });
  });
});
