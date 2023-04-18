import { assert, expect } from "chai";
import { EthereumProvider } from "hardhat/types";
import { builtinChains, getCurrentChainConfig } from "../../src/chain-config";

import { ChainConfig } from "../../src/types";

describe("Chain Config", () => {
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
      const provider = {
        async send() {
          return (5000).toString(16);
        },
      } as unknown as EthereumProvider;
      const chainConfig = await getCurrentChainConfig(provider, customChains);

      assert.equal(chainConfig.network, "customChain2");
      assert.equal(chainConfig.chainId, 5000);
    });

    it("should return a built-in chain if no custom chain matches", async function () {
      const provider = {
        async send() {
          return (5).toString(16);
        },
      } as unknown as EthereumProvider;
      const chainConfig = await getCurrentChainConfig(provider, customChains);

      assert.equal(chainConfig.network, "goerli");
      assert.equal(chainConfig.chainId, 5);
    });

    it("should throw if there are no matches at all", async () => {
      const provider = {
        async send() {
          return (31337).toString(16);
        },
      } as unknown as EthereumProvider;

      await expect(
        getCurrentChainConfig(provider, customChains)
      ).to.be.rejectedWith(
        /Trying to verify a contract in a network with chain id 31337, but the plugin doesn't recognize it as a supported chain./
      );
    });
  });

  describe("builtinChains", () => {
    it("should have no duplicate chain ids", () => {
      // check that xdai/gnosis is the only duplicate
      const xdaiGnosisChains = builtinChains.filter(
        ({ chainId }) => chainId === 100
      );
      assert.lengthOf(xdaiGnosisChains, 2);

      // check that there are no duplicates in the rest of the list
      const filteredChainIds = builtinChains.filter(
        ({ chainId }) => chainId !== 100
      );

      const uniqueIds = [...new Set(filteredChainIds)];

      assert.notEqual(0, uniqueIds.length);
      assert.equal(uniqueIds.length, filteredChainIds.length);
    });

    it("should be sorted by chainId in ascending order", () => {
      const isAscending = builtinChains.every(
        ({ chainId }, index) =>
          index === 0 || chainId >= builtinChains[index - 1].chainId
      );

      assert(isAscending);
    });
  });
});
