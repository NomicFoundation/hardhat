import { assert } from "chai";
import { resolveEtherscanApiKey } from "../../src/resolveEtherscanApiKey";
import { EtherscanConfig } from "../../src/types";

describe("Etherscan API Key resolution", () => {
  describe("provide one api key", () => {
    it("returns the api key no matter the network", () => {
      assert.equal(
        resolveEtherscanApiKey({ apiKey: "testtoken" }, "mainnet"),
        "testtoken"
      );

      assert.equal(
        resolveEtherscanApiKey({ apiKey: "testtoken" }, "rinkeby"),
        "testtoken"
      );
    });
  });

  describe("provide multiple api keys", () => {
    it("can retrieve different keys depending on --network", () => {
      const etherscanConfig: EtherscanConfig = {
        apiKey: {
          mainnet: "mainnet-testtoken",
          rinkeby: "rinkeby-testtoken",
        },
      };

      assert.equal(
        resolveEtherscanApiKey(etherscanConfig, "mainnet"),
        "mainnet-testtoken"
      );
      assert.equal(
        resolveEtherscanApiKey(etherscanConfig, "rinkeby"),
        "rinkeby-testtoken"
      );
    });

    it("should throw if api key is for unrecognized network", () => {
      assert.throws(() =>
        resolveEtherscanApiKey(
          // @ts-expect-error
          { apiKey: { newthing: "testtoken" } },
          "newthing"
        )
      );
    });
  });

  describe("provide no api key", () => {
    const expectedBadApiKeyMessage =
      "Please provide an Etherscan API token via hardhat config.\n  E.g.: { [...], etherscan: { apiKey: 'an API key' }, [...] }\n  or { [...], etherscan: { apiKey: { mainnet: 'an API key' } }, [...] }\n  See https://etherscan.io/apis";

    it("should throw if api key root is undefined", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ apiKey: undefined }, "rinkeby"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if api key root is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ apiKey: "" }, "rinkeby"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if network subkey is undefined", () => {
      assert.throws(
        () =>
          resolveEtherscanApiKey({ apiKey: { rinkeby: undefined } }, "rinkeby"),
        "Please provide a Block Explorer API token via hardhat config.\n  E.g.: { [...], etherscan: { apiKey: { rinkeby: 'an API key' } }, [...] }"
      );
    });

    it("should throw if network subkey is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ apiKey: { rinkeby: "" } }, "rinkeby"),
        "Please provide a Block Explorer API token via hardhat config.\n  E.g.: { [...], etherscan: { apiKey: { rinkeby: 'an API key' } }, [...] }"
      );
    });

    it("should throw if network subkey is not a supported network", () => {
      assert.throws(
        // @ts-expect-error
        () => resolveEtherscanApiKey({ apiKey: { boom: "" } }, "boom"),
        "Unrecognized network: boom"
      );
    });
  });
});
