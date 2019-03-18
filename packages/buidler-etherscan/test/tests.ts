import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { assert } from "chai";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

describe("BuidlerRuntimeEnvironment extension", function() {
  beforeEach("Buidler project setup", function() {
    process.chdir(__dirname + "/buidler-project");
    process.env.BUIDLER_NETWORK = "develop";

    // We first clear any cache
    delete require.cache[require.resolve("@nomiclabs/buidler")];

    this.env = require("@nomiclabs/buidler");
  });

  it("It should add the etherscan field", function() {
    const {EtherscanBuidlerEnvironment } = require("../src");
    assert.instanceOf(this.env.etherscan, EtherscanBuidlerEnvironment);
  });

  it("The etherscan url should have default value", function() {
    assert.equal(this.env.etherscan.url, "https://api.etherscan.io/api");
  });

  it("The etherscan url should have value from buidler.config.js", function() {
      assert.equal(this.env.etherscan.token, "testtoken");
  });
});
