import chalk from "chalk";
import path from "path";

import { HARDHAT_NETWORK_NAME } from "../internal/constants";
import { internalTask, task } from "../internal/core/config/config-env";
import { isTypescriptSupported } from "../internal/core/typescript-support";
import { getForkCacheDirPath } from "../internal/hardhat-network/provider/utils/disk-cache";
import { showForkRecommendationsBannerIfNecessary } from "../internal/hardhat-network/provider/utils/fork-recomendations-banner";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";

import { TASKS } from "./task-names";

export default function () {
  internalTask(TASKS.TEST.GET_TEST_FILES)
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

      if (!isTypescriptSupported()) {
        return jsFiles;
      }

      const tsFiles = await glob(path.join(config.paths.tests, "**/*.ts"));

      return [...jsFiles, ...tsFiles];
    });

  internalTask(TASKS.TEST.SETUP_TEST_ENVIRONMENT, async () => {});

  internalTask(TASKS.TEST.RUN_MOCHA_TESTS)
    .addOptionalVariadicPositionalParam(
      "testFiles",
      "An optional list of files to test",
      []
    )
    .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
      const { default: Mocha } = await import("mocha");
      const mocha = new Mocha(config.mocha);
      testFiles.forEach((file) => mocha.addFile(file));

      const runPromise = new Promise<number>((resolve, _) => {
        mocha.run(resolve);
      });

      process.exitCode = await runPromise;
    });

  internalTask(TASKS.TEST.SHOW_FORK_RECOMMENDATIONS).setAction(
    async (_, { config, network }) => {
      if (network.name !== HARDHAT_NETWORK_NAME) {
        return;
      }

      const forkCache = getForkCacheDirPath(config.paths);
      await showForkRecommendationsBannerIfNecessary(network.config, forkCache);
    }
  );

  task(TASKS.TEST.MAIN, "Runs mocha tests")
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
          await run(TASKS.COMPILE.MAIN, { quiet: true });
        }

        const files = await run(TASKS.TEST.GET_TEST_FILES, { testFiles });

        await run(TASKS.TEST.SETUP_TEST_ENVIRONMENT);

        await run(TASKS.TEST.SETUP_TEST_ENVIRONMENT);

        await run(TASKS.TEST.RUN_MOCHA_TESTS, { testFiles: files });

        if (network.name !== HARDHAT_NETWORK_NAME) {
          return;
        }

        const failures = await network.provider.send(
          "hardhat_getStackTraceFailuresCount"
        );

        if (failures === 0) {
          return;
        }

        console.warn(
          chalk.yellow(
            `Failed to generate ${failures} ${pluralize(
              failures,
              "stack trace"
            )}. Run Hardhat with --verbose to learn more.`
          )
        );
      }
    );
}
