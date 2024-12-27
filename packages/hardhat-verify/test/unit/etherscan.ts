import type { EthereumProvider } from "hardhat/types";
import type { ChainConfig } from "../../src/types";

import { assert, expect } from "chai";
import { Etherscan } from "../../src/internal/etherscan";

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
      expect(() => Etherscan.fromChainConfig(undefined, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => Etherscan.fromChainConfig("", chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });

    it("should throw if the apiKey is an object but apiKey[network] is undefined or empty", () => {
      expect(() => Etherscan.fromChainConfig({}, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() =>
        Etherscan.fromChainConfig({ goerli: "" }, chainConfig)
      ).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });
  });

  describe("getCurrentChainConfig", () => {
    const customChains: ChainConfig[] = [
      {
        network: "customChain1",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain2",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain3",
        chainId: 4999,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
    ];

    it("should return the last matching custom chain defined by the user", async function () {
      const networkName = "customChain2";
      const ethereumProvider = {
        async send() {
          return (5000).toString(16);
        },
      } as unknown as EthereumProvider;

      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        customChains
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 5000);
    });

    it("should return a built-in chain if no custom chain matches", async function () {
      const networkName = "goerli";
      const ethereumProvider = {
        async send() {
          return (5).toString(16);
        },
      } as unknown as EthereumProvider;
      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        customChains
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 5);
    });

    it("should throw if the selected network is hardhat and it's not added to custom chains", async () => {
      const networkName = "hardhat";
      const ethereumProvider = {
        async send() {
          return (31337).toString(16);
        },
      } as unknown as EthereumProvider;

      await expect(
        Etherscan.getCurrentChainConfig(
          networkName,
          ethereumProvider,
          customChains
        )
      ).to.be.rejectedWith(
        /The selected network is "hardhat", which is not supported for contract verification./
      );
    });

    it("should return hardhat if the selected network is hardhat and it was added as a custom chain", async () => {
      const networkName = "hardhat";
      const ethereumProvider = {
        async send() {
          return (31337).toString(16);
        },
      } as unknown as EthereumProvider;

      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        [
          ...customChains,
          {
            network: "hardhat",
            chainId: 31337,
            urls: {
              apiURL: "<api-url>",
              browserURL: "<browser-url>",
            },
          },
        ]
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 31337);
    });

    it("should throw if there are no matches at all", async () => {
      const networkName = "someNetwork";
      const ethereumProvider = {
        async send() {
          return (21343214123).toString(16);
        },
      } as unknown as EthereumProvider;

      await expect(
        Etherscan.getCurrentChainConfig(
          networkName,
          ethereumProvider,
          customChains
        )
      ).to.be.rejectedWith(
        /Trying to verify a contract in a network with chain id 21343214123, but the plugin doesn't recognize it as a supported chain./
      );
    });
  });

  describe("getContractUrl", () => {
    it("should return the contract url", () => {
      const expectedContractAddress =
        "https://goerli.etherscan.io/address/someAddress#code";
      let etherscan = Etherscan.fromChainConfig("someApiKey", chainConfig);
      let contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);

      etherscan = Etherscan.fromChainConfig("someApiKey", {
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
