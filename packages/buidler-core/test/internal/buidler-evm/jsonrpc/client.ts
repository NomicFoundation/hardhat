import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { RpcTransaction } from "../../../../internal/buidler-evm/jsonrpc/types";
import { JsonRpcClient } from "../../../../src/internal/buidler-evm/jsonrpc/client";
import { HttpProvider } from "../../../../src/internal/core/providers/http";

// reused from ethers.js
const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;

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

      const daiAddress = Buffer.from(
        "6b175474e89094c44da98b954eedeac495271d0f",
        "hex"
      );

      const code = await client.getCode(daiAddress, "latest");
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
});
