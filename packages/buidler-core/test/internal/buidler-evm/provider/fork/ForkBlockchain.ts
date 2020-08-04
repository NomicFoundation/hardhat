import { assert } from "chai";
import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { Block } from "../../../../../src/internal/buidler-evm/provider/Block";
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

  function createBlock(number: BN) {
    return new Block({ header: { number } }, { common });
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
      const error = await fb.getBlock(randomHashBuffer()).catch((e) => e);
      assert.instanceOf(error, Error);
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

      const errorOne = await fb.getBlock(newerBlock!.hash!).catch((e) => e);
      const errorTwo = await fb.getBlock(newerBlock!.number!).catch((e) => e);

      assert.instanceOf(errorOne, Error);
      assert.instanceOf(errorTwo, Error);
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
      const error = await fb.putBlock(block).catch((e) => e);
      assert.instanceOf(error, Error);
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
      const error = await fb.getDetails("").catch(e => e);
      assert.isUndefined(error);
    });

    it("calls callback with null", async () => {
      const result = await new Promise(resolve => fb.asBlockchain().getDetails("", resolve));
      assert.isNull(result);
    });
  });
});
