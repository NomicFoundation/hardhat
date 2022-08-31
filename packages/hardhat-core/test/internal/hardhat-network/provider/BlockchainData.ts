import { Block } from "@ethereumjs/block";
import { Common } from "@ethereumjs/common";
import { assert } from "chai";

import { BlockchainData } from "../../../../src/internal/hardhat-network/provider/BlockchainData";
import {
  createTestLog,
  createTestReceipt,
  createTestTransaction,
} from "../helpers/blockchain";

describe("BlockchainData", () => {
  let bd: BlockchainData;

  function createBlock(number: number) {
    return Block.fromBlockData({ header: { number } });
  }

  beforeEach(() => {
    bd = new BlockchainData(new Common({ chain: "mainnet" }));
  });

  describe("addBlock", () => {
    it("saves the block and allows for queries", () => {
      const block1 = createBlock(1234);
      const tx1 = createTestTransaction();
      const tx2 = createTestTransaction();
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(5678);
      const tx3 = createTestTransaction();
      block2.transactions.push(tx3);

      bd.addBlock(block1, 9000n);

      assert.equal(bd.getBlockByHash(block1.hash()), block1);
      assert.equal(bd.getBlockByNumber(1234n), block1);
      assert.equal(bd.getBlockByTransactionHash(tx1.hash()), block1);
      assert.equal(bd.getBlockByTransactionHash(tx2.hash()), block1);
      assert.equal(bd.getTransaction(tx1.hash()), tx1);
      assert.equal(bd.getTransaction(tx2.hash()), tx2);
      assert.isTrue(bd.getTotalDifficulty(block1.hash()) === 9000n);

      assert.equal(bd.getBlockByHash(block2.hash()), undefined);
      assert.equal(bd.getBlockByNumber(5678n), undefined);
      assert.equal(bd.getBlockByTransactionHash(tx3.hash()), undefined);
      assert.equal(bd.getTransaction(tx3.hash()), undefined);
      assert.equal(bd.getTotalDifficulty(block2.hash()), undefined);
    });
  });

  describe("removeBlock", () => {
    it("removes the block and clears the associated queries", () => {
      const block1 = createBlock(1234);
      const tx1 = createTestTransaction();
      const tx2 = createTestTransaction();
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(5678);
      const tx3 = createTestTransaction();
      block2.transactions.push(tx3);

      bd.addBlock(block1, 9000n);
      bd.addBlock(block2, 10000n);
      bd.removeBlock(block1);

      assert.equal(bd.getBlockByHash(block1.hash()), undefined);
      assert.equal(bd.getBlockByNumber(1234n), undefined);
      assert.equal(bd.getBlockByTransactionHash(tx1.hash()), undefined);
      assert.equal(bd.getBlockByTransactionHash(tx2.hash()), undefined);
      assert.equal(bd.getTransaction(tx1.hash()), undefined);
      assert.equal(bd.getTransaction(tx2.hash()), undefined);
      assert.equal(bd.getTotalDifficulty(block1.hash()), undefined);

      assert.equal(bd.getBlockByHash(block2.hash()), block2);
      assert.equal(bd.getBlockByNumber(5678n), block2);
      assert.equal(bd.getBlockByTransactionHash(tx3.hash()), block2);
      assert.equal(bd.getTransaction(tx3.hash()), tx3);
      assert.isTrue(bd.getTotalDifficulty(block2.hash()) === 10000n);
    });

    it("removes associated transaction receipts", () => {
      const block = createBlock(1234);
      const tx = createTestTransaction();
      const receipt = createTestReceipt(tx);
      block.transactions.push(tx);

      bd.addBlock(block, 1n);
      bd.addTransactionReceipt(receipt);

      bd.removeBlock(block);

      assert.equal(bd.getTransactionReceipt(tx.hash()), undefined);
    });
  });

  describe("addTransaction", () => {
    it("can save a transaction", () => {
      const tx = createTestTransaction();
      bd.addTransaction(tx);
      assert.equal(bd.getTransaction(tx.hash()), tx);
    });
  });

  describe("addTransactionReceipt", () => {
    it("can save a transaction receipt", () => {
      const tx = createTestTransaction();
      const receipt = createTestReceipt(tx);
      bd.addTransactionReceipt(receipt);
      assert.equal(bd.getTransactionReceipt(tx.hash()), receipt);
    });
  });

  describe("getLogs", () => {
    it("can retrieve logs for a block from receipts", () => {
      const block1 = createBlock(100);
      const log1 = createTestLog(100n);
      const log2 = createTestLog(100n);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(100n);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(101);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(101n);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      bd.addBlock(block1, 5000n);
      bd.addBlock(block2, 1000n);
      bd.addTransactionReceipt(receipt1);
      bd.addTransactionReceipt(receipt2);
      bd.addTransactionReceipt(receipt3);

      const logs = bd.getLogs({
        fromBlock: 90n,
        toBlock: 100n,
        addresses: [],
        normalizedTopics: [],
      });
      assert.deepEqual(logs, [log1, log2, log3]);
    });

    it("returns [] for unknown blocks", () => {
      assert.deepEqual(
        bd.getLogs({
          fromBlock: 0n,
          toBlock: 100n,
          addresses: [],
          normalizedTopics: [],
        }),
        []
      );
    });

    it("returns [] for blocks without receipts", () => {
      const tx1 = createTestTransaction();
      const tx2 = createTestTransaction();
      const block = createBlock(1234);
      block.transactions.push(tx1, tx2);

      bd.addBlock(block, 5000n);

      assert.deepEqual(
        bd.getLogs({
          fromBlock: 0n,
          toBlock: 10000n,
          addresses: [],
          normalizedTopics: [],
        }),
        []
      );
    });
  });
});
