import type { EthereumProvider } from "hardhat/types";

import { assert } from "chai";
import * as chains from "viem/chains";

import {
  innerGetPublicClient,
  innerGetWalletClients,
  innerGetTestClient,
} from "../src/internal/clients";
import { EthereumMockedProvider } from "./mocks/provider";

describe("clients", () => {
  describe("innerGetPublicClient", () => {
    it("should return a public client", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.mainnet);

      assert.isDefined(client);
      assert.strictEqual(client.type, "publicClient");
      assert.strictEqual(client.chain.id, chains.mainnet.id);
    });

    it("should return a public client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.mainnet, {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.strictEqual(client.pollingInterval, 1000);
      assert.strictEqual(client.cacheTime, 2000);
    });

    it("should return a public client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.hardhat);

      assert.strictEqual(client.pollingInterval, 50);
      assert.strictEqual(client.cacheTime, 0);
    });
  });

  describe("innerGetWalletClients", () => {
    it("should return a list of wallet clients", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await innerGetWalletClients(provider, chains.mainnet, [
        "0x1",
        "0x2",
      ]);

      assert.isArray(clients);
      assert.isNotEmpty(clients);
      clients.forEach((client) => {
        assert.strictEqual(client.type, "walletClient");
        assert.strictEqual(client.chain.id, chains.mainnet.id);
      });
      assert.strictEqual(clients[0].account.address, "0x1");
      assert.strictEqual(clients[1].account.address, "0x2");
    });

    it("should return a list of wallet clients with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await innerGetWalletClients(
        provider,
        chains.mainnet,
        ["0x1", "0x2"],
        {
          pollingInterval: 1000,
          cacheTime: 2000,
        }
      );

      assert.isArray(clients);
      assert.isNotEmpty(clients);
      clients.forEach((client) => {
        assert.strictEqual(client.pollingInterval, 1000);
        assert.strictEqual(client.cacheTime, 2000);
      });
    });

    it("should return a list of wallet clients with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await innerGetWalletClients(provider, chains.hardhat, [
        "0x1",
        "0x2",
      ]);

      assert.isArray(clients);
      assert.isNotEmpty(clients);
      clients.forEach((client) => {
        assert.strictEqual(client.pollingInterval, 50);
        assert.strictEqual(client.cacheTime, 0);
      });
    });

    it("should return an empty array if there are no accounts owned by the user", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await innerGetWalletClients(provider, chains.mainnet, []);

      assert.isArray(clients);
      assert.isEmpty(clients);
    });
  });

  describe("innerGetTestClient", () => {
    it("should return a test client with hardhat mode", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.hardhat,
        "hardhat"
      );

      assert.isDefined(client);
      assert.strictEqual(client.type, "testClient");
      assert.strictEqual(client.chain.id, chains.hardhat.id);
      assert.strictEqual(client.mode, "hardhat");
    });

    it("should return a test client with anvil mode", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.foundry,
        "anvil"
      );

      assert.isDefined(client);
      assert.strictEqual(client.type, "testClient");
      assert.strictEqual(client.chain.id, chains.foundry.id);
      assert.strictEqual(client.mode, "anvil");
    });

    it("should return a test client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.hardhat,
        "hardhat",
        {
          pollingInterval: 1000,
          cacheTime: 2000,
        }
      );

      assert.strictEqual(client.pollingInterval, 1000);
      assert.strictEqual(client.cacheTime, 2000);
    });

    it("should return a test client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.hardhat,
        "hardhat"
      );

      assert.strictEqual(client.pollingInterval, 50);
      assert.strictEqual(client.cacheTime, 0);
    });
  });
});
