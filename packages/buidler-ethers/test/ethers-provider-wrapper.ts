import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { assert } from "chai";
import { JsonRpcProvider } from "ethers/providers";

import { EthersProviderWrapper } from "../src/ethers-provider-wrapper";

describe("Ethers provider wrapper", function() {
  let realProvider: JsonRpcProvider;
  let wrapper: EthersProviderWrapper;

  before("Setup buidler project", function() {
    process.chdir(__dirname);
    process.env.BUIDLER_NETWORK = "develop";
  });

  beforeEach(function() {
    resetBuidlerContext();
    this.env = require("@nomiclabs/buidler");
    realProvider = new JsonRpcProvider();
    wrapper = new EthersProviderWrapper(this.env.ethereum);
  });

  it("Should return the same as the real provider", async () => {
    const response = await realProvider.send("eth_accounts", []);
    const response2 = await wrapper.send("eth_accounts", []);

    assert.deepEqual(response, response2);
  });

  it("Should return the same error", done => {
    realProvider
      .send("error_please", [])
      .then(_ => assert.fail())
      .catch(err => {
        wrapper
          .send("error_please", [])
          .then(_ => assert.fail())
          .catch(err2 => {
            assert.deepEqual(err2.message, err.message);
            done();
          });
      });
  });
});
