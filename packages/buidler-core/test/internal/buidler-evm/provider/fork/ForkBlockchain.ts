import { assert } from "chai";
import Common from "ethereumjs-common";
import { BN, zeros } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { Block } from "../../../../../src/internal/buidler-evm/provider/Block";
import { NotSupportedError } from "../../../../../src/internal/buidler-evm/provider/fork/errors";
import { ForkBlockchain } from "../../../../../src/internal/buidler-evm/provider/fork/ForkBlockchain";
import { randomHashBuffer } from "../../../../../src/internal/buidler-evm/provider/fork/random";
import {
  BLOCK_HASH_OF_10496585,
  BLOCK_NUMBER_OF_10496585,
  INFURA_URL,
} from "../../helpers/constants";
import { DEFAULT_HARDFORK } from "../../helpers/useProvider";

describe("ForkBlockchain", () => {
  let client: JsonRpcClient;
  let forkBlockNumber: BN;
  let common: Common;
  let fb: ForkBlockchain;

  function createBlock(number: BN, stateRoot: Buffer = zeros(32)) {
    return new Block({ header: { number, stateRoot } }, { common });
  }

  before(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    forkBlockNumber = await client.getLatestBlockNumber();
    common = new Common("mainnet", DEFAULT_HARDFORK);
  });

  beforeEach(async () => {
    fb = new ForkBlockchain(client, forkBlockNumber, common);
  });

  it("can be constructed", () => {
    assert.instanceOf(fb, ForkBlockchain);
  });

  describe("getBlock", () => {
    it("can get remote block object by block number", async () => {
      const block = await fb.getBlock(BLOCK_NUMBER_OF_10496585);

      assert.equal(block?.hash().toString("hex"), BLOCK_HASH_OF_10496585);

      assert.equal(block?.transactions.length, 192);
      assert.equal(
        block?.transactions[0].hash().toString("hex"),
        "ed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8"
      );
      assert.equal(
        block?.transactions[191].hash().toString("hex"),
        "d809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7"
      );
    });

    it("can get remote block object by hash", async () => {
      const block = await fb.getBlock(
        Buffer.from(BLOCK_HASH_OF_10496585, "hex")
      );

      assert.equal(block?.hash().toString("hex"), BLOCK_HASH_OF_10496585);

      assert.equal(block?.transactions.length, 192);
      assert.equal(
        block?.transactions[0].hash().toString("hex"),
        "ed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8"
      );
      assert.equal(
        block?.transactions[191].hash().toString("hex"),
        "d809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7"
      );
    });

    it("caches the block object and returns the same one for subsequent calls", async () => {
      const blockOne = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      const blockTwo = await fb.getBlock(
        Buffer.from(BLOCK_HASH_OF_10496585, "hex")
      );
      const blockThree = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      const blockFour = await fb.getBlock(
        Buffer.from(BLOCK_HASH_OF_10496585, "hex")
      );
      assert.equal(blockOne, blockTwo);
      assert.equal(blockTwo, blockThree);
      assert.equal(blockThree, blockFour);
    });

    it("throws for non-existent block", async () => {
      await assert.isRejected(
        fb.getBlock(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });

    it("can get remote block object with create transaction", async () => {
      const daiCreationBlock = new BN(4719568);
      const daiCreateTxPosition = 85;
      const block = await fb.getBlock(daiCreationBlock);
      assert.equal(
        block?.transactions[daiCreateTxPosition].to.toString("hex"),
        ""
      );
      assert.equal(
        block?.transactions[daiCreateTxPosition].hash().toString("hex"),
        "b95343413e459a0f97461812111254163ae53467855c0d73e0f1e7c5b8442fa3"
      );
    });

    it("cannot get remote blocks that are newer than forkBlockNumber", async () => {
      fb = new ForkBlockchain(client, forkBlockNumber.subn(10), common);
      const newerBlock = await client.getBlockByNumber(forkBlockNumber.subn(5));

      await assert.isRejected(
        fb.getBlock(newerBlock!.hash!),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(newerBlock!.number!),
        Error,
        "Block not found"
      );
    });

    it("can retrieve inserted block by hash", async () => {
      const blockNumber = forkBlockNumber.addn(1);
      const block = createBlock(blockNumber);
      await fb.putBlock(block);
      const savedBlock = await fb.getBlock(block.hash());
      assert.equal(savedBlock, block);
    });
  });

  describe("getLatestBlock", () => {
    it("returns the block at which we fork if no blocks were added", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585, common);
      const block = await fb.getLatestBlock();

      assert.equal(block?.hash().toString("hex"), BLOCK_HASH_OF_10496585);
      assert.equal(block?.transactions.length, 192);
      assert.equal(
        block?.transactions[0].hash().toString("hex"),
        "ed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8"
      );
      assert.equal(
        block?.transactions[191].hash().toString("hex"),
        "d809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7"
      );
    });

    it("returns the latest added block", async () => {
      const block = createBlock(forkBlockNumber.addn(1));
      await fb.putBlock(block);
      const latestBlock = await fb.getLatestBlock();
      assert.equal(latestBlock, block);
    });
  });

  describe("putBlock", () => {
    it("saves the block in the blockchain", async () => {
      const blockNumber = forkBlockNumber.addn(1);
      const block = createBlock(blockNumber);
      const returnedBlock = await fb.putBlock(block);
      const savedBlock = await fb.getBlock(blockNumber);
      assert.equal(returnedBlock, block);
      assert.equal(savedBlock, block);
    });

    it("rejects blocks with invalid block number", async () => {
      const block = createBlock(forkBlockNumber.addn(2));
      await assert.isRejected(
        fb.putBlock(block),
        Error,
        "Invalid block number"
      );
    });

    it("can save more than one block", async () => {
      const blockOne = createBlock(forkBlockNumber.addn(1));
      const blockTwo = createBlock(forkBlockNumber.addn(2));
      const blockThree = createBlock(forkBlockNumber.addn(3));

      await fb.putBlock(blockOne);
      await fb.putBlock(blockTwo);
      await fb.putBlock(blockThree);

      assert.equal(await fb.getBlock(forkBlockNumber.addn(1)), blockOne);
      assert.equal(await fb.getBlock(forkBlockNumber.addn(2)), blockTwo);
      assert.equal(await fb.getBlock(forkBlockNumber.addn(3)), blockThree);
    });
  });

  describe("getDetails", () => {
    it("resolves", async () => {
      await assert.isFulfilled(fb.getDetails(""));
    });

    it("calls callback with null", async () => {
      const result = await new Promise((resolve) =>
        fb.asBlockchain().getDetails("", resolve)
      );
      assert.isNull(result);
    });
  });

  describe("delBlock", () => {
    it("removes the block and all subsequent ones", async () => {
      const blockOne = createBlock(forkBlockNumber.addn(1));
      const blockTwo = createBlock(forkBlockNumber.addn(2));
      const blockThree = createBlock(forkBlockNumber.addn(3));

      await fb.putBlock(blockOne);
      await fb.putBlock(blockTwo);
      await fb.putBlock(blockThree);

      await fb.delBlock(blockOne.hash());

      await assert.isRejected(
        fb.getBlock(blockOne.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("updates the latest block number", async () => {
      const blockOne = createBlock(forkBlockNumber.addn(1));
      const blockTwo = createBlock(forkBlockNumber.addn(2));
      const blockThree = createBlock(forkBlockNumber.addn(3));

      await fb.putBlock(blockOne);
      await fb.putBlock(blockTwo);
      await fb.delBlock(blockTwo.hash());

      assert.equal(await fb.getLatestBlock(), blockOne);
      await assert.isRejected(
        fb.putBlock(blockThree),
        Error,
        "Invalid block number"
      );
    });

    it("is possible to add a block after delete", async () => {
      const block = createBlock(forkBlockNumber.addn(1));
      const otherBlock = createBlock(
        forkBlockNumber.addn(1),
        randomHashBuffer()
      );
      await fb.putBlock(block);
      await fb.delBlock(block.hash());
      await fb.putBlock(otherBlock);
      assert.equal(await fb.getBlock(otherBlock.hash()), otherBlock);
    });

    it("throws when hash of non-existent block is given", async () => {
      const block = createBlock(forkBlockNumber.addn(1));
      await assert.isRejected(
        fb.delBlock(block.hash()),
        Error,
        "Block not found"
      );
    });

    it("throws when hash of not previously fetched remote block is given", async () => {
      // This is here because we do not want to fetch remote blocks for this operation
      await assert.isRejected(
        fb.delBlock(Buffer.from(BLOCK_HASH_OF_10496585, "hex")),
        Error,
        "Block not found"
      );
    });

    it("throws on attempt to remove remote block", async () => {
      const remoteBlock = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      await assert.isRejected(
        fb.delBlock(remoteBlock.hash()),
        Error,
        "Cannot delete remote block"
      );
    });

    it("throws on attempt to remove the block from which we fork", async () => {
      const forkBlock = await fb.getLatestBlock();
      await assert.isRejected(
        fb.delBlock(forkBlock.hash()),
        Error,
        "Cannot delete remote block"
      );
    });
  });

  describe("iterator", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fb.iterator("", () => {}),
        NotSupportedError,
        "iterator"
      );
    });
  });

  describe("deleteAllFollowingBlocks", () => {
    it("removes all blocks subsequent to the given block", async () => {
      const blockOne = await fb.getLatestBlock();
      const blockTwo = createBlock(forkBlockNumber.addn(1));
      const blockThree = createBlock(forkBlockNumber.addn(2));

      await fb.putBlock(blockTwo);
      await fb.putBlock(blockThree);

      fb.deleteAllFollowingBlocks(blockOne);

      assert.equal(await fb.getBlock(blockOne.hash()), blockOne);
      await assert.isRejected(
        fb.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("throws if given block is not present in blockchain", async () => {
      const blockOne = createBlock(forkBlockNumber.addn(1));
      const notAddedBlock = createBlock(forkBlockNumber.addn(2));
      const fakeBlockOne = createBlock(
        forkBlockNumber.addn(1),
        randomHashBuffer()
      );

      await fb.putBlock(blockOne);

      assert.throws(
        () => fb.deleteAllFollowingBlocks(notAddedBlock),
        Error,
        "Invalid block"
      );
      assert.throws(
        () => fb.deleteAllFollowingBlocks(fakeBlockOne),
        Error,
        "Invalid block"
      );
    });

    it("does not throw if there are no following blocks", async () => {
      const blockOne = createBlock(forkBlockNumber.addn(1));
      await fb.putBlock(blockOne);
      assert.doesNotThrow(() => fb.deleteAllFollowingBlocks(blockOne));
    });

    it("throws on attempt to remove remote blocks", async () => {
      const block = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      assert.throws(
        () => fb.deleteAllFollowingBlocks(block),
        Error,
        "Cannot delete remote block"
      );
    });
  });
});
