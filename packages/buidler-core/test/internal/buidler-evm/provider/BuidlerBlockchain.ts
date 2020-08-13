import { assert } from "chai";
import { BufferLike } from "ethereumjs-tx";
import { zeros } from "ethereumjs-util";

import { BuidlerBlockchain } from "../../../../src/internal/buidler-evm/provider/BuidlerBlockchain";
import { randomHashBuffer } from "../../../../src/internal/buidler-evm/provider/fork/random";
import { Block } from "../../../../src/internal/buidler-evm/provider/types/Block";
import { PBlockchain } from "../../../../src/internal/buidler-evm/provider/types/PBlockchain";

describe("BuidlerBlockchain", () => {
  let fb: PBlockchain;

  function createBlock(number: BufferLike, stateRoot: Buffer = zeros(32)) {
    return new Block({ header: { number, stateRoot } });
  }

  beforeEach(() => {
    fb = new BuidlerBlockchain().asPBlockchain();
  });

  describe("getBlock", () => {
    it("throws for non-existent block", async () => {
      await assert.isRejected(fb.getBlock(0), Error, "Block not found");
      await assert.isRejected(
        fb.getBlock(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });
  });

  describe("putBlock", () => {
    it("can save genesis block", async () => {
      const genesis = createBlock(0);
      const returnedBlock = await fb.putBlock(genesis);
      const savedBlock = await fb.getBlock(0);
      assert.equal(returnedBlock, genesis);
      assert.equal(savedBlock, genesis);
    });

    it("rejects blocks with invalid block number", async () => {
      const block = createBlock(1);
      await assert.isRejected(
        fb.putBlock(block),
        Error,
        "Invalid block number"
      );
    });

    it("can save multiple blocks", async () => {
      const blockOne = createBlock(0);
      const blockTwo = createBlock(1);
      const blockThree = createBlock(2);

      await fb.putBlock(blockOne);
      await fb.putBlock(blockTwo);
      await fb.putBlock(blockThree);

      assert.equal(await fb.getBlock(0), blockOne);
      assert.equal(await fb.getBlock(1), blockTwo);
      assert.equal(await fb.getBlock(2), blockThree);
    });
  });
});
