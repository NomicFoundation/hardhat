import {
  BuidlerConfig,
  BuidlerRuntimeEnvironment
} from "@nomiclabs/buidler/types";
import { assert } from "chai";

import { getDefaultEtherscanConfig } from "../../src";
import { useEnvironment } from "../helpers";

describe("BuidlerConfig extension", function() {
  useEnvironment(__dirname + "/../buidler-project");

  it("It should add the etherscan field", function() {
    assert.isDefined(this.env.config.etherscan);
  });

  it("The etherscan url should have value from buidler.env.config.js", function() {
    const etherscan = getDefaultEtherscanConfig(this.env.config);

    assert.equal(etherscan.url, "https://api-ropsten.etherscan.io/api");
  });

  it("The etherscan token should have value from buidler.env.config.js", function() {
    const etherscan = getDefaultEtherscanConfig(this.env.config);
    const apiKey =
      process.env.ETHERSCAN_API_KEY === undefined
        ? "testtoken"
        : process.env.ETHERSCAN_API_KEY;

    assert.equal(etherscan.apiKey, apiKey);
  });
});
