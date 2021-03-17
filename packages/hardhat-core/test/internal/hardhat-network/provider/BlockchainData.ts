import { Block } from "@ethereumjs/block";
import { assert } from "chai";
import { BN } from "ethereumjs-util";

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
    bd = new BlockchainData();
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

      bd.addBlock(block1, new BN(9000));

      assert.equal(bd.getBlockByHash(block1.hash()), block1);
      assert.equal(bd.getBlockByNumber(new BN(1234)), block1);
      assert.equal(bd.getBlockByTransactionHash(tx1.hash()), block1);
      assert.equal(bd.getBlockByTransactionHash(tx2.hash()), block1);
      assert.equal(bd.getTransaction(tx1.hash()), tx1);
      assert.equal(bd.getTransaction(tx2.hash()), tx2);
      assert.isTrue(bd.getTotalDifficulty(block1.hash())?.eqn(9000));

      assert.equal(bd.getBlockByHash(block2.hash()), undefined);
      assert.equal(bd.getBlockByNumber(new BN(5678)), undefined);
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

      bd.addBlock(block1, new BN(9000));
      bd.addBlock(block2, new BN(10000));
      bd.removeBlock(block1);

      assert.equal(bd.getBlockByHash(block1.hash()), undefined);
      assert.equal(bd.getBlockByNumber(new BN(1234)), undefined);
      assert.equal(bd.getBlockByTransactionHash(tx1.hash()), undefined);
      assert.equal(bd.getBlockByTransactionHash(tx2.hash()), undefined);
      assert.equal(bd.getTransaction(tx1.hash()), undefined);
      assert.equal(bd.getTransaction(tx2.hash()), undefined);
      assert.equal(bd.getTotalDifficulty(block1.hash()), undefined);

      assert.equal(bd.getBlockByHash(block2.hash()), block2);
      assert.equal(bd.getBlockByNumber(new BN(5678)), block2);
      assert.equal(bd.getBlockByTransactionHash(tx3.hash()), block2);
      assert.equal(bd.getTransaction(tx3.hash()), tx3);
      assert.isTrue(bd.getTotalDifficulty(block2.hash())?.eqn(10000));
    });

    it("removes associated transaction receipts", () => {
      const block = createBlock(1234);
      const tx = createTestTransaction();
      const receipt = createTestReceipt(tx);
      block.transactions.push(tx);

      bd.addBlock(block, new BN(1));
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
      const log1 = createTestLog(100);
      const log2 = createTestLog(100);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(100);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(101);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(101);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      bd.addBlock(block1, new BN(5000));
      bd.addBlock(block2, new BN(1000));
      bd.addTransactionReceipt(receipt1);
      bd.addTransactionReceipt(receipt2);
      bd.addTransactionReceipt(receipt3);

      const logs = bd.getLogs({
        fromBlock: new BN(90),
        toBlock: new BN(100),
        addresses: [],
        normalizedTopics: [],
      });
      assert.deepEqual(logs, [log1, log2, log3]);
    });

    it("returns [] for unknown blocks", () => {
      assert.deepEqual(
        bd.getLogs({
          fromBlock: new BN(0),
          toBlock: new BN(100),
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

      bd.addBlock(block, new BN(5000));

      assert.deepEqual(
        bd.getLogs({
          fromBlock: new BN(0),
          toBlock: new BN(10000),
          addresses: [],
          normalizedTopics: [],
        }),
        []
      );
    });
  });
});
