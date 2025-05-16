import type { HardhatUserConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("test runner not specified - all tests", function () {
  let hre: HardhatRuntimeEnvironment;
  let hhConfig: HardhatUserConfig;

  useFixtureProject("test-task-not-specified");

  before(async () => {
    const baseHhConfig = (
      await import(
        "../fixture-projects/test-task-not-specified/hardhat.config.js"
      )
    ).default;

    hhConfig = {
      ...baseHhConfig,
      paths: { tests: { mocha: "test/all" } },
    };
  });

  it("should run all the mocha tests", async () => {
    hre = await createHardhatRuntimeEnvironment(hhConfig);

    await hre.tasks.getTask(["test"]).run({ noCompile: true });
  });
});
