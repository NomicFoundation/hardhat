import type { EthereumProvider } from "hardhat/types";

import { expect, assert } from "chai";
import * as chains from "viem/chains";

import { _getPublicClient, _getWalletClients } from "../src/internal/clients";
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
      // TODO
    });
  });
});
