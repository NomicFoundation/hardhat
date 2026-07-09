import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatMochaPlugin from "../src/index.js";

import { runHardhatTest } from "./helpers/run-hardhat.js";

const FIXTURES_DIR = fileURLToPath(
  new URL("./fixture-projects", import.meta.url),
);

describe("Hardhat Mocha plugin", () => {
  describe("Success", () => {
    useFixtureProject("test-project");

    it("should work", async () => {
      const hardhatConfig = await import(
        "./fixture-projects/test-project/hardhat.config.js"
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      const result = await hre.tasks.getTask(["test", "mocha"]).run({});

      assert.deepEqual(result, {
        success: true,
        value: {
          summary: { failed: 0, passed: 2, skipped: 0, todo: 0 },
        },
      });
    });
  });

  describe("grep filtering", () => {
    // The fixture defines `keep_alpha` (passes) and `drop_beta` (throws if it
    // runs). With `--grep keep_alpha`, only `keep_alpha` should run, so the CLI
    // must exit 0. If the filter were ignored, `drop_beta` would also run and
    // fail, and the CLI would exit non-zero.
    //
    // The fixture reads `test.mocha.parallel` from the `HH_MOCHA_PARALLEL` env
    // var (the task has no CLI flag for it), so the same fixture exercises grep
    // in both execution paths: sequential (in-process) and parallel (Mocha
    // worker processes).
    async function assertGrepRunsOnlyKeepAlpha(
      envOverrides: NodeJS.ProcessEnv,
    ) {
      const { exitCode, stdout, stderr } = await runHardhatTest(
        path.join(FIXTURES_DIR, "grep-filtering"),
        envOverrides,
        ["--grep", "keep_alpha"],
      );

      assert.equal(
        exitCode,
        0,
        `expected only 'keep_alpha' to run under '--grep keep_alpha', but the run failed (exit ${String(exitCode)}) — 'drop_beta' was likely not filtered out:\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
      );
    }

    it("runs only the tests whose name matches --grep (sequential)", async () => {
      await assertGrepRunsOnlyKeepAlpha({ HH_MOCHA_PARALLEL: "false" });
    });

    it("runs only the tests whose name matches --grep (parallel)", async () => {
      await assertGrepRunsOnlyKeepAlpha({ HH_MOCHA_PARALLEL: "true" });
    });
  });

  describe("Failure", () => {
    useFixtureProject("invalid-mocha-config");

    it("should fail", async () => {
      const errors =
        "\t* Config error in config.test.mocha.delay: Expected boolean, received number";

      const hardhatConfig = await import(
        "./fixture-projects/invalid-mocha-config/hardhat.config.js"
      );

      await assertRejectsWithHardhatError(
        createHardhatRuntimeEnvironment(hardhatConfig.default),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
        { errors },
      );
    });
  });

  describe("build invocation", () => {
    useFixtureProject("test-project");

    function buildArgCaptor() {
      const buildArgs: any[] = [];
      const buildOverride = overrideTask("build")
        .setAction(async () => {
          return {
            default: (args: any) => {
              buildArgs.push(args);
              return { contractRootPaths: [], testRootPaths: [] };
            },
          };
        })
        .build();
      return { buildArgs, buildOverride };
    }

    async function runMochaIgnoringEsmReRunErrors(
      hre: HardhatRuntimeEnvironment,
      args: TaskArguments = {},
    ) {
      try {
        await hre.tasks.getTask(["test", "mocha"]).run(args);
      } catch (error) {
        ensureError(error);
        assert.match(
          error.message,
          /ESM and you've programmatically run your tests twice/i,
        );
      }
    }

    it("should call build without noTests when splitTestsCompilation is false", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      await runMochaIgnoringEsmReRunErrors(hre);

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, false);
    });

    it("should call build with noTests when splitTestsCompilation is true", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
          splitTestsCompilation: true,
        },
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      await runMochaIgnoringEsmReRunErrors(hre);

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, true);
    });

    it("should skip compilation when noCompile is true with splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
          splitTestsCompilation: true,
        },
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      await runMochaIgnoringEsmReRunErrors(hre, { noCompile: true });

      assert.equal(buildArgs.length, 0);
    });

    it("should skip compilation when noCompile is true without splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      await runMochaIgnoringEsmReRunErrors(hre, { noCompile: true });

      assert.equal(buildArgs.length, 0);
    });
  });
});
