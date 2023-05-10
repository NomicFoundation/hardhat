import type { Network } from "hardhat/types";
import type { ChainConfig } from "../../src/types";
import { assert, expect } from "chai";
import { builtinChains, getCurrentChainConfig } from "../../src/chain-config";

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
      const network = {
        name: "customChain2",
        provider: {
          async send() {
            return (5000).toString(16);
          },
        },
      } as unknown as Network;
      const chainConfig = await getCurrentChainConfig(network, customChains);

      assert.equal(chainConfig.network, "customChain2");
      assert.equal(chainConfig.chainId, 5000);
    });

    it("should return a built-in chain if no custom chain matches", async function () {
      const network = {
        name: "goerli",
        provider: {
          async send() {
            return (5).toString(16);
          },
        },
      } as unknown as Network;
      const chainConfig = await getCurrentChainConfig(network, customChains);

      assert.equal(chainConfig.network, "goerli");
      assert.equal(chainConfig.chainId, 5);
    });

    it("should throw if the selected network is hardhat and it's not a added to custom chains", async () => {
      const network = {
        name: "hardhat",
        provider: {
          async send() {
            return (31337).toString(16);
          },
        },
      } as unknown as Network;

      await expect(
        getCurrentChainConfig(network, customChains)
      ).to.be.rejectedWith(
        "The selected network is hardhat. Please select a network supported by Etherscan."
      );
    });

    it("should return hardhat if the selected network is hardhat and it was added as a custom chain", async () => {
      const network = {
        name: "hardhat",
        provider: {
          async send() {
            return (31337).toString(16);
          },
        },
      } as unknown as Network;

      const chainConfig = await getCurrentChainConfig(network, [
        ...customChains,
        {
          network: "hardhat",
          chainId: 31337,
          urls: {
            apiURL: "<api-url>",
            browserURL: "<browser-url>",
          },
        },
      ]);

      assert.equal(chainConfig.network, "hardhat");
      assert.equal(chainConfig.chainId, 31337);
    });

    it("should throw if there are no matches at all", async () => {
      const network = {
        name: "someNetwork",
        provider: {
          async send() {
            return (21343214123).toString(16);
          },
        },
      } as unknown as Network;

      await expect(
        getCurrentChainConfig(network, customChains)
      ).to.be.rejectedWith(
        /Trying to verify a contract in a network with chain id 21343214123, but the plugin doesn't recognize it as a supported chain./
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
