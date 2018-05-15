const path = require("path");
const util = require("util");
const glob = util.promisify(require("glob"));

internalTask("builtin:get-test-files")
  .addVariadicPositionalParam(
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
  const getAccounts = web3.eth.getAccounts.bind(web3.eth);
  global.accounts = await util.promisify(getAccounts)();
  global.assert = require("chai").assert;

  global.contract = (description, definition) =>
    describe(description, () => {
      definition(global.accounts);
    });
});

internalTask("builtin:run-mocha-tests")
  .addVariadicPositionalParam(
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
  .addVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }) => {
    await run("compile");

    const files = await run("builtin:get-test-files", { testFiles });
    await run("builtin:setup-test-environment");
    await run("builtin:run-mocha-tests", { testFiles: files });
  });
