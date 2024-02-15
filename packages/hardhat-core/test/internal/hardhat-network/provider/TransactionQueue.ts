import {
  AccessListEIP2930TxData,
  FeeMarketEIP1559TxData,
  LegacyTxData,
} from "@nomicfoundation/ethereumjs-tx";
import {
  AddressLike,
  bytesToBigInt as bufferToBigInt,
  bytesToHex as bufferToHex,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import { randomBytes } from "crypto";

import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/PoolState";
import { TransactionQueue } from "../../../../src/internal/hardhat-network/provider/TransactionQueue";
import { createTestOrderedTransaction } from "../helpers/blockchain";
import { makeOrderedTxMap } from "../helpers/makeOrderedTxMap";
import { InternalError } from "../../../../src/internal/core/providers/errors";
import * as BigIntUtils from "../../../../src/internal/util/bigint";
import { keccak256 } from "../../../../src/internal/util/keccak";

type TestTxData = (
  | LegacyTxData
  | FeeMarketEIP1559TxData
  | AccessListEIP2930TxData
) & {
  from?: AddressLike;
};

function getTestTransactionFactory() {
  let orderId = 0;
  return (data: TestTxData) =>
    createTestOrderedTransaction({ orderId: orderId++, ...data });
}

const SEED = randomBytes(8);

let lastValue = keccak256(SEED);
function weakRandomComparator(_left: unknown, _right: unknown) {
  lastValue = keccak256(lastValue);
  const leftRandomId = bufferToBigInt(lastValue);

  lastValue = keccak256(lastValue);
  const rightRandomId = bufferToBigInt(lastValue);

  return BigIntUtils.cmp(leftRandomId, rightRandomId);
}

describe(`TxPriorityHeap (tests using seed ${bufferToHex(SEED)})`, () => {
  let createTestTransaction: (data: TestTxData) => OrderedTransaction;

  beforeEach(() => {
    createTestTransaction = getTestTransactionFactory();
  });

  describe("Without base fee", function () {
    describe("EIP-1559 validation", function () {
      it("Should not accept an EIP-1559 tx if no base fee is used", function () {
        const tx1 = createTestTransaction({
          maxFeePerGas: 1,
          maxPriorityFeePerGas: 1,
        });

        assert.throws(
          () => new TransactionQueue(makeOrderedTxMap([tx1]), "priority"),
          InternalError
        );
      });

      describe("Sorting transactions", function () {
        it("Should use the gasPrice and order to sort txs", function () {
          const tx1 = createTestTransaction({ gasPrice: 123 });

          const tx2 = createTestTransaction({
            gasPrice: 1000,
          });

          // This has the same gasPrice than tx2, but arrived later, so it's
          // placed later in the queue
          const tx3 = createTestTransaction({
            gasPrice: 1000,
          });

          const tx4 = createTestTransaction({
            gasPrice: 2000,
          });

          const txs = [tx1, tx2, tx3, tx4];
          txs.sort(weakRandomComparator);
          const queue = new TransactionQueue(makeOrderedTxMap(txs), "priority");

          assert.equal(queue.getNextTransaction(), tx4.data);
          assert.equal(queue.getNextTransaction(), tx2.data);
          assert.equal(queue.getNextTransaction(), tx3.data);
          assert.equal(queue.getNextTransaction(), tx1.data);
        });
      });

      it("Should not include transactions from a sender whose next tx was discarded", function () {
        const senderWithFirstTxNotMined =
          "0x0000000000000000000000000000000000000001";

        const senderWithThirdTxNotMined =
          "0x0000000000000000000000000000000000000002";

        const tx1 = createTestTransaction({
          gasPrice: 100,
        });

        const tx2 = createTestTransaction({
          gasPrice: 99,
        });

        // Not mined
        const tx3 = createTestTransaction({
          gasPrice: 98,
          from: senderWithFirstTxNotMined,
          nonce: 0,
        });

        // Discarded
        const tx4 = createTestTransaction({
          gasPrice: 97,
          from: senderWithFirstTxNotMined,
          nonce: 1,
        });

        const tx5 = createTestTransaction({
          gasPrice: 96,
          from: senderWithThirdTxNotMined,
          nonce: 0,
        });

        const tx6 = createTestTransaction({
          gasPrice: 95,
          from: senderWithThirdTxNotMined,
          nonce: 1,
        });

        // Not mined
        const tx7 = createTestTransaction({
          gasPrice: 94,
          from: senderWithThirdTxNotMined,
          nonce: 2,
        });

        // Discarded
        const tx8 = createTestTransaction({
          gasPrice: 93,
          from: senderWithThirdTxNotMined,
          nonce: 3,
        });

        const tx9 = createTestTransaction({
          gasPrice: 92,
        });

        const tx10 = createTestTransaction({
          gasPrice: 91,
        });

        const txs = [tx1, tx2, tx3, tx4, tx5, tx6, tx7, tx8, tx9, tx10];
        txs.sort(weakRandomComparator);
        const queue = new TransactionQueue(makeOrderedTxMap(txs), "priority");

        assert.equal(queue.getNextTransaction(), tx1.data);
        assert.equal(queue.getNextTransaction(), tx2.data);
        assert.equal(queue.getNextTransaction(), tx3.data);
        queue.removeLastSenderTransactions();

        assert.equal(queue.getNextTransaction(), tx5.data);
        assert.equal(queue.getNextTransaction(), tx6.data);
        assert.equal(queue.getNextTransaction(), tx7.data);
        queue.removeLastSenderTransactions();

        assert.equal(queue.getNextTransaction(), tx9.data);
        assert.equal(queue.getNextTransaction(), tx10.data);
      });
    });
  });

  describe("With base fee", function () {
    describe("EIP-1559 validation", function () {
      it("Should accept an EIP-1559 tx", function () {
        const tx1 = createTestTransaction({
          maxFeePerGas: 1,
          maxPriorityFeePerGas: 1,
        });

        assert.doesNotThrow(
          () => new TransactionQueue(makeOrderedTxMap([tx1]), "priority", 1n)
        );
      });
    });

    describe("Sorting", function () {
      it("Should use the effective miner fee to sort txs", function () {
        const baseFee = 15n;

        // Effective miner fee: 96
        const tx1 = createTestTransaction({ gasPrice: 111 });

        // Effective miner fee: 100
        const tx2 = createTestTransaction({
          maxFeePerGas: 120,
          maxPriorityFeePerGas: 100,
        });

        // Effective miner fee: 110
        const tx3 = createTestTransaction({
          maxFeePerGas: 140,
          maxPriorityFeePerGas: 110,
        });

        // Effective miner fee: 125
        const tx4 = createTestTransaction({
          maxFeePerGas: 140,
          maxPriorityFeePerGas: 130,
        });

        // Effective miner fee: 155
        const tx5 = createTestTransaction({ gasPrice: 170 });

        const txs = [tx1, tx2, tx3, tx4, tx5];
        txs.sort(weakRandomComparator);
        const queue = new TransactionQueue(
          makeOrderedTxMap(txs),
          "priority",
          baseFee
        );

        assert.equal(queue.getNextTransaction(), tx5.data);
        assert.equal(queue.getNextTransaction(), tx4.data);
        assert.equal(queue.getNextTransaction(), tx3.data);
        assert.equal(queue.getNextTransaction(), tx2.data);
        assert.equal(queue.getNextTransaction(), tx1.data);
      });

      it("Should use the order to sort txs in FIFO mode", function () {
        const baseFee = 15n;

        // Effective miner fee: 96
        const tx1 = createTestTransaction({ gasPrice: 111 });

        // Effective miner fee: 100
        const tx2 = createTestTransaction({
          maxFeePerGas: 120,
          maxPriorityFeePerGas: 100,
        });

        // Effective miner fee: 110
        const tx3 = createTestTransaction({
          maxFeePerGas: 140,
          maxPriorityFeePerGas: 110,
        });

        const txs = [tx1, tx2, tx3];
        const queue = new TransactionQueue(
          makeOrderedTxMap(txs),
          "fifo",
          baseFee
        );

        assert.equal(queue.getNextTransaction(), tx1.data);
        assert.equal(queue.getNextTransaction(), tx2.data);
        assert.equal(queue.getNextTransaction(), tx3.data);
      });

      it("Should not include transactions from a sender whose next tx was discarded", function () {
        const baseFee = 20n;

        const senderWithFirstTxNotMined =
          "0x0000000000000000000000000000000000000001";

        const senderWithSecondTxNotMined =
          "0x0000000000000000000000000000000000000002";

        // Effective miner fee: 80
        const tx1 = createTestTransaction({
          gasPrice: 100,
        });

        // Effective miner fee: 79
        const tx2 = createTestTransaction({
          maxPriorityFeePerGas: 79,
          maxFeePerGas: 1000,
        });

        // Effective miner fee: 78
        const tx3 = createTestTransaction({
          maxPriorityFeePerGas: 97,
          maxFeePerGas: 98,
        });

        // Not mined
        // Effective miner fee: 77
        const tx4 = createTestTransaction({
          gasPrice: 97,
          from: senderWithFirstTxNotMined,
          nonce: 2,
        });

        // Discarded
        // Effective miner fee: 76
        const tx5 = createTestTransaction({
          gasPrice: 96,
          from: senderWithFirstTxNotMined,
          nonce: 3,
        });

        // Effective miner fee: 75
        const tx6 = createTestTransaction({
          gasPrice: 95,
          from: senderWithSecondTxNotMined,
          nonce: 1,
        });

        // Not mined
        // Effective miner fee: 74
        const tx7 = createTestTransaction({
          gasPrice: 94,
          from: senderWithSecondTxNotMined,
          nonce: 2,
        });

        // Discarded
        // Effective miner fee: 73
        const tx8 = createTestTransaction({
          gasPrice: 93,
          from: senderWithSecondTxNotMined,
          nonce: 3,
        });

        // Discarded
        // Effective miner fee: 72
        const tx9 = createTestTransaction({
          maxFeePerGas: 92,
          maxPriorityFeePerGas: 80,
          from: senderWithSecondTxNotMined,
          nonce: 4,
        });

        // Effective miner fee: 71
        const tx10 = createTestTransaction({
          gasPrice: 91,
        });

        const txs = [tx1, tx2, tx3, tx4, tx5, tx6, tx7, tx8, tx9, tx10];
        txs.sort(weakRandomComparator);
        const queue = new TransactionQueue(
          makeOrderedTxMap(txs),
          "priority",
          baseFee
        );

        assert.equal(queue.getNextTransaction(), tx1.data);
        assert.equal(queue.getNextTransaction(), tx2.data);
        assert.equal(queue.getNextTransaction(), tx3.data);
        assert.equal(queue.getNextTransaction(), tx4.data);
        queue.removeLastSenderTransactions();

        assert.equal(queue.getNextTransaction(), tx6.data);
        assert.equal(queue.getNextTransaction(), tx7.data);
        queue.removeLastSenderTransactions();

        assert.equal(queue.getNextTransaction(), tx10.data);
      });
    });
  });
});
