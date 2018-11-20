import path from "path";
import util from "util";
import globCPS from "glob";
const glob = util.promisify(globCPS);

import { internalTask, task } from "../config-dsl";
import { config, web3, run } from "../injected-env";

internalTask("builtin:get-test-files")
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }: { testFiles: string[] }) => {
    if (testFiles.length === 0) {
      return glob(path.join(config.paths.root, "test", "**/*.js"));
    }

    return testFiles;
  });

internalTask("builtin:setup-test-environment", async () => {
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
  .setAction(async ({ testFiles }: { testFiles: string[] }) => {
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
    async ({
      testFiles,
      noCompile
    }: {
      testFiles: string[];
      noCompile: boolean;
    }) => {
      if (!noCompile) {
        await run("compile");
      }

      const files = await run("builtin:get-test-files", { testFiles });
      await run("builtin:setup-test-environment");
      await run("builtin:run-mocha-tests", { testFiles: files });
    }
  );
