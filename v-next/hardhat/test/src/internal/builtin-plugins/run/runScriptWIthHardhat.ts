import type { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core";
import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { runScriptWithHardhat } from "../../../../../src/internal/builtin-plugins/run/runScriptWithHardhat.js";
import { useFixtureProject } from "../../../../helpers/project.js";

describe("runScriptWithHardhat", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  it("should throw if script is not a string", async function () {
    await assert.rejects(async () => {
      await runScriptWithHardhat({ script: 123, noCompile: false }, hre);
    }, /An internal invariant was violated: Expected script to be a string/);
  });

  it("should throw if noCompile is not a boolean", async function () {
    await assert.rejects(async () => {
      await runScriptWithHardhat({ script: "script.js", noCompile: 123 }, hre);
    }, /An internal invariant was violated: Expected noCompile to be a boolean/);
  });

  describe("javascript", function () {
    useFixtureProject("run-js-script");

    it("should throw if script does not exist", async function () {
      await assert.rejects(
        async () => {
          await runScriptWithHardhat(
            { script: "./scripts/non-existent.js", noCompile: false },
            hre,
          );
        },
        new HardhatError(HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND, {
          script: "./scripts/non-existent.js",
        }),
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.js", noCompile: false },
        hre,
      );
    });

    it("should throw if the script throws", async function () {
      await assert.rejects(
        async () => {
          await runScriptWithHardhat(
            { script: "./scripts/throws.js", noCompile: false },
            hre,
          );
        },
        new HardhatError(HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR, {
          script: "./scripts/throws.js",
          error: "broken script",
        }),
      );
    });
  });

  describe("typescript", function () {
    useFixtureProject("run-ts-script");

    it("should throw if script does not exist", async function () {
      await assert.rejects(
        async () => {
          await runScriptWithHardhat(
            { script: "./scripts/non-existent.ts", noCompile: false },
            hre,
          );
        },
        new HardhatError(HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND, {
          script: "./scripts/non-existent.ts",
        }),
      );
    });

    it("should run a script successfully", async function () {
      await runScriptWithHardhat(
        { script: "./scripts/success.ts", noCompile: false },
        hre,
      );
    });

    it("should throw if the script throws", async function () {
      await assert.rejects(
        async () => {
          await runScriptWithHardhat(
            { script: "./scripts/throws.ts", noCompile: false },
            hre,
          );
        },
        new HardhatError(HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR, {
          script: "./scripts/throws.ts",
          error: "broken script",
        }),
      );
    });
  });
});
