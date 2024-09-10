import type { EthereumProvider } from "hardhat/types";

import { assert, expect } from "chai";
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
      assert.equal(client.type, "publicClient");
      assert.equal(client.chain.id, chains.mainnet.id);
    });

    it("should return a public client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.mainnet, {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
      assert.equal(client.transport.retryCount, 3);
    });

    it("should return a public client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.hardhat);

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);
    });

    it("should retry failed calls on public client", async () => {
      const provider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.mainnet);

      await expect(client.getBlockNumber()).to.eventually.be.rejectedWith(
        /unknown RPC error/
      );
      assert.equal(provider.calledCount, 4);
    });

    it("should not retry failed calls on public client when using a development network", async () => {
      const provider = new EthereumMockedProvider();

      const client = await innerGetPublicClient(provider, chains.hardhat);

      await expect(client.getBlockNumber()).to.eventually.be.rejectedWith(
        /unknown RPC error/
      );
      assert.equal(provider.calledCount, 1);
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
        assert.equal(client.type, "walletClient");
        assert.equal(client.chain.id, chains.mainnet.id);
      });
      assert.equal(clients[0].account.address, "0x1");
      assert.equal(clients[1].account.address, "0x2");
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
        assert.equal(client.pollingInterval, 1000);
        assert.equal(client.cacheTime, 2000);
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
        assert.equal(client.pollingInterval, 50);
        assert.equal(client.cacheTime, 0);
        assert.equal(client.transport.retryCount, 0);
      });
    });

    it("should retry failed calls on wallet client", async () => {
      const provider = new EthereumMockedProvider();

      const [client] = await innerGetWalletClients(provider, chains.mainnet, [
        "0x1",
      ]);

      await expect(client.getChainId()).to.eventually.be.rejectedWith(
        /unknown RPC error/
      );
      assert.equal(provider.calledCount, 4);
    });

    it("should not retry failed calls on wallet client when using a development network", async () => {
      const provider = new EthereumMockedProvider();

      const [client] = await innerGetWalletClients(provider, chains.hardhat, [
        "0x1",
      ]);

      await expect(client.getChainId()).to.eventually.be.rejectedWith(
        /unknown RPC error/
      );
      assert.equal(provider.calledCount, 1);
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
      assert.equal(client.type, "testClient");
      assert.equal(client.chain.id, chains.hardhat.id);
      assert.equal(client.mode, "hardhat");
    });

    it("should return a test client with anvil mode", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.foundry,
        "anvil"
      );

      assert.isDefined(client);
      assert.equal(client.type, "testClient");
      assert.equal(client.chain.id, chains.foundry.id);
      assert.equal(client.mode, "anvil");
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

      assert.equal(client.pollingInterval, 1000);
      assert.equal(client.cacheTime, 2000);
    });

    it("should return a test client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.hardhat,
        "hardhat"
      );

      assert.equal(client.pollingInterval, 50);
      assert.equal(client.cacheTime, 0);
      assert.equal(client.transport.retryCount, 0);
    });

    it("should not retry failed calls on test client", async () => {
      const provider = new EthereumMockedProvider();

      const client = await innerGetTestClient(
        provider,
        chains.hardhat,
        "hardhat"
      );

      await expect(client.getAutomine()).to.eventually.be.rejectedWith(
        /unknown RPC error/
      );
      assert.equal(provider.calledCount, 1);
    });
  });
});
