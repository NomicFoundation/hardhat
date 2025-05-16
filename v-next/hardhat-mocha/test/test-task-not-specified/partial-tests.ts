import type { HardhatUserConfig } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("test runner not specified - partial tests", function () {
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
      paths: { tests: { mocha: "test/partial" } },
    };
  });

  it("should run only the specified test file", async () => {
    hre = await createHardhatRuntimeEnvironment(hhConfig);

    await hre.tasks.getTask(["test"]).run({
      noCompile: true,
      testFiles: ["./test/partial/test-1.ts"],
    });
  });

  it("should throw because the file cannot be assigned to a test runner", async () => {
    hre = await createHardhatRuntimeEnvironment(hhConfig);

    await assertRejectsWithHardhatError(
      hre.tasks.getTask(["test"]).run({
        noCompile: true,
        testFiles: ["./test/not-in-test-path.ts"],
      }),
      HardhatError.ERRORS.CORE.TEST_PLUGIN.CANNOT_DETERMINE_TEST_RUNNER,
      {
        files: "./test/not-in-test-path.ts",
      },
    );
  });
});
