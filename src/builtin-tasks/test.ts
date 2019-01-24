import path from "path";
import util from "util";

import { internalTask, task } from "../internal/core/config/config-env";
import { glob } from "../internal/util/glob";

internalTask("test:get-test-files")
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
    if (testFiles.length === 0) {
      return glob(path.join(config.paths.root, "test", "**/*.js"));
    }

    return testFiles;
  });

internalTask("test:setup-test-environment", async () => {});

internalTask("test:run-mocha-tests")
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

task("test", "Runs mocha tests")
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
        await run("compile");
      }

      const files = await run("test:get-test-files", { testFiles });
      await run("test:setup-test-environment");
      await run("test:run-mocha-tests", { testFiles: files });
    }
  );
