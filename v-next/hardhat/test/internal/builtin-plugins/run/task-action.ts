import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import { before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import runScriptWithHardhat from "../../../../src/internal/builtin-plugins/run/task-action.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-intialization.js";

describe("run/task-action", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("javascript", function () {
    useFixtureProject("run-js-script");

    it("should throw if script does not exist", async function () {
      await assertRejectsWithHardhatError(
        runScriptWithHardhat(
          { script: "./scripts/non-existent.js", noCompile: false },
          hre,
        ),
        HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
        {
          script: "./scripts/non-existent.js",
        },
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.js", noCompile: false },
        hre,
      );
    });

    it("should throw if the script throws", async function () {
      await assertRejectsWithHardhatError(
        runScriptWithHardhat(
          { script: "./scripts/throws.js", noCompile: false },
          hre,
        ),
        HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR,
        {
          script: "./scripts/throws.js",
          error: "broken script",
        },
      );
    });
  });

  describe("typescript", function () {
    useFixtureProject("run-ts-script");

    it("should throw if script does not exist", async function () {
      await assertRejectsWithHardhatError(
        runScriptWithHardhat(
          { script: "./scripts/non-existent.ts", noCompile: false },
          hre,
        ),
        HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
        {
          script: "./scripts/non-existent.ts",
        },
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.ts", noCompile: false },
        hre,
      );
    });

    it("should throw if the script throws", async function () {
      await assertRejectsWithHardhatError(
        runScriptWithHardhat(
          { script: "./scripts/throws.ts", noCompile: false },
          hre,
        ),
        HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR,
        {
          script: "./scripts/throws.ts",
          error: "broken script",
        },
      );
    });
  });
});
