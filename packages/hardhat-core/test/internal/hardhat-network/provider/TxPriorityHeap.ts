import { assert } from "chai";
import { FakeTxData } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  OrderedTransaction,
  TxPriorityHeap,
} from "../../../../src/internal/hardhat-network/provider/TxPriorityHeap";
import { createTestOrderedTransaction } from "../helpers/blockchain";
import { makeOrderedTxMap } from "../helpers/makeOrderedTxMap";

function parseGWei(gwei: number) {
  return new BN(10).pow(new BN(9)).muln(gwei);
}

function getTestTransactionFactory() {
  let orderId = 0;
  return (data: FakeTxData) =>
    createTestOrderedTransaction({ orderId: orderId++, ...data });
}

// TODO add tests for peek with pop/shift

describe("TxPriorityHeap", () => {
  let createTestTransaction: (data: FakeTxData) => OrderedTransaction;

  beforeEach(() => {
    createTestTransaction = getTestTransactionFactory();
  });

  describe("peek", () => {
    it("returns the transaction with the highest gas price", () => {
      const tx1 = createTestTransaction({ gasPrice: parseGWei(1) });
      const tx2 = createTestTransaction({ gasPrice: parseGWei(3) });
      const tx3 = createTestTransaction({ gasPrice: parseGWei(2) });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1, tx2, tx3]));
      assert.equal(txHeap.peek(), tx2);
    });

    it("returns the transaction with the lowest orderId in case of gas price draw", () => {
      const tx1 = createTestOrderedTransaction({
        orderId: 1,
        gasPrice: parseGWei(3),
      });
      const tx2 = createTestOrderedTransaction({
        orderId: 2,
        gasPrice: parseGWei(3),
      });
      const tx3 = createTestOrderedTransaction({
        orderId: 3,
        gasPrice: parseGWei(3),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1, tx2, tx3]));
      assert.equal(txHeap.peek(), tx1);
    });

    it("returns only currently processable transactions", () => {
      const accountA = randomAddressBuffer();
      const accountB = randomAddressBuffer();
      const txA1 = createTestTransaction({
        from: accountA,
        nonce: 1,
        gasPrice: parseGWei(1),
      });
      const txA2 = createTestTransaction({
        from: accountA,
        nonce: 2,
        gasPrice: parseGWei(3),
      });
      const txB1 = createTestTransaction({
        from: accountB,
        nonce: 1,
        gasPrice: parseGWei(2),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([txA1, txA2, txB1]));
      assert.equal(txHeap.peek(), txB1);
    });
  });

  describe("pop", () => {
    it("removes the best transaction from the heap", () => {
      const tx1 = createTestOrderedTransaction({
        orderId: 1,
        gasPrice: parseGWei(3),
      });
      const tx2 = createTestOrderedTransaction({
        orderId: 2,
        gasPrice: parseGWei(3),
      });
      const tx3 = createTestOrderedTransaction({
        orderId: 3,
        gasPrice: parseGWei(3),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1, tx2, tx3]));
      txHeap.pop();
      assert.equal(txHeap.peek(), tx2);
    });

    it("discards later transactions from the same sender", () => {
      const accountA = randomAddressBuffer();
      const accountB = randomAddressBuffer();
      const txA1 = createTestTransaction({
        from: accountA,
        nonce: 1,
        gasPrice: parseGWei(3),
      });
      const txA2 = createTestTransaction({
        from: accountA,
        nonce: 2,
        gasPrice: parseGWei(2),
      });
      const txB1 = createTestTransaction({
        from: accountB,
        nonce: 1,
        gasPrice: parseGWei(1),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([txA1, txA2, txB1]));
      txHeap.pop();
      assert.equal(txHeap.peek(), txB1);
    });

    it("does not throw if there are no processable transactions left", async () => {
      const account = randomAddressBuffer();
      const tx1 = createTestTransaction({
        from: account,
        nonce: 1,
        gasPrice: parseGWei(1),
      });
      const tx2 = createTestTransaction({
        from: account,
        nonce: 2,
        gasPrice: parseGWei(1),
      });
      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1, tx2]));
      txHeap.pop();
      assert.isUndefined(txHeap.peek());
      assert.doesNotThrow(() => txHeap.pop());
    });
  });

  describe("shift", () => {
    it("removes the best transaction from the heap", () => {
      const tx1 = createTestOrderedTransaction({
        orderId: 1,
        gasPrice: parseGWei(3),
      });
      const tx2 = createTestOrderedTransaction({
        orderId: 2,
        gasPrice: parseGWei(3),
      });
      const tx3 = createTestOrderedTransaction({
        orderId: 3,
        gasPrice: parseGWei(3),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1, tx2, tx3]));
      txHeap.shift();
      assert.equal(txHeap.peek(), tx2);
    });

    it("pushes the next transaction from the same sender onto the heap", () => {
      const accountA = randomAddressBuffer();
      const accountB = randomAddressBuffer();
      const txA1 = createTestTransaction({
        from: accountA,
        nonce: 1,
        gasPrice: parseGWei(3),
      });
      const txA2 = createTestTransaction({
        from: accountA,
        nonce: 2,
        gasPrice: parseGWei(2),
      });
      const txB1 = createTestTransaction({
        from: accountB,
        nonce: 1,
        gasPrice: parseGWei(1),
      });

      const txHeap = new TxPriorityHeap(makeOrderedTxMap([txA1, txA2, txB1]));
      txHeap.shift();
      assert.equal(txHeap.peek(), txA2);
    });

    it("does not push the same next transaction twice", () => {
      const accountA = randomAddressBuffer();
      const accountB = randomAddressBuffer();
      const txA1 = createTestTransaction({
        from: accountA,
        nonce: 1,
        gasPrice: parseGWei(4),
      });
      const txA2 = createTestTransaction({
        from: accountA,
        nonce: 2,
        gasPrice: parseGWei(3),
      });
      const txA3 = createTestTransaction({
        from: accountA,
        nonce: 3,
        gasPrice: parseGWei(2),
      });
      const txB1 = createTestTransaction({
        from: accountB,
        nonce: 1,
        gasPrice: parseGWei(1),
      });

      const txHeap = new TxPriorityHeap(
        makeOrderedTxMap([txA1, txA2, txA3, txB1])
      );
      txHeap.shift();
      txHeap.shift();
      assert.equal(txHeap.peek(), txA3);
    });

    it("does not throw if there are no processable transactions left", async () => {
      const account = randomAddressBuffer();
      const tx1 = createTestTransaction({
        from: account,
        nonce: 1,
        gasPrice: parseGWei(1),
      });
      const txHeap = new TxPriorityHeap(makeOrderedTxMap([tx1]));
      txHeap.shift();
      assert.isUndefined(txHeap.peek());
      assert.doesNotThrow(() => txHeap.shift());
    });
  });
});
