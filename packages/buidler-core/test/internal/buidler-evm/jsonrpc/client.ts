import { assert } from "chai";
import { BN, toBuffer } from "ethereumjs-util";
import sinon from "sinon";

import { RpcTransaction } from "../../../../internal/buidler-evm/jsonrpc/types";
import { JsonRpcClient } from "../../../../src/internal/buidler-evm/jsonrpc/client";
import { HttpProvider } from "../../../../src/internal/core/providers/http";

// reused from ethers.js
const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;

const DAI_ADDRESS = Buffer.from(
  "6b175474e89094c44da98b954eedeac495271d0f",
  "hex"
);

describe("JsonRpcClient", () => {
  let response: any;
  const fakeProvider: HttpProvider = {
    send: () => Promise.resolve(response),
  } as any;

  it("can be constructed", () => {
    const client = JsonRpcClient.forUrl("");
    assert.instanceOf(client, JsonRpcClient);
  });

  it("can actually fetch real json-rpc", async () => {
    const client = JsonRpcClient.forUrl(INFURA_URL);
    const result = await client.getLatestBlockNumber();
    const minBlockNumber = 10494745; // mainnet block number at 20.07.20
    assert.isAtLeast(result.toNumber(), minBlockNumber);
  });

  describe("caching", () => {
    const response1 =
      "0x00000000000000000000000000000000000000000067bafa8fb7228f04ffa792";
    const response2 =
      "0x00000000000000000000000000000000000000000067bafa8fb7228f04ffa793";

    it("caches fetched data", async () => {
      const fakeProvider = {
        send: sinon.fake.returns(response1),
      };
      const client = new JsonRpcClient(fakeProvider as any);

      function getStorageAt() {
        return client.getStorageAt(DAI_ADDRESS, Buffer.from([1]), "latest");
      }

      await getStorageAt();
      const value = await getStorageAt();

      assert.isTrue(fakeProvider.send.calledOnce);
      assert.isTrue(value.equals(toBuffer(response1)));
    });

    it("is parameter aware", async () => {
      const fakeProvider = {
        send: sinon
          .stub()
          .onFirstCall()
          .returns(response1)
          .onSecondCall()
          .returns(response2),
      };
      const client = new JsonRpcClient(fakeProvider as any);

      await client.getStorageAt(DAI_ADDRESS, Buffer.from([1]), "latest");
      const value = await client.getStorageAt(
        DAI_ADDRESS,
        Buffer.from([2]),
        "latest"
      );
      assert.isTrue(fakeProvider.send.calledTwice);
      assert.isTrue(value.equals(toBuffer(response2)));
    });
  });

  describe("eth_blockNumber", () => {
    it("returns correct values", async () => {
      const client = new JsonRpcClient(fakeProvider);
      response = "0x1";
      const result = await client.getLatestBlockNumber();
      assert.isTrue(result.eq(new BN(1)));
    });

    it("validates the response", async () => {
      const client = new JsonRpcClient(fakeProvider);
      response = "foo";
      const result = await client.getLatestBlockNumber().catch((e) => e);
      assert.instanceOf(result, Error);
    });
  });

  describe("eth_getBlockByNumber", () => {
    it("can fetch the data with transaction hashes", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);
      const block = await client.getBlockByNumber(new BN(10496585));
      assert.equal(
        block.hash?.toString("hex"),
        "71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812"
      );
      assert.equal(block.transactions.length, 192);
      assert.isTrue(
        block.transactions.every(
          (tx: Buffer | RpcTransaction) => tx instanceof Buffer
        )
      );
    });

    it("can fetch the data with transactions", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);
      const block = await client.getBlockByNumber(new BN(10496585), true);
      assert.isTrue(
        block.transactions.every(
          (tx: Buffer | RpcTransaction) => !(tx instanceof Buffer)
        )
      );
    });
  });

  describe("eth_getCode", () => {
    it("can fetch code of an existing contract", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);

      const code = await client.getCode(DAI_ADDRESS, "latest");
      assert.notEqual(code.toString("hex"), "");
    });

    it("can fetch empty code of a non existing contract", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);

      const address = Buffer.from(
        "1234567890abcdef1234567890abcdef12345678",
        "hex"
      );

      const code = await client.getCode(address, "latest");
      assert.equal(code.toString("hex"), "");
    });
  });

  describe("eth_getStorageAt", () => {
    it("can fetch value from storage of an existing contract", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);

      const totalSupply = await client.getStorageAt(
        DAI_ADDRESS,
        Buffer.from([1]),
        "latest"
      );
      const totalSupplyBN = new BN(totalSupply);
      assert.isTrue(totalSupplyBN.gt(new BN(0)));
    });

    it("can fetch empty value from storage of an existing contract", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);

      const value = await client.getStorageAt(
        DAI_ADDRESS,
        Buffer.from("baddcafe", "hex"),
        "latest"
      );
      const valueBN = new BN(value);
      assert.isTrue(valueBN.eq(new BN(0)));
    });

    it("can fetch empty value from storage of a non existing contract", async () => {
      const client = JsonRpcClient.forUrl(INFURA_URL);

      const address = Buffer.from(
        "1234567890abcdef1234567890abcdef12345678",
        "hex"
      );

      const value = await client.getStorageAt(
        address,
        Buffer.from([1]),
        "latest"
      );
      const valueBN = new BN(value);
      assert.isTrue(valueBN.eq(new BN(0)));
    });
  });
});
