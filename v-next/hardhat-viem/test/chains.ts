import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
  HttpNetworkConfig,
  ResolvedConfigurationVariable,
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
  setChainContext,
} from "../src/internal/chains.js";

import { MockEthereumProvider } from "./utils.js";

// Helper to create mock NetworkConfig with proper ResolvedConfigurationVariable
function createMockHttpNetworkConfig(
  url: string,
  chainId: number,
  chainType?: ChainType,
): Readonly<HttpNetworkConfig> {
  const resolvedUrl: ResolvedConfigurationVariable = {
    _type: "ResolvedConfigurationVariable",
    format: "url",
    get: async () => url,
    getUrl: async () => url,
    getBigInt: async () => 0n,
    getHexString: async () => "0x",
  };

  const config: HttpNetworkConfig = {
    type: "http",
    url: resolvedUrl,
    chainId,
    chainType: chainType ?? "generic",
    accounts: "remote",
    gas: "auto",
    gasMultiplier: 1,
    gasPrice: "auto",
    httpHeaders: {},
    timeout: 20000,
  };

  return config;
}

// Helper to create a mock ChainDescriptorConfig
function createMockChainDescriptor(
  name: string,
  chainType: ChainType = "generic",
  etherscanUrl?: string,
): ChainDescriptorConfig {
  return {
    name,
    chainType,
    blockExplorers:
      etherscanUrl !== undefined
        ? { etherscan: { name: "Explorer", url: etherscanUrl, apiUrl: "" } }
        : {},
  };
}

describe("chains", () => {
  describe("getChain", () => {
    it("should return the chain corresponding to the chain id", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" }); // mainnet chain id

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, chains.mainnet);
      assert.equal(provider.callCount, 1);
    });

    it("should return the hardhat chain if the network is hardhat and it's not a forked network", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {},
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, chains.hardhat);
      assert.equal(provider.callCount, 2);
    });

    it("should return a forked chain with hardhat properties when hardhat is forked from a known network", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {
          forkedNetwork: {
            chainId: 1, // mainnet
          },
        },
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, {
        ...chains.mainnet,
        ...chains.hardhat,
        id: 31337,
      });
      assert.equal(provider.callCount, 2);
    });

    it("should return the hardhat chain when forked from an unknown network", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {
          forkedNetwork: {
            chainId: 999999, // unknown chainId
          },
        },
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, {
        ...chains.hardhat,
        id: 31337,
      });
      assert.equal(provider.callCount, 2);
    });

    it("should return the foundry chain if the network is anvil", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        anvil_nodeInfo: {},
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, chains.anvil);
      assert.equal(provider.callCount, 2);
    });

    it("should throw if it's not a dev network and there is no chain with that id", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x0" }); // fake chain id 0

      await assertRejectsWithHardhatError(
        getChain(provider, "generic"),
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.NETWORK_NOT_FOUND,
        { chainId: 0 },
      );
    });

    it("should return the first chain that matches the chain id if there are multiple chains with the same id", async () => {
      // chain id 999 corresponds to hyperEvm, wanchainTestnet and also zoraTestnet
      const provider = new MockEthereumProvider({ eth_chainId: "0x3e7" }); // 999 in hex

      const chainId = await getChain(provider, "generic");
      assert.equal(chainId, chains.hyperEvm);
    });

    it("should return a hardhat chain with the custom chainId", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x3039", // 12345 in hex
        hardhat_metadata: {},
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, {
        ...chains.hardhat,
        id: 12345,
      });
    });

    it("should return an anvil chain with the custom chainId", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x3039", // 12345 in hex
        anvil_nodeInfo: {},
      });

      const chain = await getChain(provider, "generic");

      assert.deepEqual(chain, {
        ...chains.anvil,
        id: 12345,
      });
    });

    it("should return a custom chain when chainDescriptor is defined", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" }); // 9876 in hex

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [9876n, createMockChainDescriptor("GCCNET")],
      ]);

      await setChainContext(
        provider,
        chainDescriptors,
        "gccnet",
        createMockHttpNetworkConfig("https://rpc.gccnet.io", 9876),
      );

      const chain = await getChain(provider, "generic");

      assert.equal(chain.id, 9876);
      assert.equal(chain.name, "GCCNET");
    });

    it("should fallback to network config when no chainDescriptor defined", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" }); // 9876 in hex

      await setChainContext(
        provider,
        new Map(), // Empty chainDescriptors
        "adiTestnet", // Network name becomes chain name
        createMockHttpNetworkConfig("https://rpc.adi.io", 9876),
      );

      const chain = await getChain(provider, "generic");

      assert.equal(chain.id, 9876);
      assert.equal(chain.name, "adiTestnet");
    });

    it("should throw if chainId doesn't match network config and no chainDescriptor", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" }); // 9876 in hex

      await setChainContext(
        provider,
        new Map(), // Empty chainDescriptors
        "otherNetwork",
        createMockHttpNetworkConfig("https://rpc.other.io", 12345), // Different chainId!
      );

      await assertRejectsWithHardhatError(
        getChain(provider, "generic"),
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.NETWORK_NOT_FOUND,
        { chainId: 9876 },
      );
    });

    it("should include etherscan block explorer when defined in chainDescriptor", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" });

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [
          9876n,
          createMockChainDescriptor(
            "GCCNET",
            "generic",
            "https://scan.gccnet.io",
          ),
        ],
      ]);

      await setChainContext(
        provider,
        chainDescriptors,
        "gccnet",
        createMockHttpNetworkConfig("https://rpc.gccnet.io", 9876),
      );

      const chain = await getChain(provider, "generic");

      assert.equal(chain.blockExplorers?.default?.name, "Explorer");
      assert.equal(
        chain.blockExplorers?.default?.url,
        "https://scan.gccnet.io",
      );
    });

    it("should add OP contracts when chainDescriptor has chainType op", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" });

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [9876n, createMockChainDescriptor("MyL2", "op")],
      ]);

      await setChainContext(
        provider,
        chainDescriptors,
        "myl2",
        createMockHttpNetworkConfig("https://rpc.myl2.io", 9876),
      );

      const chain = await getChain(provider, "generic");

      assert.ok(
        chain.contracts !== undefined,
        "OP chain should have contracts",
      );
    });

    it("should add OP contracts when network config chainType is op", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" });

      await setChainContext(
        provider,
        new Map(), // No chainDescriptor - use network fallback
        "adiTestnet",
        createMockHttpNetworkConfig("https://rpc.adi.io", 9876, "op"),
      );

      const chain = await getChain(provider, "generic");

      assert.ok(
        chain.contracts !== undefined,
        "OP chain from network config should have contracts",
      );
    });

    it("should prefer chainDescriptor over network config when both available", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x2694" });

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [9876n, createMockChainDescriptor("ExplicitName")],
      ]);

      await setChainContext(
        provider,
        chainDescriptors,
        "networkName", // Different from chainDescriptor name
        createMockHttpNetworkConfig("https://rpc.network.io", 9876),
      );

      const chain = await getChain(provider, "generic");

      // Should use chainDescriptor name, not network name
      assert.equal(chain.name, "ExplicitName");
    });
  });

  describe("getChainId", () => {
    it("should return the chainId", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
      const chainId = await getChainId(provider);

      assert.equal(chainId, 1);
      assert.equal(provider.callCount, 1);
    });

    it("should cache the chainId for the same provider", async () => {
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
    it("should return true for Hardhat and Anvil nodes", async () => {
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

    it("should return false for other nodes", async () => {
      assert.ok(
        !(await isDevelopmentNetwork(new MockEthereumProvider({}))),
        "chain id 1 should not be a development network",
      );
    });
  });

  describe("isHardhatNetwork", () => {
    it("should return true if the network is hardhat", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });
      const isHardhat = await isHardhatNetwork(provider);

      assert.equal(isHardhat, true);
      assert.equal(provider.callCount, 1);
    });

    it("should return false if the network is not hardhat", async () => {
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

    it("should cache the response for the same provider", async () => {
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
    it("should return true if the network is anvil", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });
      const isAnvil = await isAnvilNetwork(provider);

      assert.equal(isAnvil, true);
      assert.equal(provider.callCount, 1);
    });

    it("should return false if the network is not anvil", async () => {
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

    it("should cache the response for the same provider", async () => {
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
    it("should return hardhat if the network is hardhat", async () => {
      const provider = new MockEthereumProvider({ hardhat_metadata: {} });

      const mode = await getMode(provider);

      assert.equal(mode, "hardhat");
    });

    it("should return anvil if the network is anvil", async () => {
      const provider = new MockEthereumProvider({ anvil_nodeInfo: {} });

      const mode = await getMode(provider);

      assert.equal(mode, "anvil");
    });

    it("should throw if the network is neither hardhat nor anvil", async () => {
      const provider = new MockEthereumProvider();

      await assertRejectsWithHardhatError(
        getMode(provider),
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL
          .UNSUPPORTED_DEVELOPMENT_NETWORK,
        {},
      );
    });
  });
});
