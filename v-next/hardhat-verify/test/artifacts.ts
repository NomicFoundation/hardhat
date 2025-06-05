import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  getBuildInfoAndOutput,
  getCompilerInput,
} from "../src/internal/artifacts.js";

describe("artifacts", () => {
  describe("getBuildInfoAndOutput", () => {
    useFixtureProject("default");

    let hre: HardhatRuntimeEnvironment;
    before(async () => {
      const hardhatUserConfig =
        // eslint-disable-next-line import/no-relative-packages -- allowed in test
        (await import("./fixture-projects/default/hardhat.config.js")).default;
      hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
      await hre.tasks.getTask("compile").run();
    });

    it("should return the build info and output for a contract", async () => {
      const buildInfoAndOutput = await getBuildInfoAndOutput(
        hre.artifacts,
        "contracts/Counter.sol:Counter",
      );

      assert(
        buildInfoAndOutput !== undefined,
        "BuildInfoAndOutput should not be undefined",
      );
      assert(
        buildInfoAndOutput.buildInfo !== undefined,
        "Build info should not be undefined",
      );
      assert(
        buildInfoAndOutput.buildInfoOutput !== undefined,
        "Build info output should not be undefined",
      );
    });
  });

  describe("getCompilerInput", () => {
    useFixtureProject("default");

    let hre: HardhatRuntimeEnvironment;
    before(async () => {
      const hardhatUserConfig =
        // eslint-disable-next-line import/no-relative-packages -- allowed in test
        (await import("./fixture-projects/default/hardhat.config.js")).default;
      hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
      await hre.tasks.getTask("compile").run();
    });

    it("should return the compiler input for a contract", async () => {
      const compilerInput = await getCompilerInput(
        hre.solidity,
        hre.config.paths.root,
        "contracts/Counter.sol",
        "production",
      );

      assert(
        compilerInput !== undefined,
        "Compiler input should not be undefined",
      );
      assert.equal(compilerInput.settings.optimizer.enabled, true);
      assert.equal(compilerInput.settings.optimizer.runs, 200);
    });
  });
});
