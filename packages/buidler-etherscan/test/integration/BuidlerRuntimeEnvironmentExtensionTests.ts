import { assert } from "chai";

import { useEnvironment } from "../helpers";

describe("BuidlerRuntimeEnvironment extension", function() {
  useEnvironment(__dirname + "/../buidler-project");

  it("It should add the etherscan field", function() {
    const { EtherscanBuidlerEnvironment } = require("../../src");
    assert.instanceOf(this.env.etherscan, EtherscanBuidlerEnvironment);
  });

  it("The etherscan url should have value from buidler.config.js", function() {
    assert.equal(
      this.env.etherscan.url,
      "https://api-ropsten.etherscan.io/api"
    );
  });

  it("The etherscan token should have value from buidler.config.js", function() {
    assert.equal(
      this.env.etherscan.apiKey,
      process.env.ETHERSCAN_API_KEY || "testtoken"
    );
  });
});
