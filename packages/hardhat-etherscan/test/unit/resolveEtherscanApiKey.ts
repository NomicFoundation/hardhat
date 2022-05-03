import { assert } from "chai";
import { resolveEtherscanApiKey } from "../../src/resolveEtherscanApiKey";

describe("Etherscan API Key resolution", () => {
  describe("provide one api key", () => {
    it("returns the api key no matter the network", () => {
      assert.equal(resolveEtherscanApiKey("testtoken", "mainnet"), "testtoken");

      assert.equal(resolveEtherscanApiKey("testtoken", "rinkeby"), "testtoken");
    });
  });

  describe("provide multiple api keys", () => {
    it("can retrieve different keys depending on --network", () => {
      const apiKey = {
        mainnet: "mainnet-testtoken",
        rinkeby: "rinkeby-testtoken",
      };

      assert.equal(
        resolveEtherscanApiKey(apiKey, "mainnet"),
        "mainnet-testtoken"
      );
      assert.equal(
        resolveEtherscanApiKey(apiKey, "rinkeby"),
        "rinkeby-testtoken"
      );
    });
  });

  describe("provide no api key", () => {
    const expectedBadApiKeyMessage =
      /Please provide an Etherscan API token via hardhat config/;

    it("should throw if api key root is undefined", () => {
      assert.throws(
        () => resolveEtherscanApiKey(undefined, "rinkeby"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if api key root is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey("", "rinkeby"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if network subkey is undefined", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ rinkeby: undefined }, "rinkeby"),
        /Please provide an Etherscan API token via hardhat config./
      );
    });

    it("should throw if network subkey is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ rinkeby: "" }, "rinkeby"),
        /Please provide an Etherscan API token via hardhat config./
      );
    });
  });
});
