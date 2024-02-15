import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  BytesLike as BufferLike,
  bytesToBigInt as bufferToBigInt,
  toBytes,
  zeros,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { randomHashBuffer } from "../../../../src/internal/hardhat-network/provider/utils/random";
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
    const difficulty = bufferToBigInt(toBytes(_difficulty));
    const parentHash = number === 0 ? zeros(32) : blocks[number - 1].hash();
    const newBlock = Block.fromBlockData(
      {
        header: { number, difficulty, parentHash },
      },
      {
        skipConsensusFormatValidation: true,
      }
    );
    blocks.push(newBlock);
    return newBlock;
  }

  beforeEach(() => {
    blockchain = new HardhatBlockchain(new Common({ chain: "mainnet" }));
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
        "Block not found"
      );
    });
  });

  describe("getBlock", () => {
    it("can get existing block by hash", async () => {
      const genesis = createBlock(0);
      const one = createBlock(1);
      await blockchain.addBlock(genesis);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(Buffer.from(one.hash())), one);
    });

    it("can get existing block by number", async () => {
      await blockchain.addBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(1), one);
    });

    it("can get existing block by bigint", async () => {
      await blockchain.addBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.addBlock(one);
      assert.equal(await blockchain.getBlock(1n), one);
    });

    it("throws error for non-existent block", async () => {
      await assert.isRejected(blockchain.getBlock(0), "Block not found");
      await assert.isRejected(
        blockchain.getBlock(Buffer.from(randomHashBuffer())),
        "Block not found"
      );
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

      blockchain.deleteBlock(Buffer.from(blockOne.hash()));

      await assert.isRejected(
        blockchain.getBlock(Buffer.from(blockOne.hash())),
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(Buffer.from(blockTwo.hash())),
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(Buffer.from(blockThree.hash())),
        "Block not found"
      );
    });

    it("updates the latest block number", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);
      blockchain.deleteBlock(Buffer.from(blockTwo.hash()));

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
      blockchain.deleteBlock(Buffer.from(block.hash()));
      await blockchain.addBlock(otherBlock);
      assert.equal(
        await blockchain.getBlock(Buffer.from(otherBlock.hash())),
        otherBlock
      );
    });

    it("throws when hash if non-existent block is given", async () => {
      const block = createBlock(0);
      assert.throws(
        () => blockchain.deleteBlock(Buffer.from(block.hash())),
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

      assert.equal(
        await blockchain.getBlock(Buffer.from(blockOne.hash())),
        blockOne
      );
      await assert.isRejected(
        blockchain.getBlock(Buffer.from(blockTwo.hash())),
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(Buffer.from(blockThree.hash())),
        "Block not found"
      );
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
        blockchain.getTotalDifficulty(Buffer.from(randomHashBuffer())),
        Error,
        "Block not found"
      );
    });

    it("can get difficulty of the genesis block", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const difficulty = await blockchain.getTotalDifficulty(
        Buffer.from(genesis.hash())
      );
      assert.equal(difficulty, 1000n);
    });

    it("can get total difficulty of the second block", async () => {
      const genesis = createBlock(0, 1000);
      const second = createBlock(1, 2000);
      await blockchain.addBlock(genesis);
      await blockchain.addBlock(second);

      const difficulty = await blockchain.getTotalDifficulty(
        Buffer.from(second.hash())
      );
      assert.equal(difficulty, 3000n);
    });

    it("does not return total difficulty of a deleted block", async () => {
      const blockOne = createBlock(0, 1000);
      const blockTwo = createBlock(1, 2000);

      await blockchain.addBlock(blockOne);
      await blockchain.addBlock(blockTwo);

      blockchain.deleteLaterBlocks(blockOne);

      assert.equal(
        await blockchain.getTotalDifficulty(Buffer.from(blockOne.hash())),
        1000n
      );
      await assert.isRejected(
        blockchain.getTotalDifficulty(Buffer.from(blockTwo.hash())),
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
      assert.isUndefined(await getTransaction(Buffer.from(transaction.hash())));
    });

    it("returns a known transaction", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);

      const result = await getTransaction(Buffer.from(transaction.hash()));
      assert.equal(result, transaction);
    });

    it("forgets transactions after block is removed", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.addBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await blockchain.addBlock(block);
      blockchain.deleteBlock(Buffer.from(block.hash()));

      assert.isUndefined(await getTransaction(Buffer.from(transaction.hash())));
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
        await blockchain.getBlockByTransactionHash(
          Buffer.from(transaction.hash())
        ),
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
        Buffer.from(transaction.hash())
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
      blockchain.deleteBlock(Buffer.from(block.hash()));

      assert.equal(
        await blockchain.getBlockByTransactionHash(
          Buffer.from(transaction.hash())
        ),
        undefined
      );
    });
  });

  describe("getTransactionReceipt", () => {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.equal(
        await blockchain.getTransactionReceipt(Buffer.from(transaction.hash())),
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
        await blockchain.getTransactionReceipt(Buffer.from(transaction.hash())),
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
        await blockchain.getTransactionReceipt(Buffer.from(transaction.hash())),
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
      blockchain.deleteBlock(Buffer.from(block.hash()));

      assert.equal(
        await blockchain.getTransactionReceipt(Buffer.from(transaction.hash())),
        undefined
      );
    });
  });

  describe("getLogs", () => {
    it("works like BlockchainData.getLogs", async () => {
      const block1 = createBlock(0);
      const log1 = createTestLog(0n);
      const log2 = createTestLog(0n);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(0n);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(1);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(1n);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      await blockchain.addBlock(block1);
      await blockchain.addBlock(block2);
      blockchain.addTransactionReceipts([receipt1, receipt2, receipt3]);

      const logs = await blockchain.getLogs({
        fromBlock: 0n,
        toBlock: 0n,
        addresses: [],
        normalizedTopics: [],
      });
      assert.deepEqual(logs, [log1, log2, log3]);
    });
  });
});
