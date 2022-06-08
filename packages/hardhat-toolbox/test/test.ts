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
});
