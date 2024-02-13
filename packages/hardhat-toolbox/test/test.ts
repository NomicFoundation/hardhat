import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("hardhat-toolbox", function () {
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

    it("Should not crash while loading the HRE", function () {
      assert.isDefined(this.env, "The environment should be loaded");
    });
  });

  describe("typechain config", function () {
    useEnvironment("typechain-config");

    it("should disable typechain overrides for js projects", function () {
      assert.isTrue(this.env.config.typechain.dontOverrideCompile);
    });
  });
});
