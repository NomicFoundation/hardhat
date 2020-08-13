import { assert } from "chai";
import { BufferLike } from "ethereumjs-tx";
import { BN, zeros } from "ethereumjs-util";

import { BuidlerBlockchain } from "../../../../src/internal/buidler-evm/provider/BuidlerBlockchain";
import { randomHashBuffer } from "../../../../src/internal/buidler-evm/provider/fork/random";
import { Block } from "../../../../src/internal/buidler-evm/provider/types/Block";
import { PBlockchain } from "../../../../src/internal/buidler-evm/provider/types/PBlockchain";

describe("BuidlerBlockchain", () => {
  let blockchain: PBlockchain;

  function createBlock(number: BufferLike, stateRoot: Buffer = zeros(32)) {
    return new Block({ header: { number, stateRoot } });
  }

  beforeEach(() => {
    blockchain = new BuidlerBlockchain().asPBlockchain();
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
      await blockchain.putBlock(createBlock(0));
      const one = createBlock(1);
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
      const block = createBlock(1);
      await assert.isRejected(
        blockchain.putBlock(block),
        Error,
        "Invalid block number"
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

    it("throws when hash of non-existent block is given", async () => {
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
});
