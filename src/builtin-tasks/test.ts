import path from "path";

import { internalTask, task } from "../internal/core/config/config-env";
import { glob } from "../internal/util/glob";

internalTask("builtin:get-test-files")
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

internalTask(
  "builtin:setup-test-environment",
  async (_, { config, provider }) => {
    const { assert } = await import("chai");

    const globalAsAny = global as any;
    globalAsAny.accounts = await provider.send("eth_accounts");
    globalAsAny.assert = assert;

    globalAsAny.contract = (
      description: string,
      definition: ((accounts: string) => any)
    ) =>
      describe(description, () => {
        definition(globalAsAny.accounts);
      });
  }
);

internalTask("builtin:run-mocha-tests")
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }, { config }) => {
    const { default: Mocha } = await import("mocha");
    const mocha = new Mocha(config.mocha);
    testFiles.forEach(file => mocha.addFile(file));

    mocha.run((failures: number) => {
      process.on("exit", function() {
        process.exit(failures);
      });
    });
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

      const files = await run("builtin:get-test-files", { testFiles });
      await run("builtin:setup-test-environment");
      await run("builtin:run-mocha-tests", { testFiles: files });
    }
  );
