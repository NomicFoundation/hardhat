import { assert } from "chai";
import { BufferLike, Transaction } from "ethereumjs-tx";
import { BN, zeros } from "ethereumjs-util";

import { BuidlerBlockchain } from "../../../../src/internal/buidler-evm/provider/BuidlerBlockchain";
import {
  randomAddressBuffer,
  randomHashBuffer,
} from "../../../../src/internal/buidler-evm/provider/fork/random";
import { Block } from "../../../../src/internal/buidler-evm/provider/types/Block";
import { PBlockchain } from "../../../../src/internal/buidler-evm/provider/types/PBlockchain";

describe("BuidlerBlockchain", () => {
  let blockchain: PBlockchain;
  let blocks: Block[];

  function createBlock(number: number, difficulty?: BufferLike) {
    const parentHash = number === 0 ? zeros(32) : blocks[number - 1].hash();
    const newBlock = new Block({ header: { number, difficulty, parentHash } });
    blocks.push(newBlock);
    return newBlock;
  }

  function createRandomTransaction() {
    return new Transaction({ to: randomAddressBuffer() });
  }

  beforeEach(() => {
    blockchain = new BuidlerBlockchain().asPBlockchain();
    blocks = [];
  });

  describe("getLatestBlock", () => {
    it("returns the latest block", async () => {
      it("can get existing block by hash", async () => {
        await blockchain.putBlock(createBlock(0));
        const one = createBlock(1);
        await blockchain.putBlock(one);
        assert.equal(await blockchain.getLatestBlock(), one);
      });
    });
  });

  describe("getBlock", () => {
    it("can get existing block by hash", async () => {
      const genesis = createBlock(0);
      const one = createBlock(1);
      await blockchain.putBlock(genesis);
      await blockchain.putBlock(one);
      assert.equal(await blockchain.getBlock(one.hash()), one);
    });

    it("can get existing block by number", async () => {
      await blockchain.putBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.putBlock(one);
      assert.equal(await blockchain.getBlock(1), one);
    });

    it("can get existing block by BN", async () => {
      await blockchain.putBlock(createBlock(0));
      const one = createBlock(1);
      await blockchain.putBlock(one);
      assert.equal(await blockchain.getBlock(new BN(1)), one);
    });

    it("throws for non-existent block", async () => {
      await assert.isRejected(blockchain.getBlock(0), Error, "Block not found");
      await assert.isRejected(
        blockchain.getBlock(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });
  });

  describe("putBlock", () => {
    it("can save genesis block", async () => {
      const genesis = createBlock(0);
      const returnedBlock = await blockchain.putBlock(genesis);
      const savedBlock = await blockchain.getBlock(0);
      assert.equal(returnedBlock, genesis);
      assert.equal(savedBlock, genesis);
    });

    it("rejects blocks with invalid block number", async () => {
      const block = new Block({ header: { number: 1 } });
      await assert.isRejected(
        blockchain.putBlock(block),
        Error,
        "Invalid block number"
      );
    });

    it("rejects genesis block with invalid parent hash", async () => {
      const block = new Block({
        header: { number: 0, parentHash: randomHashBuffer() },
      });
      await assert.isRejected(
        blockchain.putBlock(block),
        Error,
        "Invalid parent hash"
      );
    });

    it("rejects later block with invalid parent hash", async () => {
      const genesis = createBlock(0);
      await blockchain.putBlock(genesis);
      const block = new Block({ header: { number: 1 } });
      await assert.isRejected(
        blockchain.putBlock(block),
        Error,
        "Invalid parent hash"
      );
    });

    it("can save multiple blocks", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.putBlock(blockOne);
      await blockchain.putBlock(blockTwo);
      await blockchain.putBlock(blockThree);

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

      await blockchain.putBlock(blockOne);
      await blockchain.putBlock(blockTwo);
      await blockchain.putBlock(blockThree);

      await blockchain.delBlock(blockOne.hash());

      await assert.isRejected(
        blockchain.getBlock(blockOne.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("updates the latest block number", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await blockchain.putBlock(blockOne);
      await blockchain.putBlock(blockTwo);
      await blockchain.delBlock(blockTwo.hash());

      assert.equal(await blockchain.getLatestBlock(), blockOne);
      await assert.isRejected(
        blockchain.putBlock(blockThree),
        Error,
        "Invalid block number"
      );
    });

    it("is possible to add a block after delete", async () => {
      const block = createBlock(0);
      const otherBlock = createBlock(0, randomHashBuffer());
      await blockchain.putBlock(block);
      await blockchain.delBlock(block.hash());
      await blockchain.putBlock(otherBlock);
      assert.equal(await blockchain.getBlock(otherBlock.hash()), otherBlock);
    });

    it("throws when hash if non-existent block is given", async () => {
      const block = createBlock(0);
      await assert.isRejected(
        blockchain.delBlock(block.hash()),
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

      await blockchain.putBlock(blockOne);
      await blockchain.putBlock(blockTwo);
      await blockchain.putBlock(blockThree);

      blockchain.deleteAllFollowingBlocks(blockOne);

      assert.equal(await blockchain.getBlock(blockOne.hash()), blockOne);
      await assert.isRejected(
        blockchain.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        blockchain.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("throws if given block is not present in blockchain", async () => {
      const blockOne = createBlock(0);
      const notAddedBlock = createBlock(1);
      const fakeBlockOne = createBlock(0, randomHashBuffer());

      await blockchain.putBlock(blockOne);

      assert.throws(
        () => blockchain.deleteAllFollowingBlocks(notAddedBlock),
        Error,
        "Invalid block"
      );
      assert.throws(
        () => blockchain.deleteAllFollowingBlocks(fakeBlockOne),
        Error,
        "Invalid block"
      );
    });

    it("does not throw if there are no following blocks", async () => {
      const blockOne = createBlock(0);
      await blockchain.putBlock(blockOne);
      assert.doesNotThrow(() => blockchain.deleteAllFollowingBlocks(blockOne));
    });
  });

  describe("getBlockTotalDifficulty", () => {
    it("rejects when hash of non-existent block is given", async () => {
      await assert.isRejected(
        blockchain.getBlockTotalDifficulty(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });

    it("can get difficulty of the genesis block", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.putBlock(genesis);
      const difficulty = await blockchain.getBlockTotalDifficulty(
        genesis.hash()
      );
      assert.equal(difficulty.toNumber(), 1000);
    });

    it("can get total difficulty of the second block", async () => {
      const genesis = createBlock(0, 1000);
      const second = createBlock(1, 2000);
      await blockchain.putBlock(genesis);
      await blockchain.putBlock(second);

      const difficulty = await blockchain.getBlockTotalDifficulty(
        second.hash()
      );
      assert.equal(difficulty.toNumber(), 3000);
    });

    it("does not return total difficulty of a deleted block", async () => {
      const blockOne = createBlock(0, 1000);
      const blockTwo = createBlock(1, 2000);

      await blockchain.putBlock(blockOne);
      await blockchain.putBlock(blockTwo);

      blockchain.deleteAllFollowingBlocks(blockOne);

      assert.equal(
        (await blockchain.getBlockTotalDifficulty(blockOne.hash())).toNumber(),
        1000
      );
      await assert.isRejected(
        blockchain.getBlockTotalDifficulty(blockTwo.hash()),
        Error,
        "Block not found"
      );
    });
  });

  describe.only("getTransaction", () => {
    it("throws for unknown transactions", async () => {
      const transaction = createRandomTransaction();
      await assert.isRejected(
        blockchain.getTransaction(transaction.hash()),
        Error,
        "Transaction not found"
      );
    });

    it("returns a known transaction", async () => {
      const genesis = createBlock(0, 1000);
      await blockchain.putBlock(genesis);
      const block = createBlock(1, 1000);
      const transaction = createRandomTransaction();
      block.transactions.push(transaction);
      await blockchain.putBlock(block);

      const result = await blockchain.getTransaction(transaction.hash());
      assert.equal(result, transaction);
    });
  });
});
