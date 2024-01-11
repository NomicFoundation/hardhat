import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("hardhat-toolbox-viem", function () {
  describe("only-toolbox", function () {
    useEnvironment("only-toolbox");

    it("has all the expected things in the HRE", async function () {
      await this.env.run("run", {
        noCompile: true,
        script: "script.js",
      });

      assert.equal(process.exitCode, 0);
    });
  });

  describe("hardhat-gas-reporter-config", function () {
    useEnvironment("with-gas-reporter-config");

    it("Should not crash while loading the HRE", async function () {
      assert.isTrue(this.env !== undefined && this.env !== null);
    });
  });
});
