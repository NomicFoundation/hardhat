import { bytesToBigInt as bufferToBigInt, toBytes } from "@ethereumjs/util";
import { assert } from "chai";
import fsExtra from "fs-extra";
import sinon from "sinon";

import { RpcTransaction } from "../../../../src/internal/core/jsonrpc/types/output/transaction";
import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { JsonRpcClient } from "../../../../src/internal/hardhat-network/jsonrpc/client";
import { randomHashBuffer } from "../../../../src/internal/hardhat-network/provider/utils/random";
import { makeForkClient } from "../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { useTmpDir } from "../../../helpers/fs";
import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import {
  BLOCK_HASH_OF_10496585,
  BLOCK_NUMBER_OF_10496585,
  DAI_ADDRESS,
  DAI_CONTRACT_LENGTH,
  DAI_TOTAL_SUPPLY_STORAGE_POSITION,
  EMPTY_ACCOUNT_ADDRESS,
  FIRST_TX_HASH_OF_10496585,
} from "../helpers/constants";
import { FORKED_PROVIDERS } from "../helpers/providers";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

type FakeProvider = Pick<HttpProvider, "url" | "sendBatch"> & {
  request: sinon.SinonStub | HttpProvider["request"];
};

function assertBufferContents(buff: Buffer, hexEncodedContents: string) {
  assert.isTrue(
    hexEncodedContents.startsWith("0x"),
    "The contents should be 0x-prefixed hex encoded"
  );

  assert.equal(
    buff.toString("hex").toLowerCase(),
    hexEncodedContents.substring(2).toLowerCase()
  );
}

describe("JsonRpcClient", () => {
  describe("Using fake providers", function () {
    describe("Caching", () => {
      const response1 =
        "0x00000000000000000000000000000000000000000067bafa8fb7228f04ffa792";
      const response2 =
        "0x00000000000000000000000000000000000000000067bafa8fb7228f04ffa793";

      let fakeProvider: FakeProvider;
      let clientWithFakeProvider: JsonRpcClient;

      function getStorageAt(blockNumber: bigint) {
        return clientWithFakeProvider.getStorageAt(
          DAI_ADDRESS,
          bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
          blockNumber
        );
      }

      beforeEach(async function () {
        fakeProvider = {
          request: sinon
            .stub()
            .onFirstCall()
            .resolves(response1)
            .onSecondCall()
            .resolves(response2),
          url: "fake",
          sendBatch: () => Promise.resolve([]),
        };
      });

      it("Doesn't cache things for blocks that can be reorg'd out", async () => {
        clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );

        assertBufferContents(await getStorageAt(121n), response1);
        assertBufferContents(await getStorageAt(121n), response2);

        assert.isTrue((fakeProvider.request as sinon.SinonStub).calledTwice);
      });

      it("caches fetched data when its safe", async () => {
        clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );

        assertBufferContents(await getStorageAt(120n), response1);
        assertBufferContents(await getStorageAt(120n), response1);

        assert.isTrue((fakeProvider.request as sinon.SinonStub).calledOnce);
      });

      it("is parameter aware", async () => {
        clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );

        assertBufferContents(await getStorageAt(110n), response1);
        assertBufferContents(await getStorageAt(120n), response2);

        assertBufferContents(await getStorageAt(110n), response1);
        assertBufferContents(await getStorageAt(120n), response2);

        assert.isTrue((fakeProvider.request as sinon.SinonStub).calledTwice);
      });

      describe("Disk caching", () => {
        useTmpDir("hardhat-network-forking-disk-cache");

        beforeEach(function () {
          clientWithFakeProvider = new JsonRpcClient(
            fakeProvider as any,
            1,
            123n,
            3n,
            this.tmpDir
          );
        });

        async function makeCall() {
          assertBufferContents(await getStorageAt(120n), response1);
          assert.isTrue((fakeProvider.request as sinon.SinonStub).calledOnce);
        }

        it("Stores to disk after a request", async function () {
          await makeCall();
          assert.lengthOf(await fsExtra.readdir(this.tmpDir), 1);
        });

        it("Reads from disk if available, not making any request a request", async function () {
          // We make a first call with the disk caching enabled, this will populate the disk
          // cache, and also the in-memory one
          await makeCall();
          assert.isTrue((fakeProvider.request as sinon.SinonStub).calledOnce);

          // We create a new client, using the same cache dir, but with an empty in-memory cache.
          // It should read from the disk, instead of making a new request.
          clientWithFakeProvider = new JsonRpcClient(
            fakeProvider as any,
            1,
            123n,
            3n,
            this.tmpDir
          );

          await makeCall();

          // We created a new client, but used the same provider, so it was already called once.
          assert.isTrue((fakeProvider.request as sinon.SinonStub).calledOnce);
        });
      });
    });

    describe("Retry on Infura's error", () => {
      const fakeInfuraUrl = "http://infura.com";

      const response =
        "0x00000000000000000000000000000000000000000067bafa8fb7228f04ffa792";

      it("makes a retry on the 'header not found' error", async () => {
        const fakeProvider: FakeProvider = {
          url: fakeInfuraUrl,
          request: sinon
            .stub()
            .onFirstCall()
            .rejects(new Error("header not found"))
            .onSecondCall()
            .resolves(response),
          sendBatch: () => Promise.resolve([]),
        };

        const clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );

        const value = await clientWithFakeProvider.getStorageAt(
          DAI_ADDRESS,
          bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
          120n
        );
        assert.equal((fakeProvider.request as sinon.SinonStub).callCount, 2);
        assert.isTrue(value.equals(toBuffer(response)));
      });

      it("does not retry more than once", async () => {
        const fakeProvider: FakeProvider = {
          url: fakeInfuraUrl,
          request: sinon
            .stub()
            .onFirstCall()
            .rejects(new Error("header not found"))
            .onSecondCall()
            .rejects(new Error("header not found"))
            .onThirdCall()
            .resolves(response),
          sendBatch: () => Promise.resolve([]),
        };

        const clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );

        await assert.isRejected(
          clientWithFakeProvider.getStorageAt(
            DAI_ADDRESS,
            bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
            120n
          ),
          "header not found"
        );
      });

      it("does not retry on a different error", async () => {
        const fakeProvider: FakeProvider = {
          url: fakeInfuraUrl,
          request: sinon
            .stub()
            .onFirstCall()
            .rejects(new Error("different error"))
            .onSecondCall()
            .resolves(response),
          sendBatch: () => Promise.resolve([]),
        };

        const clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );
        await assert.isRejected(
          clientWithFakeProvider.getStorageAt(
            DAI_ADDRESS,
            bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
            120n
          ),
          "different error"
        );
      });

      it("does not retry when other RPC provider is used", async () => {
        const fakeProvider: FakeProvider = {
          url: "other",
          request: sinon
            .stub()
            .onFirstCall()
            .rejects(new Error("header not found"))
            .onSecondCall()
            .resolves(response),
          sendBatch: () => Promise.resolve([]),
        };

        const clientWithFakeProvider = new JsonRpcClient(
          fakeProvider as any,
          1,
          123n,
          3n
        );
        await assert.isRejected(
          clientWithFakeProvider.getStorageAt(
            DAI_ADDRESS,
            bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
            120n
          ),
          "header not found"
        );
      });
    });
  });

  describe("Using actual providers", function () {
    FORKED_PROVIDERS.forEach(({ rpcProvider, jsonRpcUrl }) => {
      workaroundWindowsCiFailures.call(this, { isFork: true });

      describe(`Using ${rpcProvider}`, () => {
        const skipItWhenUsingAlchemy = rpcProvider === "Alchemy" ? it.skip : it;

        let client: JsonRpcClient;
        let forkNumber: bigint;

        beforeEach(async () => {
          const clientResult = await makeForkClient({ jsonRpcUrl });
          client = clientResult.forkClient;
          forkNumber = clientResult.forkBlockNumber;
        });

        describe("Basic tests", () => {
          it("can be constructed", () => {
            assert.instanceOf(client, JsonRpcClient);
          });

          it("can actually fetch real json-rpc", async () => {
            // This is just a random tx from mainnet
            const tx = await client.getTransactionByHash(
              toBuffer(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a"
              )
            );

            const blockNumber = tx?.blockNumber;
            if (blockNumber === null || blockNumber === undefined) {
              assert.fail();
            }
            assert.isTrue(blockNumber >= 10964958n);
          });
        });

        describe("eth_getBlockByNumber", () => {
          it("can fetch the data with transaction hashes", async () => {
            const block = await client.getBlockByNumber(
              BLOCK_NUMBER_OF_10496585
            );
            assert.isTrue(block?.hash?.equals(BLOCK_HASH_OF_10496585));
            assert.equal(block?.transactions.length, 192);
            assert.isTrue(
              block?.transactions.every(
                (tx: Buffer | RpcTransaction) => tx instanceof Buffer
              )
            );
          });

          it("can fetch the data with transactions", async () => {
            const block = await client.getBlockByNumber(
              BLOCK_NUMBER_OF_10496585,
              true
            );
            assert.isTrue(
              block?.transactions.every(
                (tx: Buffer | RpcTransaction) => !(tx instanceof Buffer)
              )
            );
          });

          it("returns null for non-existent block", async function () {
            const block = await client.getBlockByNumber(
              forkNumber + 1000n,
              true
            );
            assert.isNull(block);
          });
        });

        describe("eth_getBlockByHash", () => {
          it("can fetch the data with transaction hashes", async () => {
            const block = await client.getBlockByHash(BLOCK_HASH_OF_10496585);
            assert.isTrue(block?.hash?.equals(BLOCK_HASH_OF_10496585));
            assert.equal(block?.transactions.length, 192);
            assert.isTrue(
              block?.transactions.every(
                (tx: Buffer | RpcTransaction) => tx instanceof Buffer
              )
            );
          });

          it("can fetch the data with transactions", async () => {
            const block = await client.getBlockByHash(
              BLOCK_HASH_OF_10496585,
              true
            );
            assert.isTrue(
              block?.transactions.every(
                (tx: Buffer | RpcTransaction) => !(tx instanceof Buffer)
              )
            );
          });

          it("returns null for non-existent block", async () => {
            const block = await client.getBlockByHash(
              Buffer.from(randomHashBuffer()),
              true
            );
            assert.isNull(block);
          });
        });

        describe("eth_getStorageAt", () => {
          it("can fetch value from storage of an existing contract", async () => {
            const totalSupply = await client.getStorageAt(
              DAI_ADDRESS,
              bufferToBigInt(DAI_TOTAL_SUPPLY_STORAGE_POSITION),
              forkNumber
            );
            const totalSupplyBN = bufferToBigInt(totalSupply);
            assert.isTrue(totalSupplyBN > 0n);
          });

          it("can fetch empty value from storage of an existing contract", async () => {
            const value = await client.getStorageAt(
              DAI_ADDRESS,
              BigInt("0xbaddcafe"),
              forkNumber
            );
            const valueBN = bufferToBigInt(value);
            assert.isTrue(valueBN === 0n);
          });

          it("can fetch empty value from storage of a non-existent contract", async () => {
            const value = await client.getStorageAt(
              EMPTY_ACCOUNT_ADDRESS,
              1n,
              forkNumber
            );
            const valueBN = bufferToBigInt(value);
            assert.isTrue(valueBN === 0n);
          });
        });

        describe("getTransactionByHash", () => {
          it("can fetch existing transactions", async () => {
            const transaction = await client.getTransactionByHash(
              FIRST_TX_HASH_OF_10496585
            );
            assert.isTrue(transaction?.hash.equals(FIRST_TX_HASH_OF_10496585));
            assert.isTrue(
              transaction?.blockHash?.equals(BLOCK_HASH_OF_10496585)
            );
          });

          skipItWhenUsingAlchemy(
            "returns null for non-existent transactions",
            async () => {
              const transaction = await client.getTransactionByHash(
                Buffer.from(randomHashBuffer())
              );
              assert.equal(transaction, null);
            }
          );
        });

        describe("getTransactionReceipt", () => {
          it("can fetch existing receipts", async () => {
            const receipt = await client.getTransactionReceipt(
              FIRST_TX_HASH_OF_10496585
            );
            assert.isTrue(
              receipt?.transactionHash.equals(FIRST_TX_HASH_OF_10496585)
            );
            assert.isTrue(receipt?.transactionIndex === 0n);
            assert.isTrue(receipt?.blockHash?.equals(BLOCK_HASH_OF_10496585));
            assert.isTrue(receipt?.blockNumber === BLOCK_NUMBER_OF_10496585);
          });

          it("returns null for non-existent transactions", async () => {
            const transaction = await client.getTransactionReceipt(
              Buffer.from(randomHashBuffer())
            );
            assert.equal(transaction, null);
          });
        });

        describe("getLogs", () => {
          it("can fetch existing logs", async () => {
            const logs = await client.getLogs({
              fromBlock: BLOCK_NUMBER_OF_10496585,
              toBlock: BLOCK_NUMBER_OF_10496585,
              address: toBuffer("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
            });
            assert.equal(logs.length, 12);
          });
        });

        describe("getAccountData", () => {
          it("Should return the right data", async function () {
            const data = await client.getAccountData(DAI_ADDRESS, forkNumber);
            assert.equal(data.balance, 0n);
            assert.equal(data.transactionCount, 1n);
            assert.lengthOf(data.code, DAI_CONTRACT_LENGTH);
          });
        });
      });
    });
  });
});
