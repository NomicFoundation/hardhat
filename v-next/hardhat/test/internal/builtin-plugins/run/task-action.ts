import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
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
          { script: "./scripts/non-existent.js", noCompile: true },
          hre,
        ),
        HardhatError.ERRORS.CORE.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
        {
          script: "./scripts/non-existent.js",
        },
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.js", noCompile: true },
        hre,
      );
    });

    it("should throw if the script throws", async function () {
      await assertRejects(
        runScriptWithHardhat(
          { script: "./scripts/throws.js", noCompile: true },
          hre,
        ),
      );
    });
  });

  describe("typescript", function () {
    useFixtureProject("run-ts-script");

    it("should throw if script does not exist", async function () {
      await assertRejectsWithHardhatError(
        runScriptWithHardhat(
          { script: "./scripts/non-existent.ts", noCompile: true },
          hre,
        ),
        HardhatError.ERRORS.CORE.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
        {
          script: "./scripts/non-existent.ts",
        },
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.ts", noCompile: true },
        hre,
      );
    });

    describe("when the script throws", () => {
      it("should throw RUN_SCRIPT_ERROR if the script throws a non-HardhatError", async function () {
        await assertRejects(
          runScriptWithHardhat(
            { script: "./scripts/throws.ts", noCompile: true },
            hre,
          ),
        );
      });

      it("should throw the HardhatError if the script throws a HardhatError", async function () {
        await assertRejects(
          runScriptWithHardhat(
            { script: "./scripts/throws-hardhat-error.ts", noCompile: true },
            hre,
          ),
        );
      });
    });
  });
});
