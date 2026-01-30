import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  setExecMock,
  resetExecMock,
} from "../../src/internal/foundry/forge.js";
import {
  createCommandAwareMockExec,
  MOCK_SCENARIOS,
} from "../helpers/mock-exec.js";

/**
 * These tests use a mock of exec, so that they can be run without forge
 * installed. The edge cases of the mocks are tested in ../foundry/forge.ts
 */
describe("hardhat-foundry integration", () => {
  describe("forge not installed", () => {
    useFixtureProject("forge-remappings-basic");

    it("should throw FORGE_NOT_INSTALLED error when forge is not available", async () => {
      setExecMock(
        createCommandAwareMockExec({
          forgeVersion: MOCK_SCENARIOS.FORGE_VERSION_NOT_INSTALLED,
        }),
      );

      try {
        const hardhatConfig = await import(
          "../fixture-projects/forge-remappings-basic/hardhat.config.js"
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        await assertRejectsWithHardhatError(
          hre.tasks.getTask("build").run({ quiet: true }),
          HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_NOT_INSTALLED,
          {},
        );
      } finally {
        resetExecMock();
      }
    });
  });

  describe("invalid foundry.toml", () => {
    useFixtureProject("invalid-foundry-config");

    it("should throw FORGE_REMAPPINGS_FAILED for invalid config", async () => {
      setExecMock(
        createCommandAwareMockExec({
          forgeVersion: MOCK_SCENARIOS.FORGE_VERSION_SUCCESS,
          forgeRemappings: MOCK_SCENARIOS.CONFIG_ERROR,
        }),
      );

      try {
        const hardhatConfig = await import(
          "../fixture-projects/invalid-foundry-config/hardhat.config.js"
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // We can't use assertRejectsWithHardhatError here because we don't know
        // the exact packagePath value that will be in the error message
        try {
          await hre.tasks.getTask("build").run({ quiet: true });
          assert.fail("Expected build to throw FORGE_REMAPPINGS_FAILED error");
        } catch (error) {
          assert.ok(
            HardhatError.isHardhatError(error),
            "Error should be a HardhatError",
          );
          assert.equal(
            error.descriptor.number,
            HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_REMAPPINGS_FAILED
              .number,
            "Error should be FORGE_REMAPPINGS_FAILED",
          );
        }
      } finally {
        resetExecMock();
      }
    });
  });

  describe("no foundry.toml", () => {
    useFixtureProject("no-foundry-config");

    it("should fail build due to missing import (no remappings provided)", async () => {
      const hardhatConfig = await import(
        "../fixture-projects/no-foundry-config/hardhat.config.js"
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      await assertRejectsWithHardhatError(
        () => hre.tasks.getTask("build").run({ quiet: true }),
        HardhatError.ERRORS.CORE.SOLIDITY.IMPORT_RESOLUTION_ERROR,
        {
          filePath: "./contracts/Main.sol",
          importPath: "missing-dep/MissingLib.sol",
          error: `The package "missing-dep" is not installed.`,
        },
      );
    });
  });

  describe("forge remappings work", () => {
    useFixtureProject("forge-remappings-basic");

    it("should successfully build with forge remappings", async () => {
      // Mock forge to return the remapping for mock-dep
      setExecMock(
        createCommandAwareMockExec({
          forgeVersion: MOCK_SCENARIOS.FORGE_VERSION_SUCCESS,
          forgeRemappings: {
            stdout: "mock-dep/=lib/mock-dep/src/\n",
            stderr: "",
            code: 0,
          },
        }),
      );

      try {
        const hardhatConfig = await import(
          "../fixture-projects/forge-remappings-basic/hardhat.config.js"
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // Build should succeed with the remapping provided by forge
        const result = await hre.tasks
          .getTask("build")
          .run({ force: true, quiet: true });

        assert.ok(
          result !== undefined && result !== null,
          "Build should succeed",
        );
      } finally {
        resetExecMock();
      }
    });
  });

  describe("remappings.txt takes precedence", () => {
    useFixtureProject("forge-remappings-override");

    it("should build successfully using remappings", async () => {
      // In this test we have v1 and v2 of the library. Foundry remaps to v2,
      // while remappings.txt points to v1. The remappings.txt file should take
      // precedence, to validate it, we introduced an intentional syntax error
      // in v2 of the library, so it won't compile if forge's remappings are
      // used

      setExecMock(
        createCommandAwareMockExec({
          forgeVersion: MOCK_SCENARIOS.FORGE_VERSION_SUCCESS,
          forgeRemappings: {
            stdout: "mylib/=lib/v2/\n",
            stderr: "",
            code: 0,
          },
        }),
      );

      try {
        const hardhatConfig = await import(
          "../fixture-projects/forge-remappings-override/hardhat.config.js"
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // Build should succeed - the remappings.txt took precedence and v1 was
        // used
        const result = await hre.tasks
          .getTask("build")
          .run({ force: true, quiet: true });

        assert.ok(
          result !== undefined && result !== null,
          "Build should succeed",
        );
      } finally {
        resetExecMock();
      }
    });
  });
});
