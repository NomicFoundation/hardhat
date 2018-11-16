import { config, internalTask, task, web3, run } from "../types";

import path from "path";
import util from "util";
import globCPS from "glob";
const glob = util.promisify(globCPS);

internalTask("builtin:get-test-files")
  .addOptionalVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }) => {
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

  globalAsAny.contract = (description, definition) =>
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
  .setAction(async ({ testFiles }) => {
    const Mocha = require("mocha");
    const mocha = new Mocha(config.mocha);
    testFiles.forEach(file => mocha.addFile(file));

    mocha.run(failures => {
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
  .setAction(async ({ testFiles, noCompile }) => {
    if (!noCompile) {
      await run("compile");
    }

    const files = await run("builtin:get-test-files", { testFiles });
    await run("builtin:setup-test-environment");
    await run("builtin:run-mocha-tests", { testFiles: files });
  });
