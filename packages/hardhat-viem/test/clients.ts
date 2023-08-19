import type { EthereumProvider } from "hardhat/types";

import { expect, assert } from "chai";
import * as chains from "viem/chains";

import {
  _getPublicClient,
  _getTestClient,
  _getWalletClients,
} from "../src/internal/clients";
import { EthereumMockedProvider } from "./mocks/provider";

describe("clients", () => {
  describe("_getPublicClient", () => {
    it("should return a public client", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.mainnet);

      assert.isDefined(client);
      expect(client.type).to.equal("publicClient");
      expect(client.chain!.id).to.equal(chains.mainnet.id);
    });

    it("should return a public client with custom parameters", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.mainnet, {
        pollingInterval: 1000,
        cacheTime: 2000,
      });

      expect(client.pollingInterval).to.equal(1000);
      expect(client.cacheTime).to.equal(2000);
    });

    it("should return a public client with default parameters for development networks", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getPublicClient(provider, chains.hardhat);

      expect(client.pollingInterval).to.equal(50);
      expect(client.cacheTime).to.equal(0);
    });
  });

  describe("_getWalletClients", () => {
    it("should return a wallet client", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getWalletClients(provider, chains.mainnet);

      assert.isDefined(client);
      expect(client.type).to.equal("walletClient");
      expect(client.chain!.id).to.equal(chains.mainnet.id);
    });
  });

  describe("_getTestClient", () => {
    it("should return a test client", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();

      const client = await _getTestClient(provider, chains.mainnet);

      assert.isDefined(client);
      expect(client.type).to.equal("testClient");
      expect(client.chain!.id).to.equal(chains.mainnet.id);
    });
  });
});
