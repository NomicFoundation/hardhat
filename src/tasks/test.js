const path = require("path");
const util = require("util");
const Mocha = require("mocha");
const glob = util.promisify(require("glob"));

internalTask("builtin:get-test-files")
  .addVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async testFiles => {
    if (testFiles.length === 0) {
      return glob(path.join(config.paths.root, "test", "**.js"));
    }

    return testFiles;
  });

internalTask("builtin:setup-test-environment", async () => {
  global.accounts = await web3.eth.getAccounts();
  global.assert = require("chai").assert;
});

internalTask("builtin:run-mocha-tests")
  .addVariadicPositionalParam(
    "testFiles",
    "An optional list of files to test",
    []
  )
  .setAction(async ({ testFiles }) => {
    const mocha = new Mocha();
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
    await run("builtin:run-mocha-tests", ...files);
  });
