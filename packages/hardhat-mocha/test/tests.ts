import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("Mocha plugin", function () {
  // This test deserves an explanation:
  //
  // Mocha doesn't expose its version, so to make sure that we are using
  // Mocha 8.0.0+, we run a test suit in parallel that can't work in that mode.
  //
  // Mocha's parallel mode was added in 8.0.0.
  //
  // We also run it once without parallel mode, to make sure it's not failing
  // for another reason.

  describe("Hardhat project with newer mocha version", function () {
    useEnvironment("hardhat-project");

    it("should run successfully a report", async function () {
      await this.env.run("test");
      assert.equal(process.exitCode, 0);
    });
  });

  describe("Hardhat project with newer mocha version", function () {
    useEnvironment("hardhat-project-parallel");

    it("should fail because the root hook doesn't work", async function () {
      await this.env.run("test");
      assert.equal(process.exitCode, 1);
      process.exitCode = 0;
    });
  });
});
