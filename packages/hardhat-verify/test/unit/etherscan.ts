import { assert, expect } from "chai";
import { Etherscan } from "../../src/etherscan";

describe("Etherscan", () => {
  const chainConfig = {
    network: "goerli",
    chainId: 5,
    urls: {
      apiURL: "https://api-goerli.etherscan.io/api",
      browserURL: "https://goerli.etherscan.io",
    },
  };

  describe("constructor", () => {
    it("should throw if the apiKey is undefined or empty", () => {
      expect(() => new Etherscan(undefined, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => new Etherscan("", chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });

    it("should throw if the apiKey is an object but apiKey[network] is undefined or empty", () => {
      expect(() => new Etherscan({}, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => new Etherscan({ goerli: "" }, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });
  });

  describe("getContractUrl", () => {
    it("should return the contract url", () => {
      const expectedContractAddress =
        "https://goerli.etherscan.io/address/someAddress#code";
      let etherscan = new Etherscan("someApiKey", chainConfig);
      let contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);

      etherscan = new Etherscan("someApiKey", {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "   https://goerli.etherscan.io/  ",
        },
      });
      contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);
    });
  });
});
