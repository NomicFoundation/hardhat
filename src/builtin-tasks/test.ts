import path from "path";
import util from "util";

import { glob } from "../util/glob";
import { ActionType, TaskArguments } from "../types";
import { ITaskDefinition } from "../core/tasks/TaskDefinition";

declare function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

declare function internalTask<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

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

internalTask("builtin:setup-test-environment", async (_, { config, web3 }) => {
  const { assert } = await import("chai");
  const getAccounts = web3.eth.getAccounts.bind(web3.eth);

  const globalAsAny = global as any;
  globalAsAny.accounts = await util.promisify(getAccounts)();
  globalAsAny.assert = assert;

  globalAsAny.contract = (
    description: string,
    definition: ((accounts: string) => any)
  ) =>
    describe(description, () => {
      definition(globalAsAny.accounts);
    });
});

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
