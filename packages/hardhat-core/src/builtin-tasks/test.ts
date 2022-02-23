import type { MochaOptions } from "mocha";

import chalk from "chalk";
import path from "path";

import { HARDHAT_NETWORK_NAME } from "../internal/constants";
import { subtask, task } from "../internal/core/config/config-env";
import { isRunningWithTypescript } from "../internal/core/typescript-support";
import { getForkCacheDirPath } from "../internal/hardhat-network/provider/utils/disk-cache";
import { showForkRecommendationsBannerIfNecessary } from "../internal/hardhat-network/provider/utils/fork-recomendations-banner";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";

import {
  TASK_COMPILE,
  TASK_TEST,
  TASK_TEST_GET_TEST_FILES,
  TASK_TEST_RUN_MOCHA_TESTS,
  TASK_TEST_RUN_SHOW_FORK_RECOMMENDATIONS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "./task-names";

subtask(TASK_TEST_GET_TEST_FILES)
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
    if (testFiles.length !== 0) {
      const testFilesAbsolutePaths = testFiles.map((x) =>
        path.resolve(process.cwd(), x)
      );

      return testFilesAbsolutePaths;
    }

    const jsFiles = await glob(path.join(config.paths.tests, "**/*.js"));

    if (!isRunningWithTypescript(config)) {
      return jsFiles;
    }

    const tsFiles = await glob(path.join(config.paths.tests, "**/*.ts"));

    return [...jsFiles, ...tsFiles];
  });

subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async () => {});

subtask(TASK_TEST_RUN_MOCHA_TESTS)
  .addFlag("parallel", "Run tests in parallel")
  .addFlag("bail", "Stop running tests after the first test failure")
  .addOptionalParam(
    "grep",
    "Only run tests matching the given string or regexp"
  )
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(
    async (
      taskArgs: {
        bail: boolean;
        parallel: boolean;
        testFiles: string[];
        grep?: string;
      },
      { config }
    ) => {
      const { default: Mocha } = await import("mocha");

      const mochaConfig: MochaOptions = {
        ...config.mocha,
        grep: taskArgs.grep,
      };

      if (taskArgs.bail) {
        mochaConfig.bail = true;
      }
      if (taskArgs.parallel) {
        mochaConfig.parallel = true;
      }

      if (mochaConfig.parallel === true) {
        const mochaRequire = mochaConfig.require ?? [];
        if (!mochaRequire.includes("hardhat/register")) {
          mochaRequire.push("hardhat/register");
        }
        mochaConfig.require = mochaRequire;
      }

      const mocha = new Mocha(mochaConfig);
      taskArgs.testFiles.forEach((file) => mocha.addFile(file));

      const testFailures = await new Promise<number>((resolve) => {
        mocha.run(resolve);
      });

      mocha.dispose();

      return testFailures;
    }
  );

subtask(TASK_TEST_RUN_SHOW_FORK_RECOMMENDATIONS).setAction(
  async (_, { config, network }) => {
    if (network.name !== HARDHAT_NETWORK_NAME) {
      return;
    }

    const forkCache = getForkCacheDirPath(config.paths);
    await showForkRecommendationsBannerIfNecessary(network.config, forkCache);
  }
);

task(TASK_TEST, "Runs mocha tests")
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .addFlag("noCompile", "Don't compile before running this task")
  .addFlag("parallel", "Run tests in parallel")
  .addFlag("bail", "Stop running tests after the first test failure")
  .addOptionalParam(
    "grep",
    "Only run tests matching the given string or regexp"
  )
  .setAction(
    async (
      {
        testFiles,
        noCompile,
        parallel,
        bail,
        grep,
      }: {
        testFiles: string[];
        noCompile: boolean;
        parallel: boolean;
        bail: boolean;
        grep?: string;
      },
      { run, network }
    ) => {
      if (!noCompile) {
        await run(TASK_COMPILE, { quiet: true });
      }

      const files = await run(TASK_TEST_GET_TEST_FILES, { testFiles });

      await run(TASK_TEST_SETUP_TEST_ENVIRONMENT);

      await run(TASK_TEST_RUN_SHOW_FORK_RECOMMENDATIONS);

      const testFailures = await run(TASK_TEST_RUN_MOCHA_TESTS, {
        testFiles: files,
        parallel,
        bail,
        grep,
      });

      if (network.name === HARDHAT_NETWORK_NAME) {
        const stackTracesFailures = await network.provider.send(
          "hardhat_getStackTraceFailuresCount"
        );

        if (stackTracesFailures !== 0) {
          console.warn(
            chalk.yellow(
              `Failed to generate ${stackTracesFailures} ${pluralize(
                stackTracesFailures,
                "stack trace"
              )}. Run Hardhat with --verbose to learn more.`
            )
          );
        }
      }

      process.exitCode = testFailures;
      return testFailures;
    }
  );
