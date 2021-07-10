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
      return testFiles;
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
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
    const { default: Mocha } = await import("mocha");
    const mocha = new Mocha(config.mocha);
    testFiles.forEach((file) => mocha.addFile(file));

    const testFailures = await new Promise<number>((resolve) => {
      mocha.run(resolve);
    });

    return testFailures;
  });

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
  .setAction(
    async (
      {
        testFiles,
        noCompile,
      }: {
        testFiles: string[];
        noCompile: boolean;
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
