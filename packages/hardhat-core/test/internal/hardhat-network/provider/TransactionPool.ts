import StateManager from "@nomiclabs/ethereumjs-vm/dist/state/stateManager";
import { assert } from "chai";
import Account from "ethereumjs-account";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";

import {
  randomAddress,
  randomAddressBuffer,
} from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  OrderedTransaction,
  TransactionPool,
} from "../../../../src/internal/hardhat-network/provider/TransactionPool";
import { PStateManager } from "../../../../src/internal/hardhat-network/provider/types/PStateManager";
import { asPStateManager } from "../../../../src/internal/hardhat-network/provider/utils/asPStateManager";
import {
  assertEqualTransactionLists,
  assertEqualTransactionMaps,
} from "../helpers/assertEqualTransactionMaps";
import {
  createTestFakeTransaction,
  createTestTransaction,
} from "../helpers/blockchain";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../helpers/providers";

function flatten(array: any[]): any[] {
  if (array.length === 0) {
    return array;
  }
  if (Array.isArray(array[0])) {
    return flatten(array[0]).concat(flatten(array.slice(1)));
  }

  return [array[0]].concat(flatten(array.slice(1)));
}

/* Change this so this function transforms map into arrays on the EXPECTED part - not the ACTUAL part in the assert function */
function getAllTxs(pendingTxs: Map<string, OrderedTransaction[]>) {
  return flatten(Array.from(pendingTxs.values())).map((tx) => tx.data);
}

function compareOrderIds(left: OrderedTransaction, right: OrderedTransaction) {
  return left.orderId - right.orderId;
}

export function makeOrderedTxMap(
  txs: OrderedTransaction[]
): Map<string, OrderedTransaction[]> {
  const map: Map<string, OrderedTransaction[]> = new Map();
  txs.sort(compareOrderIds).forEach((tx) => {
    const address = bufferToHex(tx.data.getSenderAddress());
    const txList = map.get(address) ?? [];
    txList.push(tx);
    map.set(address, txList);
  });
  return map;
}

describe("Transaction Pool", () => {
  const blockGasLimit = new BN(10000000);
  let stateManager: PStateManager;
  let txPool: TransactionPool;

  beforeEach(() => {
    stateManager = asPStateManager(new StateManager());
    txPool = new TransactionPool(stateManager, blockGasLimit);
  });

  describe("addTransaction", () => {
    describe("for a single transaction sender", () => {
      const address = randomAddressBuffer();

      describe("when the first transaction is added", () => {
        describe("when transaction nonce is equal to account nonce", () => {
          it("adds the transaction to pending", async () => {
            await stateManager.putAccount(
              address,
              new Account({ nonce: new BN(0) })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            await txPool.addTransaction(tx);

            const pendingTxs = txPool.getPendingTransactions();
            assert.lengthOf(getAllTxs(pendingTxs), 1);
            assert.deepEqual(getAllTxs(pendingTxs)[0].raw, tx.raw);
          });
        });

        describe("when transaction nonce is higher than account nonce", () => {
          it("queues the transaction", async () => {
            await stateManager.putAccount(
              address,
              new Account({ nonce: new BN(0) })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 3,
            });
            await txPool.addTransaction(tx);

            const pendingTxs = txPool.getPendingTransactions();
            assert.lengthOf(getAllTxs(pendingTxs), 0);
          });
        });

        describe("when transaction nonce is lower than account nonce", () => {
          it("throws an error", async () => {
            await stateManager.putAccount(
              address,
              new Account({ nonce: new BN(1) })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });

            await assert.isRejected(
              txPool.addTransaction(tx),
              Error,
              "Nonce too low"
            );
          });
        });
      });

      describe("when a subsequent transaction is added", () => {
        beforeEach(async () => {
          await stateManager.putAccount(
            address,
            new Account({ nonce: new BN(0) })
          );
        });

        describe("when transaction nonce is equal to account executable nonce", () => {
          it("adds the transaction to pending", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 1,
            });
            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              getAllTxs(pendingTxs).map((tx) => tx.raw),
              [tx1, tx2].map((tx) => tx.raw)
            );
          });

          it("moves queued transactions with subsequent nonces to pending", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
            });
            const tx3 = createTestFakeTransaction({
              from: address,
              nonce: 1,
            });

            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);
            await txPool.addTransaction(tx3);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              getAllTxs(pendingTxs).map((tx) => tx.raw),
              [tx1, tx2, tx3].map((tx) => tx.raw)
            );
          });

          it("does not move queued transactions to pending which have too high nonces", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
            });
            const tx3 = createTestFakeTransaction({
              from: address,
              nonce: 4,
            });
            const tx4 = createTestFakeTransaction({
              from: address,
              nonce: 1,
            });

            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);
            await txPool.addTransaction(tx3);
            await txPool.addTransaction(tx4);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              getAllTxs(pendingTxs).map((tx) => tx.raw),
              [tx1, tx2, tx4].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is higher than account executable nonce", () => {
          it("queues the transaction", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
            });
            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              getAllTxs(pendingTxs).map((tx) => tx.raw),
              [tx1].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is lower than account executable nonce", () => {
          it("throws an error", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            await txPool.addTransaction(tx1);

            await assert.isRejected(
              txPool.addTransaction(tx2),
              Error,
              "Nonce too low"
            );
          });
        });
      });
    });

    describe("for multiple transaction senders", () => {
      const address1 = randomAddressBuffer();
      const address2 = randomAddressBuffer();

      beforeEach(async () => {
        await stateManager.putAccount(
          address1,
          new Account({ nonce: new BN(0) })
        );
        await stateManager.putAccount(
          address2,
          new Account({ nonce: new BN(0) })
        );
      });

      it("can add transactions from many senders", async () => {
        const tx1 = createTestFakeTransaction({
          from: address1,
          nonce: 0,
        });
        const tx2 = createTestFakeTransaction({
          from: address2,
          nonce: 0,
        });

        await txPool.addTransaction(tx1);
        await txPool.addTransaction(tx2);

        const pendingTxs = txPool.getPendingTransactions();

        assert.sameDeepMembers(
          getAllTxs(pendingTxs).map((tx) => tx.raw),
          [tx1, tx2].map((tx) => tx.raw)
        );
      });

      describe("does not mix up queued transactions from different senders", () => {
        it("missing transaction", async () => {
          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
          });

          await txPool.addTransaction(tx1);
          await txPool.addTransaction(tx2);
          await txPool.addTransaction(tx3);
          await txPool.addTransaction(tx4);

          const pendingTxs = txPool.getPendingTransactions();

          assert.sameDeepMembers(
            getAllTxs(pendingTxs).map((tx) => tx.raw),
            [tx1, tx2, tx4].map((tx) => tx.raw)
          );
        });

        it("all transactions are present", async () => {
          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
          });
          const tx5 = createTestFakeTransaction({
            from: address1,
            nonce: 1,
          });

          await txPool.addTransaction(tx1);
          await txPool.addTransaction(tx2);
          await txPool.addTransaction(tx3);
          await txPool.addTransaction(tx4);
          await txPool.addTransaction(tx5);

          const pendingTxs = txPool.getPendingTransactions();

          assert.sameDeepMembers(
            getAllTxs(pendingTxs).map((tx) => tx.raw),
            [tx1, tx2, tx3, tx4, tx5].map((tx) => tx.raw)
          );
        });

        it("some transactions are present", async () => {
          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 2,
          });
          const tx5 = createTestFakeTransaction({
            from: address1,
            nonce: 3,
          });
          const tx6 = createTestFakeTransaction({
            from: address2,
            nonce: 3,
          });
          const tx7 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
          });

          await txPool.addTransaction(tx1);
          await txPool.addTransaction(tx2);
          await txPool.addTransaction(tx3);
          await txPool.addTransaction(tx4);
          await txPool.addTransaction(tx5);
          await txPool.addTransaction(tx6);
          await txPool.addTransaction(tx7);

          const pendingTxs = txPool.getPendingTransactions();

          assert.sameDeepMembers(
            getAllTxs(pendingTxs).map((tx) => tx.raw),
            [tx1, tx2, tx4, tx6, tx7].map((tx) => tx.raw)
          );
        });
      });
    });

    describe("validation", () => {
      it("throws an error if transaction's gas limit exceeds block gas limit", () => {
        const gasLimit = 15000000;
        const tx = createTestFakeTransaction({ gasLimit });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${blockGasLimit}`
        );
      });

      it("throws an error if transaction is not signed", async () => {
        const tx = createTestTransaction();
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "Invalid Signature"
        );
      });

      it("throws and error if transaction's nonce is too low", async () => {
        const address = randomAddress();
        const tx1 = createTestFakeTransaction({
          from: address,
          nonce: 0,
        });
        const tx2 = createTestFakeTransaction({
          from: address,
          nonce: 0,
        });
        await txPool.addTransaction(tx1);

        await assert.isRejected(
          txPool.addTransaction(tx2),
          Error,
          "Nonce too low"
        );
      });

      it("throws an error if transaction's gas limit is greater than transaction's base fee", () => {
        const gasLimit = 100;
        const tx = createTestFakeTransaction({ gasLimit });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          `Transaction requires at least ${tx.getBaseFee()} gas but got ${gasLimit}`
        );
      });

      it("throws an error if creating a contract and no data is provided", () => {
        const tx = createTestFakeTransaction({
          to: undefined,
        });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "contract creation without any data provided"
        );
      });

      it("throws an error if sender doesn't have enough ether on their balance", async () => {
        const address = randomAddressBuffer();
        await stateManager.putAccount(
          address,
          new Account({ nonce: new BN(0), balance: toBuffer(0) })
        );

        const tx = createTestFakeTransaction({
          gasPrice: 900,
          value: 5,
        });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "sender doesn't have enough funds to send tx"
        );
      });
    });
  });

  describe("getExecutableNonce", () => {
    const address = randomAddressBuffer();

    beforeEach(async () => {
      await stateManager.putAccount(address, new Account({ nonce: new BN(0) }));
    });

    it("returns the current executable nonce", async () => {
      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
      });

      await txPool.addTransaction(tx1);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(1)));
    });

    it("is not affected by queued transactions", async () => {
      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
      });
      const tx2 = createTestFakeTransaction({
        from: address,
        nonce: 2,
      });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(1)));
    });

    it("returns correct nonce after all queued transactions are moved to pending", async () => {
      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
      });
      const tx2 = createTestFakeTransaction({
        from: address,
        nonce: 2,
      });
      const tx3 = createTestFakeTransaction({
        from: address,
        nonce: 1,
      });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx3);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(3)));
    });

    it("returns correct nonce after some queued transactions are moved to pending", async () => {
      const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
      const tx2 = createTestFakeTransaction({ from: address, nonce: 2 });
      const tx3 = createTestFakeTransaction({ from: address, nonce: 5 });
      const tx4 = createTestFakeTransaction({ from: address, nonce: 1 });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx3);
      await txPool.addTransaction(tx4);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(3)));
    });
  });

  describe("clean", () => {
    const address1 = toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]);
    const address2 = toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]);
    beforeEach(async () => {
      await stateManager.putAccount(
        address1,
        new Account({ nonce: 0, balance: new BN(10).pow(new BN(18)) })
      );
      await stateManager.putAccount(
        address2,
        new Account({ nonce: 0, balance: new BN(10).pow(new BN(18)) })
      );
    });

    it("removes pending transaction when it's gas limit exceeds block gas limit", async () => {
      const tx1 = createTestTransaction({ nonce: 0, gasLimit: 9500000 });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      txPool.setBlockGasLimit(5000000);

      await txPool.clean();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionLists(
        pendingTransactions.get(DEFAULT_ACCOUNTS_ADDRESSES[0]) ?? [],
        []
      );
    });

    it("removes queued transaction when it's gas limit exceeds block gas limit", async () => {
      const tx1 = createTestTransaction({ nonce: 1, gasLimit: 9500000 });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      txPool.setBlockGasLimit(5000000);

      await txPool.clean();
      const queuedTransactions = txPool.getQueuedTransactions();

      assertEqualTransactionLists(
        queuedTransactions.get(DEFAULT_ACCOUNTS_ADDRESSES[0]) ?? [],
        []
      );
    });

    it("removes pending transactions with too low nonces", async () => {
      const tx1 = createTestTransaction({ nonce: 0, gasLimit: 30000 });
      const tx2 = createTestTransaction({ nonce: 1, gasLimit: 30000 });
      const tx3 = createTestTransaction({ nonce: 0, gasLimit: 30000 });
      const tx4 = createTestTransaction({ nonce: 1, gasLimit: 30000 });

      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
      tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
      tx3.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));
      tx4.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx3);
      await txPool.addTransaction(tx4);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 1, balance: new BN(10).pow(new BN(18)) })
      );
      await stateManager.putAccount(
        address2,
        new Account({ nonce: 1, balance: new BN(10).pow(new BN(18)) })
      );

      await txPool.clean();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(
        pendingTransactions,
        makeOrderedTxMap([
          { orderId: 1, data: tx2 },
          { orderId: 1, data: tx4 },
        ])
      );
    });

    it("removes pending transaction when sender doesn't have enough ether to make the transaction", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        gasLimit: 30000,
        gasPrice: 500,
      });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 0, balance: new BN(0) })
      );

      await txPool.clean();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionLists(
        pendingTransactions.get(DEFAULT_ACCOUNTS_ADDRESSES[0]) ?? [],
        []
      );
    });

    it("removes queued transaction when sender doesn't have enough ether to make the transaction", async () => {
      const tx1 = createTestTransaction({
        nonce: 2,
        gasLimit: 30000,
        gasPrice: 500,
      });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 0, balance: new BN(0) })
      );

      await txPool.clean();
      const queuedTransactions = txPool.getQueuedTransactions();

      assertEqualTransactionLists(
        queuedTransactions.get(DEFAULT_ACCOUNTS_ADDRESSES[0]) ?? [],
        []
      );
    });
  });

  describe("setBlockGasLimit", () => {
    it("sets a new block gas limit when new limit is a number", () => {
      assert.isTrue(txPool.getBlockGasLimit().eq(new BN(10000000)));
      txPool.setBlockGasLimit(15000000);
      assert.isTrue(txPool.getBlockGasLimit().eq(new BN(15000000)));
    });

    it("sets a new block gas limit when new limit is a BN", () => {
      assert.isTrue(txPool.getBlockGasLimit().eq(new BN(10000000)));
      txPool.setBlockGasLimit(new BN(15000000));
      assert.isTrue(txPool.getBlockGasLimit().eq(new BN(15000000)));
    });
  });

  describe("snapshot", () => {
    it("increases tx pool's current snapshot id after a snapshot", () => {
      txPool.snapshot();
      assert.equal(txPool.getCurrentSnapshotId(), 1);
    });

    it("adds snapshot to the snapshot map", () => {
      assert.equal(txPool.getSnapshotIdToState().size, 0);
      txPool.snapshot();
      assert.equal(txPool.getSnapshotIdToState().size, 1);
    });

    it("can snapshot and then revert to previous state", () => {
      const newBlockGasLimit = new BN(5000000);
      const snapshotId = txPool.snapshot();
      txPool.setBlockGasLimit(newBlockGasLimit);
      txPool.revert(snapshotId);
      assert.isNotTrue(txPool.getBlockGasLimit().eq(newBlockGasLimit));
    });
  });

  describe("revert", () => {
    it("throws if snapshot with given ID doesn't exist", async () => {
      assert.throws(() => txPool.revert(5), "There's no snapshot with such ID");
    });

    it("can revert to previous state", () => {
      const newBlockGasLimit = new BN(5000000);
      const snapshotId = txPool.snapshot();
      txPool.setBlockGasLimit(newBlockGasLimit);
      txPool.revert(snapshotId);
      assert.isNotTrue(txPool.getBlockGasLimit().eq(newBlockGasLimit));
    });
  });
});
