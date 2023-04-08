import { assert } from "chai";
import { resolveEtherscanApiKey } from "../../src/resolveEtherscanApiKey";

describe("Etherscan API Key resolution", () => {
  describe("provide one api key", () => {
    it("returns the api key no matter the network", () => {
      assert.equal(resolveEtherscanApiKey("testtoken", "mainnet"), "testtoken");

      assert.equal(resolveEtherscanApiKey("testtoken", "goerli"), "testtoken");
    });
  });

  describe("provide multiple api keys", () => {
    it("can retrieve different keys depending on --network", () => {
      const apiKey = {
        mainnet: "mainnet-testtoken",
        goerli: "goerli-testtoken",
      };

      assert.equal(
        resolveEtherscanApiKey(apiKey, "mainnet"),
        "mainnet-testtoken"
      );
      assert.equal(
        resolveEtherscanApiKey(apiKey, "goerli"),
        "goerli-testtoken"
      );
    });
  });

  describe("provide no api key", () => {
    const expectedBadApiKeyMessage =
      /You are trying to verify a contract in 'goerli', but no API token was found for this network. Please provide one in your hardhat config. For example/;

    it("should throw if api key root is undefined", () => {
      assert.throws(
        () => resolveEtherscanApiKey(undefined, "goerli"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if api key root is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey("", "goerli"),
        expectedBadApiKeyMessage
      );
    });
    it("should return empty apiKey if api key root is empty string and network is base-goerli", () => {
      assert.equal(
         resolveEtherscanApiKey("", "base_goerli"),
        ""
      );
    });
    it("should throw if network subkey is undefined", () => {
      assert.throws(
        // @ts-expect-error
        () => resolveEtherscanApiKey({ goerli: undefined }, "goerli"),
        expectedBadApiKeyMessage
      );
    });

    it("should throw if network subkey is empty string", () => {
      assert.throws(
        () => resolveEtherscanApiKey({ goerli: "" }, "goerli"),
        expectedBadApiKeyMessage
      );
    });
  });
});
