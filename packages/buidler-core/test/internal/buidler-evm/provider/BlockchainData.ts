import { assert } from "chai";
import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";

import { Block } from "../../../../internal/buidler-evm/provider/types/Block";
import { BlockchainData } from "../../../../src/internal/buidler-evm/provider/BlockchainData";
import { randomAddressBuffer } from "../../../../src/internal/buidler-evm/provider/fork/random";

describe("BlockchainData", () => {
  let bd: BlockchainData;

  function createBlock(number: number) {
    const newBlock = new Block({ header: { number } });
    return newBlock;
  }

  function createRandomTransaction() {
    return new Transaction({ to: randomAddressBuffer() });
  }

  beforeEach(() => {
    bd = new BlockchainData();
  });

  describe("addBlock", () => {
    it("saves the block and allows for queries", () => {
      const block1 = createBlock(1234);
      const tx1 = createRandomTransaction();
      const tx2 = createRandomTransaction();
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(5678);
      const tx3 = createRandomTransaction();
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
      const tx1 = createRandomTransaction();
      const tx2 = createRandomTransaction();
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(5678);
      const tx3 = createRandomTransaction();
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
  });
});
