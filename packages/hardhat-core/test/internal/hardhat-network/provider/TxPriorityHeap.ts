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
});
