import type { EthereumProvider } from "hardhat/types";

import { expect, assert } from "chai";
import sinon from "sinon";
import * as chains from "viem/chains";

import {
  getChain,
  getMode,
  isDevelopmentNetwork,
} from "../src/internal/chains";
import { EthereumMockedProvider } from "./mocks/provider";

describe("chains", () => {
  describe("getChain", () => {
    afterEach(sinon.restore);

    it("should return the chain corresponding to the chain id", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x1")); // mainnet chain id
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").throws();

      const chain = await getChain(provider);

      expect(chain).to.deep.equal(chains.mainnet);
      assert.equal(sendStub.callCount, 1);
    });

    it("should return the hardhat chain if the chain id is 31337 and the network is hardhat", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x7a69")); // 31337 in hex
      sendStub.withArgs("hardhat_metadata").returns(Promise.resolve({}));
      sendStub.withArgs("anvil_nodeInfo").throws();

      const chain = await getChain(provider);

      expect(chain).to.deep.equal(chains.hardhat);
    });

    it("should return the foundry chain if the chain id is 31337 and the network is foundry", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x7a69")); // 31337 in hex
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").returns(Promise.resolve({}));

      const chain = await getChain(provider);

      expect(chain).to.deep.equal(chains.foundry);
    });

    it("should return the first matching chain if the chain id is not 31337 and there are multiple chains with that id", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      // chain id 999 corresponds to wanchainTestnet but also zoraTestnet
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x3e7"));
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").throws();

      const chain = await getChain(provider);

      expect(chain).to.deep.equal(chains.hyperEvm);
    });

    it("should throw if the chain id is 31337 and the network is neither hardhat nor foundry", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x7a69")); // 31337 in hex
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").throws();

      await expect(getChain(provider)).to.be.rejectedWith(
        `The chain id corresponds to a development network but we couldn't detect which one.
Please report this issue if you're using Hardhat or Foundry.`
      );
    });

    it("should throw if the chain id is not 31337 and there is no chain with that id", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x0")); // fake chain id 0
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").throws();

      await expect(getChain(provider)).to.be.rejectedWith(
        /No network with chain id 0 found/
      );
    });
  });

  describe("isDevelopmentNetwork", () => {
    it("should return true if the chain id is 31337", () => {
      assert.ok(isDevelopmentNetwork(31337));
    });

    it("should return false if the chain id is not 31337", () => {
      assert.notOk(isDevelopmentNetwork(1));
    });
  });

  describe("getMode", () => {
    it("should return hardhat if the network is hardhat", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("hardhat_metadata").returns(Promise.resolve({}));
      sendStub.withArgs("anvil_nodeInfo").throws();

      const mode = await getMode(provider);

      expect(mode).to.equal("hardhat");
    });

    it("should return anvil if the network is foundry", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").returns(Promise.resolve({}));

      const mode = await getMode(provider);

      expect(mode).to.equal("anvil");
    });

    it("should throw if the network is neither hardhat nor foundry", async () => {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("hardhat_metadata").throws();
      sendStub.withArgs("anvil_nodeInfo").throws();

      await expect(getMode(provider)).to.be.rejectedWith(
        `The chain id corresponds to a development network but we couldn't detect which one.
Please report this issue if you're using Hardhat or Foundry.`
      );
    });

    it("should return a hardhat chain with the custom chainId", async function () {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x3039")); // 12345 in hex
      sendStub.withArgs("hardhat_metadata").returns(Promise.resolve({}));
      sendStub.withArgs("anvil_nodeInfo").throws();

      const chain = await getChain(provider);

      expect(chain.id).to.equal(12345);
      expect(chain.name).to.equal("Hardhat");
    });

    it("should return a foundry chain with the custom chainId", async function () {
      const provider: EthereumProvider = new EthereumMockedProvider();
      const sendStub = sinon.stub(provider, "send");
      sendStub.withArgs("eth_chainId").returns(Promise.resolve("0x3039")); // 12345 in hex
      sendStub.withArgs("anvil_nodeInfo").returns(Promise.resolve({}));
      sendStub.withArgs("hardhat_metadata").throws();

      const chain = await getChain(provider);

      expect(chain.id).to.equal(12345);
      expect(chain.name).to.equal("Foundry");
    });
  });
});
