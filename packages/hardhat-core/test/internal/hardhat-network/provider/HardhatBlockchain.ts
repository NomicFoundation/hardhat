import { Block } from "@ethereumjs/block";
import { assert } from "chai";
import { BN, BufferLike, zeros } from "ethereumjs-util";

import { randomHashBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import { HardhatBlockchain } from "../../../../src/internal/hardhat-network/provider/HardhatBlockchain";
import {
  createTestLog,
  createTestReceipt,
  createTestTransaction,
} from "../helpers/blockchain";

describe("HardhatBlockchain", () => {
  let blockchain: HardhatBlockchain;
  let blocks: Block[];

  function createBlock(number: number, _difficulty?: BufferLike) {
    const difficulty = new BN(_difficulty as Buffer);
    const parentHash = number === 0 ? zeros(32) : blocks[number - 1].hash();
    const newBlock = Block.fromBlockData({
      header: { number, difficulty, parentHash },
    });
    blocks.push(newBlock);
    return newBlock;
  }

  beforeEach(() => {
    blockchain = new HardhatBlockchain();
    blocks = [];
  });

  describe("getLatestBlock", () => {
    it("returns the latest block", async () => {
      await blockchain.addBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getLatestBlock(), one);
    });

    it("throws when the blockchain is empty", async () => {
      await assert.isRejected(
        blockchain.getLatestBlock(),
        Error,
        "No block available"
      );
    });
  });

  describe("getBlock", () => {
    it("can get existing block by hash", async () => {
      const genesis = createBlock(0);
      const one = createBlock(1);
      await blockchain.addBlock(genesis);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(one.hash()), one);
    });

    it("can get existing block by number", async () => {
      await blockchain.addBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(1), one);
    });

    it("can get existing block by BN", async () => {
      await blockchain.addBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(new BN(1)), one);
    });

    it("returns undefined non-existent block", async () => {
      assert.equal(await blockchain.getBlock(0), undefined);
      assert.equal(await blockchain.getBlock(randomHashBuffer()), undefined);
    });
  });

  describe("putBlock", () => {
    it("can save genesis block", async () => {
      const genesis = createBlock(0);
      const returnedBlock = await blockchain.addBlock(genesis);
      const savedBlock = await blockchain.getBlock(0);
      assert.equal(returnedBlock, genesis);
      assert.equal(savedBlock, genesis);
    });

    it("rejects blocks with invalid block number", async () => {
      const block = Block.fromBlockData({ header: { number: 1 } });
      await assert.isRejected(
        blockchain.addBlock(block),
        Error,
        "Invalid block number"
      );
    });

    it("rejects genesis block with invalid parent hash", async () => {
      const block = Block.fromBlockData({
        header: { number: 0, parentHash: randomHashBuffer() },
      });
      await assert.isRejected(
        blockchain.addBlock(block),
        Error,
        "Invalid parent hash"
      );
    });

    it("rejects later block with invalid parent hash", async () => {
      const genesis = createBlock(0);
      await blockchain.addBlock(genesis);
      const block = Block.fromBlockData({ header: { number: 1 } });
      await assert.isRejected(
        blockchain.addBlock(block),
        Error,
        "Invalid parent hash"
      );
    });

    it("can save multiple blocks", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);
      await blockchain.addBlock(blockThree);

      assert.equal(await blockchain.getBlock(0), blockOne);
      assert.equal(await blockchain.getBlock(1), blockTwo);
      assert.equal(await blockchain.getBlock(2), blockThree);
    });
  });

  describe("delBlock", () => {
    it("removes the block and all subsequent ones", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);
      await blockchain.addBlock(blockThree);

      blockchain.deleteBlock(blockOne.hash());

      assert.equal(await blockchain.getBlock(blockOne.hash()), undefined);
      assert.equal(await blockchain.getBlock(blockTwo.hash()), undefined);
      assert.equal(await blockchain.getBlock(blockThree.hash()), undefined);
    });

    it("updates the latest block number", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);
      blockchain.deleteBlock(blockTwo.hash());

      assert.equal(await blockchain.getLatestBlock(), blockOne);
      await assert.isRejected(
        blockchain.addBlock(blockThree),
        Error,
        "Invalid block number"
      );
    });

    it("is possible to add a block after delete", async () => {
      const block = createBlock(0);
      const otherBlock = createBlock(0, randomHashBuffer());
      await blockchain.addBlock(block);
      blockchain.deleteBlock(block.hash());
      await blockchain.addBlock(otherBlock);
      assert.equal(await blockchain.getBlock(otherBlock.hash()), otherBlock);
    });

    it("throws when hash if non-existent block is given", async () => {
      const block = createBlock(0);
      assert.throws(
        () => blockchain.deleteBlock(block.hash()),
        Error,
        "Block not found"
      );
    });
  });

  describe("deleteAllFollowingBlocks", () => {
    it("removes all blocks subsequent to the given block", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);
      await blockchain.addBlock(blockThree);

      blockchain.deleteLaterBlocks(blockOne);

      assert.equal(await blockchain.getBlock(blockOne.hash()), blockOne);
      assert.equal(await blockchain.getBlock(blockTwo.hash()), undefined);
      assert.equal(await blockchain.getBlock(blockThree.hash()), undefined);
    });

    it("throws if given block is not present in blockchain", async () => {
      const blockOne = createBlock(0);
      const notAddedBlock = createBlock(1);
      const fakeBlockOne = createBlock(0, randomHashBuffer());

      await blockchain.addBlock(blockOne);

      assert.throws(
        () => blockchain.deleteLaterBlocks(notAddedBlock),
        Error,
        "Invalid block"
      );
      assert.throws(
        () => blockchain.deleteLaterBlocks(fakeBlockOne),
        Error,
        "Invalid block"
      );
    });

    it("does not throw if there are no following blocks", async () => {
      const blockOne = createBlock(0);
      await blockchain.addBlock(blockOne);
      assert.doesNotThrow(() => blockchain.deleteLaterBlocks(blockOne));
    });
  });

  describe("getBlockTotalDifficulty", () => {
    it("rejects when hash of non-existent block is given", async () => {
      await assert.isRejected(
        blockchain.getTotalDifficulty(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });

    it("can get difficulty of the genesis block", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const difficulty = await blockchain.getTotalDifficulty(genesis.hash());
      assert.equal(difficulty.toNumber(), 1000);
    });

    it("can get total difficulty of the second block", async () => {
      const genesis = createBlock(0, 1000);
      const second = createBlock(1, 2000);
      await blockchain.addBlock(genesis);
      await blockchain.addBlock(second);

      const difficulty = await blockchain.getTotalDifficulty(second.hash());
      assert.equal(difficulty.toNumber(), 3000);
    });

    it("does not return total difficulty of a deleted block", async () => {
      const blockOne = createBlock(0, 1000);
      const blockTwo = createBlock(1, 2000);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);

      blockchain.deleteLaterBlocks(blockOne);

      assert.equal(
        (await blockchain.getTotalDifficulty(blockOne.hash())).toNumber(),
        1000
      );
      await assert.isRejected(
        blockchain.getTotalDifficulty(blockTwo.hash()),
        Error,
        "Block not found"
      );
    });
  });

  function hasGetTransactionBehaviour(
    getTransaction:
      | typeof blockchain.getTransaction
      | typeof blockchain.getLocalTransaction
  ) {
    it("returns undefined unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.isUndefined(await getTransaction(transaction.hash()));
    });

    it("returns a known transaction", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);

      const result = await getTransaction(transaction.hash());
      assert.equal(result, transaction);
    });

    it("forgets transactions after block is removed", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);
      blockchain.deleteBlock(block.hash());

      assert.isUndefined(await getTransaction(transaction.hash()));
    });
  }

  describe("getTransaction", function () {
    hasGetTransactionBehaviour((hash) => blockchain.getTransaction(hash));
  });

  describe("getLocalTransaction", function () {
    hasGetTransactionBehaviour((hash) => blockchain.getLocalTransaction(hash));
  });

  describe("getBlockByTransactionHash", () => {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.equal(
        await blockchain.getBlockByTransactionHash(transaction.hash()),
        undefined
      );
    });

    it("returns block for a known transaction", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);

      const result = await blockchain.getBlockByTransactionHash(
        transaction.hash()
      );
      assert.equal(result, block);
    });

    it("forgets transactions after block is removed", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);
      blockchain.deleteBlock(block.hash());

      assert.equal(
        await blockchain.getBlockByTransactionHash(transaction.hash()),
        undefined
      );
    });
  });

  describe("getTransactionReceipt", () => {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.equal(
        await blockchain.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });

    it("returns undefined for a known transaction without receipt", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);

      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);

      assert.equal(
        await blockchain.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });

    it("returns the receipt when it was provided earlier", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);

      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      const receipt = createTestReceipt(transaction);
      block.transactions.push(transaction);

      await blockchain.addBlock(block);
      blockchain.addTransactionReceipts([receipt]);

      assert.equal(
        await blockchain.getTransactionReceipt(transaction.hash()),
        receipt
      );
    });

    it("forgets receipts after block is removed", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);

      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      const receipt = createTestReceipt(transaction);
      block.transactions.push(transaction);

      await blockchain.addBlock(block);
      blockchain.addTransactionReceipts([receipt]);
      blockchain.deleteBlock(block.hash());

      assert.equal(
        await blockchain.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });
  });

  describe("getLogs", () => {
    it("works like BlockchainData.getLogs", async () => {
      const block1 = createBlock(0);
      const log1 = createTestLog(0);
      const log2 = createTestLog(0);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(0);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(1);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(1);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      await blockchain.addBlock(block1);
      await blockchain.addBlock(block2);
      blockchain.addTransactionReceipts([receipt1, receipt2, receipt3]);

      const logs = await blockchain.getLogs({
        fromBlock: new BN(0),
        toBlock: new BN(0),
        addresses: [],
        normalizedTopics: [],
      });
      assert.deepEqual(logs, [log1, log2, log3]);
    });
  });
});
