import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
} from "hardhat/types/config";
import type { ChainType } from "hardhat/types/network";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import * as chains from "viem/chains";

import {
  getChain,
  getChainId,
  isDevelopmentNetwork,
  isHardhatNetwork,
  isAnvilNetwork,
  getMode,
  resolveChain,
  createMinimalChain,
  getDefaultBlockExplorer,
} from "../src/internal/chains.js";

import { MockEthereumProvider } from "./utils.js";

function createMockChainDescriptor(
  name: string,
  chainType: ChainType = "generic",
  etherscanUrl?: string,
  blockscoutUrl?: string,
): ChainDescriptorConfig {
  return {
    name,
    chainType,
    blockExplorers: {
      ...(etherscanUrl !== undefined
        ? { etherscan: { name: "Explorer", url: etherscanUrl, apiUrl: "" } }
        : {}),
      ...(blockscoutUrl !== undefined
        ? {
            blockscout: {
              name: "Blockscout Explorer",
              url: blockscoutUrl,
              apiUrl: "",
            },
          }
        : {}),
    },
  };
}

describe("chains", () => {
  describe("getChain", () => {
    it("should return the matching chain when the chain id exists in viem's chain list", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" }); // mainnet chain id

      const chain = await getChain(provider, "generic", new Map(), "mainnet");

      assert.deepEqual(chain, chains.mainnet);
      assert.equal(provider.callCount, 1);
    });

    it("should return the first matching chain when multiple chains share the same chain id", async () => {
      // chain id 999 corresponds to hyperEvm, wanchainTestnet and also zoraTestnet
      const provider = new MockEthereumProvider({ eth_chainId: "0x3e7" }); // 999 in hex

      const chainId = await getChain(
        provider,
        "generic",
        new Map(),
        "hyperEvm",
      );
      assert.equal(chainId, chains.hyperEvm);
    });

    it("should return the Hardhat chain when the network is Hardhat and not forked", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {},
      });

      const chain = await getChain(provider, "generic", new Map(), "hardhat");

      assert.deepEqual(chain, chains.hardhat);
      assert.equal(provider.callCount, 2);
    });

    it("should return the Hardhat chain with a custom chain id", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x3039", // 12345 in hex
        hardhat_metadata: {},
      });

      const chain = await getChain(provider, "generic", new Map(), "hardhat");

      assert.deepEqual(chain, {
        ...chains.hardhat,
        id: 12345,
      });
    });

    it("should return a forked chain with Hardhat properties when forked from a known network", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {
          forkedNetwork: {
            chainId: 1, // mainnet
          },
        },
      });

      const chain = await getChain(provider, "generic", new Map(), "hardhat");

      assert.deepEqual(chain, {
        ...chains.mainnet,
        ...chains.hardhat,
        id: 31337,
      });
      assert.equal(provider.callCount, 2);
    });

    it("should return the Hardhat chain when forked from an unknown chain id", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {
          forkedNetwork: {
            chainId: 999999, // unknown chainId
          },
        },
      });

      const chain = await getChain(provider, "generic", new Map(), "hardhat");

      assert.deepEqual(chain, {
        ...chains.hardhat,
        id: 31337,
      });
      assert.equal(provider.callCount, 2);
    });

    it("should return the Anvil chain when the network is Anvil", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        anvil_nodeInfo: {},
      });

      const chain = await getChain(provider, "generic", new Map(), "anvil");

      assert.deepEqual(chain, chains.anvil);
      assert.equal(provider.callCount, 2);
    });

    it("should return the Anvil chain with a custom chain id", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x3039", // 12345 in hex
        anvil_nodeInfo: {},
      });

      const chain = await getChain(provider, "generic", new Map(), "anvil");

      assert.deepEqual(chain, {
        ...chains.anvil,
        id: 12345,
      });
    });

    it("should return a custom chain from chainDescriptors when the chain id is not in viem's chain list", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" }); // 9876 in hex

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [9876n, createMockChainDescriptor("GCCNET")],
      ]);

      const chain = await getChain(
        provider,
        "generic",
        chainDescriptors,
        "gccnet",
      );

      assert.equal(chain.id, 9876);
      assert.equal(chain.name, "GCCNET");
    });

    it("should fall back to a minimal chain with the network name when the chain id is not in viem's chain list and no descriptor matches", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" }); // 9876 in hex

      const chain = await getChain(
        provider,
        "generic",
        new Map(),
        "adiTestnet",
      );

      assert.equal(chain.id, 9876);
      assert.equal(chain.name, "adiTestnet");
    });
  });

  describe("getChainId", () => {
    it("should return the chain id", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
      const chainId = await getChainId(provider);

      assert.equal(chainId, 1);
      assert.equal(provider.callCount, 1);
    });

    it("should cache the chain id for the same provider", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
      const chainId1 = await getChainId(provider);
      // set different return values for the second call
      // to make sure the cache is being used
      provider.returnValues = {
        eth_chainId: "0x2",
      };
      const chainId2 = await getChainId(provider);

      assert.equal(
        chainId1,
        1,
        "chainId should match the expected value in the first call",
      );
      assert.equal(
        chainId2,
        1,
        "chainId should match the expected value in the second call",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should be 1 after two calls with the same provider",
      );

      // create a new provider with new return values
      // to make sure the cache is not being used
      const provider2 = new MockEthereumProvider({ eth_chainId: "0x3" });
      const chainId3 = await getChainId(provider2);

      assert.equal(
        chainId3,
        3,
        "chainId should match the expected value with a new provider",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should still be 1 after using a different provider",
      );
      assert.equal(
        provider2.callCount,
        1,
        "Second provider call count should be 1",
      );
    });
  });

  describe("isDevelopmentNetwork", () => {
    it("should return true for Hardhat and Anvil networks", async () => {
      assert.ok(
        await isDevelopmentNetwork(
          new MockEthereumProvider({ hardhat_metadata: {} }),
        ),
        "Hardhat nodes should be considered development networks",
      );

      assert.ok(
        await isDevelopmentNetwork(
          new MockEthereumProvider({ anvil_nodeInfo: {} }),
        ),
        "Anvil nodes should be considered development networks",
      );
    });

    it("should return false for non-development networks", async () => {
      assert.ok(
        !(await isDevelopmentNetwork(new MockEthereumProvider({}))),
        "chain id 1 should not be a development network",
      );
    });
  });

  describe("isHardhatNetwork", () => {
    it("should return true when the network is Hardhat", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });
      const isHardhat = await isHardhatNetwork(provider);

      assert.equal(isHardhat, true);
      assert.equal(provider.callCount, 1);
    });

    it("should return false when the network is not Hardhat", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });
      const isHardhat = await isHardhatNetwork(provider);

      assert.equal(isHardhat, false);
      assert.equal(
        provider.callCount,
        0,
        "Provider call count should be 0 as the rpc method is not called",
      );

      const provider2 = new MockEthereumProvider();
      const isHardhat2 = await isHardhatNetwork(provider2);

      assert.equal(isHardhat2, false);
      assert.equal(
        provider2.callCount,
        0,
        "Provider call count should be 0 as the rpc method is not called",
      );
    });

    it("should cache the result for the same provider", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });
      const isHardhat1 = await isHardhatNetwork(provider);
      // set different return values for the second call
      // to make sure the cache is being used
      provider.returnValues = { anvil_nodeInfo: {} };
      const isHardhat2 = await isHardhatNetwork(provider);

      assert.equal(
        isHardhat1,
        true,
        "isHardhat should match the expected value in the first call",
      );
      assert.equal(
        isHardhat2,
        true,
        "isHardhat should match the expected value in the second call",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should be 1 after two calls with the same provider",
      );

      // create a new provider with new return values
      // to make sure the cache is not being used
      const provider2 = new MockEthereumProvider({ anvil_nodeInfo: {} });
      const isHardhat3 = await isHardhatNetwork(provider2);

      assert.equal(
        isHardhat3,
        false,
        "isHardhat should match the expected value with a new provider",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should still be 1 after using a different provider",
      );
      assert.equal(
        provider2.callCount,
        0,
        "Second provider call count should be 0 as the rpc method is not called",
      );
    });
  });

  describe("isAnvilNetwork", () => {
    it("should return true when the network is Anvil", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });
      const isAnvil = await isAnvilNetwork(provider);

      assert.equal(isAnvil, true);
      assert.equal(provider.callCount, 1);
    });

    it("should return false when the network is not Anvil", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });
      const isAnvil = await isAnvilNetwork(provider);

      assert.equal(isAnvil, false);
      assert.equal(
        provider.callCount,
        0,
        "Provider call count should be 0 as the rpc method is not called",
      );

      const provider2 = new MockEthereumProvider();
      const isAnvil2 = await isAnvilNetwork(provider2);

      assert.equal(isAnvil2, false);
      assert.equal(
        provider2.callCount,
        0,
        "Provider call count should be 0 as the rpc method is not called",
      );
    });

    it("should cache the result for the same provider", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });
      const isAnvil1 = await isAnvilNetwork(provider);
      // set different return values for the second call
      // to make sure the cache is being used
      provider.returnValues = { hardhat_metadata: {} };
      const isAnvil2 = await isAnvilNetwork(provider);

      assert.equal(
        isAnvil1,
        true,
        "isAnvil should match the expected value in the first call",
      );
      assert.equal(
        isAnvil2,
        true,
        "isAnvil should match the expected value in the second call",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should be 1 after two calls with the same provider",
      );

      // create a new provider with new return values
      // to make sure the cache is not being used
      const provider2 = new MockEthereumProvider({ hardhat_metadata: {} });
      const isAnvil3 = await isAnvilNetwork(provider2);

      assert.equal(
        isAnvil3,
        false,
        "isAnvil should match the expected value with a new provider",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should still be 1 after using a different provider",
      );
      assert.equal(
        provider2.callCount,
        0,
        "Second provider call count should be 0 as the rpc method is not called",
      );
    });
  });

  describe("getMode", () => {
    it("should return 'hardhat' when the network is Hardhat", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });

      const mode = await getMode(provider);

      assert.equal(mode, "hardhat");
    });

    it("should return 'anvil' when the network is Anvil", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });

      const mode = await getMode(provider);

      assert.equal(mode, "anvil");
    });

    it("should throw when the network is neither Hardhat nor Anvil", async () => {
      const provider = new MockEthereumProvider();

      await assertRejectsWithHardhatError(
        getMode(provider),
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL
          .UNSUPPORTED_DEVELOPMENT_NETWORK,
        {},
      );
    });
  });

  describe("createMinimalChain", () => {
    it("should return a chain with the correct id and name", () => {
      const chain = createMinimalChain(42, "myChain");

      assert.equal(chain.id, 42);
      assert.equal(chain.name, "myChain");
    });

    it("should always set the default nativeCurrency", () => {
      const chain = createMinimalChain(1, "test");

      assert.deepEqual(chain.nativeCurrency, {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      });
    });

    it("should always set empty rpcUrls", () => {
      const chain = createMinimalChain(1, "test");

      assert.deepEqual(chain.rpcUrls, { default: { http: [] } });
    });
  });

  describe("getDefaultBlockExplorer", () => {
    it("should return undefined when no block explorers are configured", () => {
      const descriptor = createMockChainDescriptor("test");

      assert.equal(getDefaultBlockExplorer(descriptor), undefined);
    });

    it("should return the etherscan explorer when etherscan is configured", () => {
      const descriptor = createMockChainDescriptor(
        "test",
        "generic",
        "https://etherscan.io",
      );

      assert.deepEqual(getDefaultBlockExplorer(descriptor), {
        name: "Explorer",
        url: "https://etherscan.io",
      });
    });

    it("should default to 'Etherscan' when etherscan has no name", () => {
      const descriptor: ChainDescriptorConfig = {
        name: "test",
        chainType: "generic",
        blockExplorers: {
          etherscan: { url: "https://etherscan.io", apiUrl: "" },
        },
      };

      assert.deepEqual(getDefaultBlockExplorer(descriptor), {
        name: "Etherscan",
        url: "https://etherscan.io",
      });
    });

    it("should return the blockscout explorer when blockscout is configured", () => {
      const descriptor = createMockChainDescriptor(
        "test",
        "generic",
        undefined,
        "https://blockscout.com",
      );

      assert.deepEqual(getDefaultBlockExplorer(descriptor), {
        name: "Blockscout Explorer",
        url: "https://blockscout.com",
      });
    });

    it("should default to 'Blockscout' when blockscout has no name", () => {
      const descriptor: ChainDescriptorConfig = {
        name: "test",
        chainType: "generic",
        blockExplorers: {
          blockscout: { url: "https://blockscout.com", apiUrl: "" },
        },
      };

      assert.deepEqual(getDefaultBlockExplorer(descriptor), {
        name: "Blockscout",
        url: "https://blockscout.com",
      });
    });

    it("should prefer etherscan over blockscout when both are configured", () => {
      const descriptor = createMockChainDescriptor(
        "test",
        "generic",
        "https://etherscan.io",
        "https://blockscout.com",
      );

      const explorer = getDefaultBlockExplorer(descriptor);

      assert.equal(explorer?.url, "https://etherscan.io");
    });
  });

  describe("resolveChain", () => {
    it("should fall back to the network name when no descriptor matches the chain id", () => {
      const chain = resolveChain(9999, "fallbackName", new Map());

      assert.equal(chain.id, 9999);
      assert.equal(chain.name, "fallbackName");
    });

    it("should use the descriptor name when a matching descriptor is found", () => {
      const descriptors: ChainDescriptorsConfig = new Map([
        [9999n, createMockChainDescriptor("DescriptorName")],
      ]);

      const chain = resolveChain(9999, "networkName", descriptors);

      assert.equal(chain.name, "DescriptorName");
    });

    it("should include the block explorer from the descriptor when one is configured", () => {
      const descriptors: ChainDescriptorsConfig = new Map([
        [
          9999n,
          createMockChainDescriptor(
            "test",
            "generic",
            "https://scan.example.com",
          ),
        ],
      ]);

      const chain = resolveChain(9999, "networkName", descriptors);

      assert.equal(
        chain.blockExplorers?.default.url,
        "https://scan.example.com",
      );
    });

    it("should leave blockExplorers undefined when the descriptor has no explorers", () => {
      const descriptors: ChainDescriptorsConfig = new Map([
        [9999n, createMockChainDescriptor("test")],
      ]);

      const chain = resolveChain(9999, "networkName", descriptors);

      assert.equal(chain.blockExplorers, undefined);
    });

    it("should always include the minimal chain structure", () => {
      const chain = resolveChain(9999, "networkName", new Map());

      assert.deepEqual(chain.nativeCurrency, {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      });
      assert.deepEqual(chain.rpcUrls, { default: { http: [] } });
    });
  });
});
