import StateManager from "@nomiclabs/ethereumjs-vm/dist/state/stateManager";
import { assert } from "chai";
import Account from "ethereumjs-account";
import Common from "ethereumjs-common";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";

import { InvalidInputError } from "../../../../src/internal/hardhat-network/provider/errors";
import {
  randomAddress,
  randomAddressBuffer,
} from "../../../../src/internal/hardhat-network/provider/fork/random";
import { TxPool } from "../../../../src/internal/hardhat-network/provider/TxPool";
import { PStateManager } from "../../../../src/internal/hardhat-network/provider/types/PStateManager";
import { asPStateManager } from "../../../../src/internal/hardhat-network/provider/utils/asPStateManager";
import { txMapToArray } from "../../../../src/internal/hardhat-network/provider/utils/txMapToArray";
import { assertEqualTransactionMaps } from "../helpers/assertEqualTransactionMaps";
import {
  createTestFakeTransaction,
  createTestOrderedTransaction,
  createTestTransaction,
} from "../helpers/blockchain";
import { makeOrderedTxMap } from "../helpers/makeOrderedTxMap";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../helpers/providers";

describe("Tx Pool", () => {
  const blockGasLimit = new BN(10_000_000);
  let stateManager: PStateManager;
  let txPool: TxPool;

  beforeEach(() => {
    stateManager = asPStateManager(new StateManager());
    const common = new Common("mainnet", "muirGlacier");
    txPool = new TxPool(stateManager, blockGasLimit, common);
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
            assert.lengthOf(txMapToArray(pendingTxs), 1);
            assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx.raw);
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
            assert.equal(pendingTxs.size, 0);
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
              txMapToArray(pendingTxs).map((tx) => tx.raw),
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
              txMapToArray(pendingTxs).map((tx) => tx.raw),
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
              txMapToArray(pendingTxs).map((tx) => tx.raw),
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
              txMapToArray(pendingTxs).map((tx) => tx.raw),
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
          txMapToArray(pendingTxs).map((tx) => tx.raw),
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
            txMapToArray(pendingTxs).map((tx) => tx.raw),
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
            txMapToArray(pendingTxs).map((tx) => tx.raw),
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
            txMapToArray(pendingTxs).map((tx) => tx.raw),
            [tx1, tx2, tx4, tx6, tx7].map((tx) => tx.raw)
          );
        });
      });
    });

    describe("validation", () => {
      it("rejects if transaction is already pending in the tx pool", async () => {
        const to = randomAddressBuffer();
        const tx1 = createTestTransaction({ to, gasLimit: 21_000 });
        const tx2 = createTestTransaction({ to, gasLimit: 21_000 });

        tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
        tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

        await txPool.addTransaction(tx1);

        await assert.isRejected(
          txPool.addTransaction(tx2),
          InvalidInputError,
          `Known transaction: ${bufferToHex(tx1.hash())}`
        );
      });

      it("rejects if transaction is already queued in the tx pool", async () => {
        const to = randomAddressBuffer();
        const tx1 = createTestTransaction({ to, nonce: 1, gasLimit: 21_000 });
        const tx2 = createTestTransaction({ to, nonce: 1, gasLimit: 21_000 });

        tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
        tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

        await txPool.addTransaction(tx1);

        await assert.isRejected(
          txPool.addTransaction(tx2),
          InvalidInputError,
          `Known transaction: ${bufferToHex(tx1.hash())}`
        );
      });

      it("rejects if transaction with given nonce is already queued in the tx pool", async () => {
        const from = randomAddressBuffer();
        const to = randomAddressBuffer();
        const tx1 = createTestFakeTransaction({ nonce: 1, from, to });
        const tx2 = createTestFakeTransaction({ nonce: 1, from, to: from });

        await txPool.addTransaction(tx1);
        await assert.isRejected(
          txPool.addTransaction(tx2),
          InvalidInputError,
          "Transaction with nonce 1 already exists in transaction pool"
        );
      });

      it("rejects if transaction's gas limit exceeds block gas limit", async () => {
        const gasLimit = 15_000_000;
        const tx = createTestFakeTransaction({ gasLimit });
        await assert.isRejected(
          txPool.addTransaction(tx),
          InvalidInputError,
          `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${blockGasLimit}`
        );
      });

      it("rejects if transaction is not signed", async () => {
        const tx = createTestTransaction();
        await assert.isRejected(
          txPool.addTransaction(tx),
          InvalidInputError,
          "Invalid Signature"
        );
      });

      it("rejects if transaction's nonce is too low", async () => {
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
          InvalidInputError,
          "Nonce too low"
        );
      });

      it("rejects if transaction's gas limit is lower than transaction's base fee", async () => {
        const gasLimit = 100;
        const tx = createTestFakeTransaction({ gasLimit });
        await assert.isRejected(
          txPool.addTransaction(tx),
          InvalidInputError,
          `Transaction requires at least 21000 gas but got ${gasLimit}`
        );
      });

      it("rejects if creating a contract and no data is provided", async () => {
        const tx = createTestFakeTransaction({
          to: undefined,
        });
        await assert.isRejected(
          txPool.addTransaction(tx),
          InvalidInputError,
          "contract creation without any data provided"
        );
      });

      it("rejects if sender doesn't have enough ether on their balance", async () => {
        const address = randomAddressBuffer();
        await stateManager.putAccount(
          address,
          new Account({ nonce: new BN(0), balance: toBuffer(0) })
        );

        const tx = createTestFakeTransaction({
          gasPrice: 900,
          value: 5,
        });
        await assert.isRejected(
          txPool.addTransaction(tx),
          InvalidInputError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });

    describe("assigning order ids", () => {
      const address = randomAddressBuffer();

      beforeEach(async () => {
        await stateManager.putAccount(
          address,
          new Account({ nonce: new BN(0) })
        );
      });

      it("saves the order in which transactions were added", async () => {
        const txA = createTestOrderedTransaction({
          from: address,
          orderId: 0,
          nonce: 1,
        });
        const txB = createTestOrderedTransaction({
          from: address,
          orderId: 1,
          nonce: 4,
        });
        const txC = createTestOrderedTransaction({
          from: address,
          orderId: 2,
          nonce: 2,
        });
        const txD = createTestOrderedTransaction({
          from: address,
          orderId: 3,
          nonce: 0,
        });

        await txPool.addTransaction(txA.data);
        await txPool.addTransaction(txB.data);
        await txPool.addTransaction(txC.data);
        await txPool.addTransaction(txD.data);

        const pendingTxs = txPool.getPendingTransactions();
        assertEqualTransactionMaps(
          pendingTxs,
          makeOrderedTxMap([txD, txA, txC])
        );
      });
    });
  });

  describe("getTransactionByHash", () => {
    it("returns a transaction from pending based on hash", async () => {
      const tx = createTestFakeTransaction({
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: randomAddressBuffer(),
        nonce: 0,
        gasLimit: 21_000,
      });

      await txPool.addTransaction(tx);

      const txFromTxPool = txPool.getTransactionByHash(tx.hash(false));

      assert.deepEqual(txFromTxPool?.data.raw, tx.raw);
    });

    it("returns a transaction from queued based on hash", async () => {
      const tx = createTestFakeTransaction({
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: randomAddressBuffer(),
        nonce: 2,
        gasLimit: 21_000,
      });

      await txPool.addTransaction(tx);

      const txFromTxPool = txPool.getTransactionByHash(tx.hash(false));

      assert.deepEqual(txFromTxPool?.data.raw, tx.raw);
    });

    it("returns undefined if transaction is not in pending anymore", async () => {
      const tx = createTestTransaction({
        to: randomAddressBuffer(),
        nonce: 0,
        gasLimit: 21_000,
      });

      tx.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx);

      const oldTxFromTxPool = txPool.getTransactionByHash(tx.hash());

      assert.deepEqual(oldTxFromTxPool!.data.raw, tx.raw);

      await stateManager.putAccount(
        tx.getSenderAddress(),
        new Account({ nonce: 1, balance: new BN(10).pow(new BN(18)) })
      );

      await txPool.updatePendingAndQueued();

      const actualTxFromTxPool = txPool.getTransactionByHash(tx.hash());

      assert.isUndefined(actualTxFromTxPool);
    });

    it("returns undefined if transaction is not in queued anymore", async () => {
      const tx = createTestTransaction({
        to: randomAddressBuffer(),
        nonce: 2,
        gasLimit: 21_000,
      });

      tx.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx);

      const oldTxFromTxPool = txPool.getTransactionByHash(tx.hash());

      assert.deepEqual(oldTxFromTxPool!.data.raw, tx.raw);

      await stateManager.putAccount(
        tx.getSenderAddress(),
        new Account({ nonce: 3, balance: new BN(10).pow(new BN(18)) })
      );

      await txPool.updatePendingAndQueued();

      const actualTxFromTxPool = txPool.getTransactionByHash(tx.hash());

      assert.isUndefined(actualTxFromTxPool);
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

  describe("updatePendingAndQueued", () => {
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
      const tx1 = createTestTransaction({ nonce: 0, gasLimit: 9_500_000 });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      txPool.setBlockGasLimit(5_000_000);

      await txPool.updatePendingAndQueued();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([]));
    });

    it("removes queued transaction when it's gas limit exceeds block gas limit", async () => {
      const tx1 = createTestTransaction({ nonce: 1, gasLimit: 9_500_000 });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      txPool.setBlockGasLimit(5_000_000);

      await txPool.updatePendingAndQueued();
      const queuedTransactions = txPool.getQueuedTransactions();

      assertEqualTransactionMaps(queuedTransactions, makeOrderedTxMap([]));
    });

    it("removes pending transactions with too low nonces", async () => {
      const tx1 = createTestOrderedTransaction({
        orderId: 0,
        nonce: 0,
        gasLimit: 30_000,
        from: address1,
      });
      const tx2 = createTestOrderedTransaction({
        orderId: 1,
        nonce: 1,
        gasLimit: 30_000,
        from: address1,
      });
      const tx3 = createTestOrderedTransaction({
        orderId: 2,
        nonce: 0,
        gasLimit: 30_000,
        from: address2,
      });
      const tx4 = createTestOrderedTransaction({
        orderId: 3,
        nonce: 1,
        gasLimit: 30_000,
        from: address2,
      });

      await txPool.addTransaction(tx1.data);
      await txPool.addTransaction(tx2.data);
      await txPool.addTransaction(tx3.data);
      await txPool.addTransaction(tx4.data);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 1, balance: new BN(10).pow(new BN(18)) })
      );
      await stateManager.putAccount(
        address2,
        new Account({ nonce: 1, balance: new BN(10).pow(new BN(18)) })
      );

      await txPool.updatePendingAndQueued();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(
        pendingTransactions,
        makeOrderedTxMap([tx2, tx4])
      );
    });

    it("removes pending transaction when sender doesn't have enough ether to make the transaction", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        gasLimit: 30_000,
        gasPrice: 500,
      });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 0, balance: new BN(0) })
      );

      await txPool.updatePendingAndQueued();
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([]));
    });

    it("removes queued transaction when sender doesn't have enough ether to make the transaction", async () => {
      const tx1 = createTestTransaction({
        nonce: 2,
        gasLimit: 30_000,
        gasPrice: 500,
      });
      tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(tx1);

      await stateManager.putAccount(
        address1,
        new Account({ nonce: 0, balance: new BN(0) })
      );

      await txPool.updatePendingAndQueued();
      const queuedTransactions = txPool.getQueuedTransactions();

      assertEqualTransactionMaps(queuedTransactions, makeOrderedTxMap([]));
    });

    it("moves pending transactions to queued if needed", async () => {
      const sender = randomAddressBuffer();
      await stateManager.putAccount(
        sender,
        new Account({ balance: new BN(10).pow(new BN(20)) })
      );

      const tx0 = createTestFakeTransaction({
        nonce: 0,
        gasLimit: 100_000,
        from: sender,
      });
      const tx1 = createTestFakeTransaction({
        nonce: 1,
        gasLimit: 200_000,
        from: sender,
      });
      const tx2 = createTestFakeTransaction({
        nonce: 2,
        gasLimit: 100_000,
        from: sender,
      });
      const tx4 = createTestFakeTransaction({
        nonce: 4,
        gasLimit: 100_000,
        from: sender,
      });
      const tx5 = createTestFakeTransaction({
        nonce: 5,
        gasLimit: 100_000,
        from: sender,
      });

      await txPool.addTransaction(tx0);
      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx4);
      await txPool.addTransaction(tx5);

      // pending: [0, 1, 2]
      // queued: [4, 5]
      let pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 3);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx0.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[1].raw, tx1.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[2].raw, tx2.raw);

      let queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 2);
      assert.deepEqual(txMapToArray(queuedTxs)[0].raw, tx4.raw);
      assert.deepEqual(txMapToArray(queuedTxs)[1].raw, tx5.raw);

      // this should drop tx1
      txPool.setBlockGasLimit(150_000);
      await txPool.updatePendingAndQueued();

      // pending: [0]
      // queued: [2, 4, 5]
      pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 1);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx0.raw);

      queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 3);
      assert.deepEqual(txMapToArray(queuedTxs)[0].raw, tx4.raw);
      assert.deepEqual(txMapToArray(queuedTxs)[1].raw, tx5.raw);
      assert.deepEqual(txMapToArray(queuedTxs)[2].raw, tx2.raw);
    });

    it("handles dropped transactions properly", async () => {
      const sender = randomAddressBuffer();

      const tx1 = createTestFakeTransaction({
        nonce: 0,
        gasLimit: 100_000,
        from: sender,
      });
      await txPool.addTransaction(tx1);

      let pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 1);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx1.raw);

      let queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);

      txPool.setBlockGasLimit(90_000);
      await txPool.updatePendingAndQueued();

      const tx2 = createTestFakeTransaction({
        gasLimit: 80_000,
        from: sender,
        nonce: 0,
      });
      await txPool.addTransaction(tx2);

      pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 1);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx2.raw);

      queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);
    });

    it("accepts transactions after a no-op update", async function () {
      const sender = randomAddressBuffer();
      await stateManager.putAccount(
        sender,
        new Account({ balance: new BN(10).pow(new BN(20)) })
      );

      const tx0 = createTestFakeTransaction({
        nonce: 0,
        from: sender,
      });
      const tx1 = createTestFakeTransaction({
        nonce: 1,
        from: sender,
      });
      const tx2 = createTestFakeTransaction({
        nonce: 2,
        from: sender,
      });

      await txPool.addTransaction(tx0);
      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      // pending: [0, 1, 2]
      // queued: [0]
      let pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 3);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx0.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[1].raw, tx1.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[2].raw, tx2.raw);

      let queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);

      // this should drop tx1
      txPool.setBlockGasLimit(100_000);
      await txPool.updatePendingAndQueued();

      const tx3 = createTestFakeTransaction({
        nonce: 3,
        from: sender,
      });
      await txPool.addTransaction(tx3);

      // pending: [0, 1, 2, 3]
      // queued: []
      pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 4);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx0.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[1].raw, tx1.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[2].raw, tx2.raw);
      assert.deepEqual(txMapToArray(pendingTxs)[3].raw, tx3.raw);

      queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);
    });
  });

  describe("setBlockGasLimit", () => {
    it("sets a new block gas limit when new limit is a number", () => {
      assert.equal(txPool.getBlockGasLimit().toNumber(), 10_000_000);
      txPool.setBlockGasLimit(15_000_000);
      assert.equal(txPool.getBlockGasLimit().toNumber(), 15_000_000);
    });

    it("sets a new block gas limit when new limit is a BN", () => {
      assert.equal(txPool.getBlockGasLimit().toNumber(), 10_000_000);
      txPool.setBlockGasLimit(new BN(15_000_000));
      assert.equal(txPool.getBlockGasLimit().toNumber(), 15_000_000);
    });

    it("makes the new block gas limit actually used for validating added transactions", async () => {
      txPool.setBlockGasLimit(21_000);
      const tx = createTestFakeTransaction({ gasLimit: 50_000 });
      await assert.isRejected(
        txPool.addTransaction(tx),
        InvalidInputError,
        "Transaction gas limit is 50000 and exceeds block gas limit of 21000"
      );
    });
  });

  describe("snapshot", () => {
    it("returns a snapshot id", () => {
      const id = txPool.snapshot();
      assert.isNumber(id);
    });

    it("returns a bigger snapshot id if the state changed", async () => {
      const id1 = txPool.snapshot();
      const tx = createTestFakeTransaction();
      await txPool.addTransaction(tx);
      const id2 = txPool.snapshot();
      assert.isAbove(id2, id1);
    });
  });

  describe("revert", () => {
    it("throws if snapshot with given ID doesn't exist", async () => {
      assert.throws(
        () => txPool.revert(5),
        Error,
        "There's no snapshot with such ID"
      );
    });

    it("reverts to the previous state of transactions", async () => {
      const address = randomAddressBuffer();
      await stateManager.putAccount(address, new Account({ nonce: new BN(0) }));
      const tx1 = createTestOrderedTransaction({
        from: address,
        orderId: 0,
        nonce: 0,
      });
      await txPool.addTransaction(tx1.data);

      const id = txPool.snapshot();

      const tx2 = createTestOrderedTransaction({
        from: address,
        orderId: 1,
        nonce: 1,
      });
      await txPool.addTransaction(tx2.data);

      txPool.revert(id);
      const pendingTransactions = txPool.getPendingTransactions();
      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([tx1]));
    });

    it("reverts to the previous state of block gas limit", () => {
      const id = txPool.snapshot();
      txPool.setBlockGasLimit(new BN(5_000_000));
      txPool.revert(id);
      assert.equal(
        txPool.getBlockGasLimit().toNumber(),
        blockGasLimit.toNumber()
      );
    });
  });

  describe("hasPendingTransactions", () => {
    it("returns false when there are no pending transactions", async () => {
      assert.isFalse(txPool.hasPendingTransactions());
    });

    it("returns true when there is at least one pending transaction", async () => {
      const tx1 = createTestFakeTransaction({ nonce: 0 });
      const tx2 = createTestFakeTransaction({ nonce: 0 });

      await txPool.addTransaction(tx1);
      assert.isTrue(txPool.hasPendingTransactions());

      await txPool.addTransaction(tx2);
      assert.isTrue(txPool.hasPendingTransactions());
    });

    it("returns false when there are only queued transactions", async () => {
      const tx1 = createTestFakeTransaction({ nonce: 1 });
      const tx2 = createTestFakeTransaction({ nonce: 1 });
      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      assert.isFalse(txPool.hasPendingTransactions());
    });
  });
});
