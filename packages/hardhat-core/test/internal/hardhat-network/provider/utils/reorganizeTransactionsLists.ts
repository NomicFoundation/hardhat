import { LegacyTxData } from "@nomicfoundation/ethereumjs-tx";
import { AddressLike } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import { List } from "immutable";

import { SerializedTransaction } from "../../../../../src/internal/hardhat-network/provider/PoolState";
import { deserializeTransaction } from "../../../../../src/internal/hardhat-network/provider/TxPool";
import { reorganizeTransactionsLists } from "../../../../../src/internal/hardhat-network/provider/utils/reorganizeTransactionsLists";
import {
  createTestOrderedTransaction,
  createTestSerializedTransaction,
} from "../../helpers/blockchain";

function getTestTransactionFactory() {
  let orderId = 0;
  return (data: LegacyTxData & { from?: AddressLike }) =>
    createTestSerializedTransaction({ orderId: orderId++, ...data });
}

function retrieveNonce(tx: SerializedTransaction) {
  // We create this tx to get the same common
  const txForCommon = createTestOrderedTransaction({ orderId: 0 });

  return deserializeTransaction(tx, txForCommon.data.common).data.nonce;
}

describe("reorganizeTransactionsLists", () => {
  let createTestTransaction: (
    data: LegacyTxData & { from?: AddressLike }
  ) => any;

  beforeEach(() => {
    createTestTransaction = getTestTransactionFactory();
  });

  describe("when there are no transactions to move", () => {
    it("does not move", () => {
      // pending: [1]
      // queued: [3, 4]
      const tx1 = createTestTransaction({ nonce: 1 });
      const tx3 = createTestTransaction({ nonce: 3 });
      const tx4 = createTestTransaction({ nonce: 4 });

      const pending = List.of(tx1);
      const queued = List.of(tx3, tx4);
      const { newPending, newQueued } = reorganizeTransactionsLists(
        pending,
        queued,
        retrieveNonce
      );
      assert.deepEqual(newPending.toArray(), pending.toArray());
      assert.deepEqual(newQueued.toArray(), queued.toArray());
    });
  });

  describe("when all transactions should be moved", () => {
    it("moves all transactions", () => {
      // pending: [1]
      // queued: [2, 3]
      const tx1 = createTestTransaction({ nonce: 1 });
      const tx2 = createTestTransaction({ nonce: 2 });
      const tx3 = createTestTransaction({ nonce: 3 });

      const { newPending, newQueued } = reorganizeTransactionsLists(
        List.of(tx1),
        List.of(tx2, tx3),
        retrieveNonce
      );
      assert.deepEqual(newPending.toArray(), [tx1, tx2, tx3]);
      assert.deepEqual(newQueued.toArray(), []);
    });
  });

  describe("when some but not all transactions should be moved", () => {
    it("moves proper transactions from sorted queued list", () => {
      // pending: [1]
      // queued: [2, 4]
      const tx1 = createTestTransaction({ nonce: 1 });
      const tx2 = createTestTransaction({ nonce: 2 });
      const tx4 = createTestTransaction({ nonce: 4 });

      const { newPending, newQueued } = reorganizeTransactionsLists(
        List.of(tx1),
        List.of(tx2, tx4),
        retrieveNonce
      );
      assert.deepEqual(newPending.toArray(), [tx1, tx2]);
      assert.deepEqual(newQueued.toArray(), [tx4]);
    });

    it("moves proper transactions from unsorted queued list", () => {
      // pending: [1]
      // queued: [4, 2]
      const tx1 = createTestTransaction({ nonce: 1 });
      const tx2 = createTestTransaction({ nonce: 2 });
      const tx4 = createTestTransaction({ nonce: 4 });

      const { newPending, newQueued } = reorganizeTransactionsLists(
        List.of(tx1),
        List.of(tx4, tx2),
        retrieveNonce
      );
      assert.deepEqual(newPending.toArray(), [tx1, tx2]);
      assert.deepEqual(newQueued.toArray(), [tx4]);
    });

    it("moves transactions from unsorted queued list leaving the ones that should stay", () => {
      // pending: [1]
      // queued: [3, 4, 2, 5, 8]
      const tx1 = createTestTransaction({ nonce: 1 });
      const tx2 = createTestTransaction({ nonce: 2 });
      const tx3 = createTestTransaction({ nonce: 3 });
      const tx4 = createTestTransaction({ nonce: 4 });
      const tx5 = createTestTransaction({ nonce: 5 });
      const tx8 = createTestTransaction({ nonce: 8 });

      const { newPending, newQueued } = reorganizeTransactionsLists(
        List.of(tx1),
        List.of(tx3, tx4, tx2, tx5, tx8),
        retrieveNonce
      );
      assert.deepEqual(newPending.toArray(), [tx1, tx2, tx3, tx4, tx5]);
      assert.deepEqual(newQueued.toArray(), [tx8]);
    });
  });
});
