import type {
  OpPublicClient,
  OpWalletClient,
  PublicClient,
  WalletClient,
} from "../src/types.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { expectTypeOf } from "expect-type";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { parseEther } from "viem";

import HardhatViem from "../src/index.js";
import {
  getPublicClient,
  getWalletClients,
  getWalletClient,
  getDefaultWalletClient,
  getTestClient,
} from "../src/internal/clients.js";

import { MockEthereumProvider } from "./utils.js";

describe("clients", () => {
  describe("getPublicClient", () => {
    it("should return a public client", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" }); // mainnet
      const client = await getPublicClient(provider, "l1");

      assert.equal(client.type, "publicClient");
      assert.equal(client.chain.id, 1);
      assert.equal(client.transport.retryCount, 3);
      assert.equal(client.pollingInterval, 4_000);
      assert.equal(client.cacheTime, 4_000);
      expectTypeOf(client).toEqualTypeOf<PublicClient>();
      // L2 actions should not be available
      expectTypeOf(client).not.toHaveProperty("buildDepositTransaction");
      // default actions should be available
      expectTypeOf(client).toHaveProperty("getBalance");
    });

    it("should return a public client extended with L2 actions for Optimism", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0xa" }); // optimism
      const client = await getPublicClient(provider, "optimism");

      assert.equal(client.type, "publicClient");
      assert.equal(client.chain.id, 10);
      expectTypeOf(client).toEqualTypeOf<OpPublicClient>();
      // L2 actions should be available
      expectTypeOf(client).toHaveProperty("buildDepositTransaction");
      // default actions should be available
      expectTypeOf(client).toHaveProperty("getBalance");
    });

    it("should return a public client with custom parameters", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" }); // mainnet
      const client = await getPublicClient(provider, "l1", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return a public client with default parameters for development networks", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        hardhat_metadata: {}, // hardhat network
      });
      const client = await getPublicClient(provider, "l1");

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);

      const provider2 = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        anvil_nodeInfo: {}, // anvil network
      });
      const client2 = await getPublicClient(provider2, "l1");

      assert.equal(client2.pollingInterval, 50);
      assert.equal(client2.cacheTime, 0);
      assert.equal(client2.transport.retryCount, 0);
    });
  });

  describe("getWalletClients", () => {
    it("should return a list of wallet clients", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: ["0x123", "0x456"],
      });
      const clients = await getWalletClients(provider, "l1");

      assert.ok(Array.isArray(clients), "should return an array of clients");
      assert.equal(
        clients.length,
        2,
        "should return two clients as there are two accounts",
      );
      clients.forEach((client) => {
        assert.equal(client.type, "walletClient");
        assert.equal(client.chain.id, 1);
        assert.equal(client.transport.retryCount, 3);
        assert.equal(client.pollingInterval, 4_000);
        assert.equal(client.cacheTime, 4_000);
        expectTypeOf(client).toEqualTypeOf<WalletClient>();
        // L2 actions should not be available
        expectTypeOf(client).not.toHaveProperty("initiateWithdrawal");
        // default actions should be available
        expectTypeOf(client).toHaveProperty("sendTransaction");
      });
      assert.equal(clients[0].account.address, "0x123");
      assert.equal(clients[1].account.address, "0x456");
    });

    it("should return a list of wallet clients extended with L2 actions for Optimism", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0xa", // optimism
        eth_accounts: ["0x123", "0x456"],
      });
      const clients = await getWalletClients(provider, "optimism");

      assert.ok(Array.isArray(clients), "should return an array of clients");
      assert.equal(
        clients.length,
        2,
        "should return two clients as there are two accounts",
      );
      clients.forEach((client) => {
        assert.equal(client.type, "walletClient");
        assert.equal(client.chain.id, 10);
        expectTypeOf(client).toEqualTypeOf<OpWalletClient>();
        // L2 actions should be available
        expectTypeOf(client).toHaveProperty("initiateWithdrawal");
        // default actions should be available
        expectTypeOf(client).toHaveProperty("sendTransaction");
      });
      assert.equal(clients[0].account.address, "0x123");
      assert.equal(clients[1].account.address, "0x456");
    });

    it("should return an empty array if there are no accounts owned by the user", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: [],
      });
      const clients = await getWalletClients(provider, "l1");

      assert.ok(Array.isArray(clients), "should return an array of clients");
      assert.equal(
        clients.length,
        0,
        "should return two clients as there are no accounts",
      );
    });

    it("should return a list of wallet clients with custom parameters", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: ["0x123", "0x456"],
      });
      const clients = await getWalletClients(provider, "l1", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.ok(Array.isArray(clients), "should return an array of clients");
      assert.equal(
        clients.length,
        2,
        "should return two clients as there are two accounts",
      );
      clients.forEach((client) => {
        assert.equal(client.pollingInterval, 1000);
        assert.equal(client.cacheTime, 2000);
      });
    });

    it("should return a list of wallet clients with default parameters for development networks", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        hardhat_metadata: {}, // hardhat network
        eth_accounts: ["0x123", "0x456"],
      });
      const clients = await getWalletClients(provider, "l1");

      assert.ok(Array.isArray(clients), "should return an array of clients");
      assert.equal(
        clients.length,
        2,
        "should return two clients as there are two accounts",
      );
      clients.forEach((client) => {
        assert.equal(client.pollingInterval, 50);
        assert.equal(client.cacheTime, 0);
        assert.equal(client.transport.retryCount, 0);
      });

      const provider2 = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        anvil_nodeInfo: {}, // anvil network
        eth_accounts: ["0x123", "0x456"],
      });
      const clients2 = await getWalletClients(provider2, "l1");

      assert.ok(Array.isArray(clients2), "should return an array of clients");
      assert.equal(
        clients2.length,
        2,
        "should return two clients as there are two accounts",
      );
      clients2.forEach((client) => {
        assert.equal(client.pollingInterval, 50);
        assert.equal(client.cacheTime, 0);
        assert.equal(client.transport.retryCount, 0);
      });
    });
  });

  describe("getWalletClient", () => {
    it("should return a wallet client", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
      });
      const client = await getWalletClient(provider, "l1", "0x123");

      assert.equal(client.type, "walletClient");
      assert.equal(client.chain.id, 1);
      assert.equal(client.account.address, "0x123");
      assert.equal(client.pollingInterval, 4_000);
      assert.equal(client.cacheTime, 4_000);
      expectTypeOf(client).toEqualTypeOf<WalletClient>();
      // L2 actions should not be available
      expectTypeOf(client).not.toHaveProperty("initiateWithdrawal");
      // default actions should be available
      expectTypeOf(client).toHaveProperty("sendTransaction");
    });

    it("should return a wallet client extended with L2 actions for Optimism", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0xa", // optimism
      });
      const client = await getWalletClient(provider, "optimism", "0x123");

      assert.equal(client.type, "walletClient");
      assert.equal(client.chain.id, 10);
      assert.equal(client.account.address, "0x123");
      assert.equal(client.pollingInterval, 4_000);
      assert.equal(client.cacheTime, 4_000);
      expectTypeOf(client).toEqualTypeOf<OpWalletClient>();
      // L2 actions should be available
      expectTypeOf(client).toHaveProperty("initiateWithdrawal");
      // default actions should be available
      expectTypeOf(client).toHaveProperty("sendTransaction");
    });

    it("should return a wallet client with custom parameters", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
      });
      const client = await getWalletClient(provider, "l1", "0x123", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return a wallet client with default parameters for development networks", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        hardhat_metadata: {}, // hardhat network
      });
      const client = await getWalletClient(provider, "l1", "0x123");

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);

      const provider2 = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        anvil_nodeInfo: {}, // anvil network
      });
      const client2 = await getWalletClient(provider2, "l1", "0x123");

      assert.equal(client2.pollingInterval, 50);
      assert.equal(client2.cacheTime, 0);
      assert.equal(client2.transport.retryCount, 0);
    });
  });

  describe("getDefaultWalletClient", () => {
    it("should return the default wallet client", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: ["0x123", "0x456"],
      });
      const client = await getDefaultWalletClient(provider, "l1");

      assert.equal(client.type, "walletClient");
      assert.equal(client.chain.id, 1);
      assert.equal(client.account.address, "0x123"); // first account
      expectTypeOf(client).toEqualTypeOf<WalletClient>();
    });

    it("should return the default wallet client extended with L2 actions for Optimism", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0xa", // optimism
        eth_accounts: ["0x123", "0x456"],
      });
      const client = await getDefaultWalletClient(provider, "optimism");

      assert.equal(client.type, "walletClient");
      assert.equal(client.chain.id, 10);
      assert.equal(client.account.address, "0x123"); // first account
      expectTypeOf(client).toEqualTypeOf<OpWalletClient>();
    });

    it("should throw an error if there are no accounts owned by the user", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: [],
      });

      await assertRejectsWithHardhatError(
        getDefaultWalletClient(provider, "l1"),
        HardhatError.ERRORS.HARDHAT_VIEM.GENERAL
          .DEFAULT_WALLET_CLIENT_NOT_FOUND,
        {
          chainId: 1,
        },
      );
    });

    it("should return the default wallet client with custom parameters", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x1", // mainnet
        eth_accounts: ["0x123", "0x456"],
      });
      const client = await getDefaultWalletClient(provider, "l1", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return the default wallet client with default parameters for development networks", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        eth_accounts: ["0x123", "0x456"],
        hardhat_metadata: {}, // hardhat network
      });
      const client = await getDefaultWalletClient(provider, "l1");

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);

      const provider2 = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337
        eth_accounts: ["0x123", "0x456"],
        anvil_nodeInfo: {}, // anvil network
      });
      const client2 = await getDefaultWalletClient(provider2, "l1");

      assert.equal(client2.pollingInterval, 50);
      assert.equal(client2.cacheTime, 0);
      assert.equal(client2.transport.retryCount, 0);
    });
  });

  describe("getTestClient", () => {
    it("should return a test client with hardhat mode", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {}, // hardhat network
      });
      const client = await getTestClient(provider, "generic");

      assert.equal(client.type, "testClient");
      assert.equal(client.chain.id, 31337);
      assert.equal(client.mode, "hardhat");
      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);
    });

    it("should return a test client with anvil mode", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        anvil_nodeInfo: {}, // anvil network
      });
      const client = await getTestClient(provider, "generic");

      assert.equal(client.type, "testClient");
      assert.equal(client.chain.id, 31337);
      assert.equal(client.mode, "anvil");
      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);
    });

    it("should return a test client with custom parameters", async () => {
      const provider = new MockEthereumProvider({
        eth_chainId: "0x7a69", // 31337 in hex
        hardhat_metadata: {}, // hardhat network
      });

      const client = await getTestClient(provider, "generic", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });
  });

  describe("e2e", () => {
    let hre: HardhatRuntimeEnvironment;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatViem],
      });
    });

    it("should be able to query the blockchain using the public client", async () => {
      const networkConnection = await hre.network.connect();

      const publicClient = await networkConnection.viem.getPublicClient();
      const blockNumber = await publicClient.getBlockNumber();

      assert.equal(blockNumber, 0n);
    });

    it("should be able to query the blockchain using the wallet client", async () => {
      const networkConnection = await hre.network.connect();

      const publicClient = await networkConnection.viem.getPublicClient();
      const [fromWalletClient, toWalletClient] =
        await networkConnection.viem.getWalletClients();
      const fromAddress = fromWalletClient.account.address;
      const toAddress = toWalletClient.account.address;

      const fromBalanceBefore = await publicClient.getBalance({
        address: fromAddress,
      });
      const toBalanceBefore = await publicClient.getBalance({
        address: toAddress,
      });

      const etherAmount = parseEther("0.0001");
      const hash = await fromWalletClient.sendTransaction({
        to: toAddress,
        value: etherAmount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const transactionFee = receipt.gasUsed * receipt.effectiveGasPrice;

      const fromBalanceAfter = await publicClient.getBalance({
        address: fromAddress,
      });
      const toBalanceAfter = await publicClient.getBalance({
        address: toAddress,
      });

      assert.ok(receipt !== undefined, "Receipt should be defined");
      assert.equal(receipt.status, "success");
      assert.equal(
        fromBalanceAfter,
        fromBalanceBefore - etherAmount - transactionFee,
      );
      assert.equal(toBalanceAfter, toBalanceBefore + etherAmount);
    });

    it("should be able to query the blockchain using the test client", async () => {
      const networkConnection = await hre.network.connect();
      const publicClient = await networkConnection.viem.getPublicClient();
      const testClient = await networkConnection.viem.getTestClient();

      await testClient.mine({
        blocks: 1000000,
      });
      const blockNumber = await publicClient.getBlockNumber();
      assert.equal(blockNumber, 1000000n);
    });

    it("should have access to L2 actions", async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatViem],
        networks: {
          edrOptimism: {
            type: "edr",
            chainType: "optimism",
          },
        },
      });

      const { viem } = await hre.network.connect({
        network: "edrOptimism",
        chainType: "optimism",
      });
      const publicClient = await viem.getPublicClient();
      const [senderClient] = await viem.getWalletClients();
      await publicClient.estimateL1Gas({
        account: senderClient.account.address,
        to: senderClient.account.address,
        value: 1n,
      });
    });
  });
});
