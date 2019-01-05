import { assert } from "chai";
import { Tx } from "web3x/eth";

import { ERRORS } from "../../../src/core/errors";
import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import { createNetworkProvider } from "../../../src/core/providers/network";
import { expectBuidlerErrorAsync } from "../../helpers/errors";

import { CountProvider } from "./mocks";

describe("Network provider", () => {
  let mock: CountProvider;
  let wrapper: IEthereumProvider;
  let tx: Tx;
  let validChainId: number;

  beforeEach(() => {
    validChainId = 123;
    tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: 21000,
      gasPrice: 678912,
      nonce: 0,
      value: 1
    };
    mock = new CountProvider();
    wrapper = createNetworkProvider(mock, validChainId);
  });

  it("should set the chainId in to the transaction", async () => {
    tx.chainId = undefined;
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(response[0].chainId, 123);
  });

  it("should fail when chain ids don't match", async () => {
    tx.chainId = 42;
    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_sendTransaction", [tx]),
      ERRORS.NETWORK.INVALID_TX_CHAIN_ID
    );
  });

  it("should fail when configured chain id dont match the real chain id", async () => {
    wrapper = createNetworkProvider(mock, validChainId + 1);
    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_sendTransaction", [tx]),
      ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID
    );
  });

  it("should validate the chain Id correctly", async () => {
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(response[0].chainId, validChainId);
  });

  it("should use the provider network id if none is given", async () => {
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(response[0].chainId, validChainId);
  });

  it("should not fail if transaction is undefined", async () => {
    const response = await wrapper.send("eth_sendTransaction", [undefined]);
    assert.equal(response[0], undefined);
  });

  it("Should get the chainId if not provided, caching it", async () => {
    assert.equal(mock.numberOfCallsToNetVersion, 0);
    await wrapper.send("eth_sendTransaction", [tx]);

    assert.equal(mock.numberOfCallsToNetVersion, 1);
    await wrapper.send("eth_sendTransaction", [tx]);

    assert.equal(mock.numberOfCallsToNetVersion, 1);
  });

  describe("When created without chainId", () => {
    let provider: IEthereumProvider;

    beforeEach(() => {
      provider = createNetworkProvider(mock);
    });

    it("Should get and cache the real one", async () => {
      assert.equal(mock.numberOfCallsToNetVersion, 0);

      await provider.send("asd");
      assert.equal(mock.numberOfCallsToNetVersion, 1);

      await provider.send("asd");
      assert.equal(mock.numberOfCallsToNetVersion, 1);
    });

    it("Should validate txs' chain id", async () => {
      await expectBuidlerErrorAsync(
        () =>
          provider.send("eth_sendTransaction", [{ ...tx, chainId: 567876 }]),
        ERRORS.NETWORK.INVALID_TX_CHAIN_ID
      );

      await provider.send("eth_sendTransaction", [
        { ...tx, chainId: validChainId }
      ]);
    });
  });
});
