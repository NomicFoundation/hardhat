import path from "path";

import { internalTask, task } from "../internal/core/config/config-env";
import { glob } from "../internal/util/glob";

import {
  TASK_COMPILE,
  TASK_TEST,
  TASK_TEST_GET_TEST_FILES,
  TASK_TEST_RUN_MOCHA_TESTS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT
} from "./task-names";

internalTask(TASK_TEST_GET_TEST_FILES)
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
    if (testFiles.length === 0) {
      return glob(path.join(config.paths.root, config.paths.tests, "**/*.js"));
    }

    return testFiles;
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
    testFiles.forEach(file => mocha.addFile(file));

    const runPromise = new Promise<number>((resolve, _) => {
      mocha.run(resolve);
    });

    const failures = await runPromise;
    process.exit(failures);
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
        noCompile
      }: {
        testFiles: string[];
        noCompile: boolean;
      },
      { run }
    ) => {
      if (!noCompile) {
        await run(TASK_COMPILE);
      }

      const files = await run(TASK_TEST_GET_TEST_FILES, { testFiles });
      await run(TASK_TEST_SETUP_TEST_ENVIRONMENT);
      await run(TASK_TEST_RUN_MOCHA_TESTS, { testFiles: files });
    }
  );
