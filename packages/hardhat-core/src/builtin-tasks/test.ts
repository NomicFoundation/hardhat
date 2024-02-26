import chalk from "chalk";
import path from "path";

import { HARDHAT_NETWORK_NAME } from "../internal/constants";
import { subtask, task } from "../internal/core/config/config-env";
import {
  isJavascriptFile,
  isRunningWithTypescript,
  isTypescriptFile,
} from "../internal/core/typescript-support";
import { getForkCacheDirPath } from "../internal/hardhat-network/provider/utils/disk-cache";
import { showForkRecommendationsBannerIfNecessary } from "../internal/hardhat-network/provider/utils/fork-recomendations-banner";
import { pluralize } from "../internal/util/strings";
import { getAllFilesMatching } from "../internal/util/fs-utils";

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

    const jsFiles = await getAllFilesMatching(
      config.paths.tests,
      isJavascriptFile
    );

    if (!isRunningWithTypescript(config)) {
      return jsFiles;
    }

    const tsFiles = await getAllFilesMatching(
      config.paths.tests,
      isTypescriptFile
    );

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
      let runTests;

      // TODO: remove
      console.debug("[DEBUG]: HH CORE: using test module");

      // Load the user's custom test module, or use the default one if none is provided
      if (config?.test?.modulePath !== undefined) {
        runTests = (await import(config.test.modulePath)).runTests;
      } else {
        const defaultTestPackage = "@nomicfoundation/mocha-test-plugin";
        runTests = (await import(defaultTestPackage)).runTests;
      }

      const testFailures = await runTests(
        taskArgs.parallel,
        taskArgs.bail,
        taskArgs.testFiles,
        taskArgs.grep,
        config
      );

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
