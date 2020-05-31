import chalk from "chalk";
import path from "path";

import { BUIDLEREVM_NETWORK_NAME } from "../internal/constants";
import { internalTask, task } from "../internal/core/config/config-env";
import { isTypescriptSupported } from "../internal/core/typescript-support";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";

import {
  TASK_COMPILE,
  TASK_TEST,
  TASK_TEST_GET_TEST_FILES,
  TASK_TEST_RUN_MOCHA_TESTS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "./task-names";

export default function () {
  internalTask(TASK_TEST_GET_TEST_FILES)
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

  internalTask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async () => {});

  internalTask(TASK_TEST_RUN_MOCHA_TESTS)
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
          await run(TASK_COMPILE);
        }

        const files = await run(TASK_TEST_GET_TEST_FILES, { testFiles });
        await run(TASK_TEST_SETUP_TEST_ENVIRONMENT);
        await run(TASK_TEST_RUN_MOCHA_TESTS, { testFiles: files });

        if (network.name !== BUIDLEREVM_NETWORK_NAME) {
          return;
        }

        const failures = await network.provider.send(
          "buidler_getStackTraceFailuresCount"
        );

        if (failures === 0) {
          return;
        }

        console.warn(
          chalk.yellow(
            `Failed to generate ${failures} ${pluralize(
              failures,
              "stack trace"
            )}. Run Buidler with --verbose to learn more.`
          )
        );
      }
    );
}
