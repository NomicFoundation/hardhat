import type { EthereumProvider } from "hardhat/types";

import { assert } from "chai";
import * as chains from "viem/chains";

import {
  _getPublicClient,
  _getWalletClients,
  _getTestClient,
} from "../src/internal/clients";
import { EthereumMockedProvider } from "./mocks/provider";

describe("clients", () => {
  describe("_getPublicClient", () => {
    it("should return a public client", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.mainnet);

      assert.isDefined(client);
      assert.equal(client.type, "publicClient");
      assert.equal(client.chain?.id, chains.mainnet.id);
    });

    it("should return a public client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.mainnet, {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return a public client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.hardhat);

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
    });
  });

  describe("_getWalletClients", () => {
    it("should return a list of wallet clients", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await _getWalletClients(provider, chains.mainnet, [
        "0x1",
        "0x2",
      ]);

      assert.isArray(clients);
      assert.isNotEmpty(clients);
      clients.forEach((client) => {
        assert.equal(client.type, "walletClient");
        assert.equal(client.chain?.id, chains.mainnet.id);
      });
      assert.equal(clients[0].account?.address, "0x1");
      assert.equal(clients[1].account?.address, "0x2");
    });

    it("should return a list of wallet clients with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await _getWalletClients(
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
        assert.equal(client.pollingInterval, 1000);
        assert.equal(client.cacheTime, 2000);
      });
    });

    it("should return a list of wallet clients with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const clients = await _getWalletClients(provider, chains.hardhat, [
        "0x1",
        "0x2",
      ]);

      assert.isArray(clients);
      assert.isNotEmpty(clients);
      clients.forEach((client) => {
        assert.equal(client.pollingInterval, 50);
        assert.equal(client.cacheTime, 0);
      });
    });
  });

  describe("_getTestClient", () => {
    it("should return a test client with hardhat mode", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getTestClient(provider, chains.hardhat, "hardhat");

      assert.isDefined(client);
      assert.equal(client.type, "testClient");
      assert.equal(client.chain?.id, chains.hardhat.id);
      assert.equal(client.mode, "hardhat");
    });

    it("should return a test client with anvil mode", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getTestClient(provider, chains.foundry, "anvil");

      assert.isDefined(client);
      assert.equal(client.type, "testClient");
      assert.equal(client.chain?.id, chains.foundry.id);
      assert.equal(client.mode, "anvil");
    });

    it("should return a test client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getTestClient(provider, chains.hardhat, "hardhat", {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return a test client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getTestClient(provider, chains.hardhat, "hardhat");

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
    });
  });
});
