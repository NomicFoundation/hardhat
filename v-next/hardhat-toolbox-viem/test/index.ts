import path from "node:path";
import { after, before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-toolbox-viem", function () {
  const originalConsoleLog = console.log;

  before(() => {
    // Disable `console.log` during tests to keep the CLI output clean
    console.log = () => {};
  });

  after(() => {
    console.log = originalConsoleLog;
  });

  describe("all the expected plugins are available", function () {
    useFixtureProject("toolbox");

    it("should expose all the expected plugins", async function () {
      const hardhatConfig = await import(
        path.join(process.cwd(), "hardhat.config.js")
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // This will check that the node test runner is available
      await hre.tasks.getTask(["test", "node"]).run();

      // This will check that network helpers and viem are available
      await hre.tasks.getTask(["run"]).run({ script: "scripts/script.ts" });

      // This will check that ignition is available
      await hre.tasks.getTask(["ignition", "deployments"]).run();

      // This will check that the keystore is available
      await hre.tasks.getTask(["keystore", "list"]).run();
    });
  });
});
