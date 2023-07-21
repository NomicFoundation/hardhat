import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  StateManager,
  DefaultStateManager,
} from "@nomicfoundation/ethereumjs-statemanager";
import {
  Account,
  Address,
  bufferToHex,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { InvalidInputError } from "../../../../src/internal/core/providers/errors";
import { randomAddress } from "../../../../src/internal/hardhat-network/provider/utils/random";
import { TxPool } from "../../../../src/internal/hardhat-network/provider/TxPool";
import { txMapToArray } from "../../../../src/internal/hardhat-network/provider/utils/txMapToArray";
import { assertEqualTransactionMaps } from "../helpers/assertEqualTransactionMaps";
import {
  createTestFakeTransaction,
  createTestOrderedTransaction,
  createTestTransaction,
  createUnsignedTestTransaction,
} from "../helpers/blockchain";
import { makeOrderedTxMap } from "../helpers/makeOrderedTxMap";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../helpers/providers";

describe("Tx Pool", () => {
  const blockGasLimit = 10_000_000n;
  let stateManager: StateManager;
  let txPool: TxPool;

  beforeEach(() => {
    stateManager = new DefaultStateManager();
    const common = new Common({ chain: "mainnet" });
    txPool = new TxPool(blockGasLimit, common);
  });

  describe("addTransaction", () => {
    describe("for a single transaction sender", () => {
      const address = randomAddress();

      describe("when the first transaction is added", () => {
        describe("when transaction nonce is equal to account nonce", () => {
          it("adds the transaction to pending", async () => {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ nonce: 0n })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.lengthOf(txMapToArray(pendingTxs), 1);
            assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx.raw);
          });
        });

        describe("when transaction nonce is higher than account nonce", () => {
          it("queues the transaction", async () => {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ nonce: 0n })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 3,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.equal(pendingTxs.size, 0);
          });
        });

        describe("when transaction nonce is lower than account nonce", () => {
          it("throws an error", async () => {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ nonce: 1n })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });

            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx
              ),
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
            Account.fromAccountData({ nonce: 0n })
          );
        });

        describe("when transaction nonce is equal to account next nonce", () => {
          it("adds the transaction to pending", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 1,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2
            );

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

            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx3
            );

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

            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx3
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx4
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              txMapToArray(pendingTxs).map((tx) => tx.raw),
              [tx1, tx2, tx4].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is higher than account next nonce", () => {
          it("queues the transaction", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              txMapToArray(pendingTxs).map((tx) => tx.raw),
              [tx1].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is lower than account's nonce", () => {
          it("throws an error", async () => {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ nonce: 1 })
            );
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
            });
            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx
              ),
              Error,
              "Nonce too low"
            );
          });
        });

        describe("when a transaction is replaced", () => {
          it("should replace a pending transaction", async function () {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ balance: 10n ** 18n })
            );
            const tx1a = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasPrice: 5,
            });
            const tx1b = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasPrice: 10,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1a
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1b
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              txMapToArray(pendingTxs).map((tx) => tx.raw),
              [tx1b].map((tx) => tx.raw)
            );
          });

          it("should replace a queued transaction", async function () {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ balance: 10n ** 18n })
            );
            const tx2a = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasPrice: 5,
            });
            const tx2b = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasPrice: 10,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2a
            );
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2b
            );

            const queuedTxs = txPool.getQueuedTransactions();

            assert.sameDeepMembers(
              txMapToArray(queuedTxs).map((tx) => tx.raw),
              [tx2b].map((tx) => tx.raw)
            );
          });

          it("should throw if the new gas price is not at least 10% higher (pending tx)", async function () {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ balance: 10n ** 18n })
            );

            const tx1a = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasPrice: 20,
            });

            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx1a
            );

            const tx1b = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasPrice: 21,
            });

            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx1b
              ),
              InvalidInputError,
              `Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 22 is necessary to replace the existing transaction with nonce 0.`
            );

            const tx1c = createTestFakeTransaction({
              from: address,
              nonce: 0,
              maxFeePerGas: 21,
              maxPriorityFeePerGas: 21,
            });

            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx1c
              ),
              InvalidInputError,
              `Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 22 is necessary to replace the existing transaction with nonce 0.`
            );

            const tx1d = createTestFakeTransaction({
              from: address,
              nonce: 0,
              maxFeePerGas: 100000,
              maxPriorityFeePerGas: 21,
            });

            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx1d
              ),
              InvalidInputError,
              `Replacement transaction underpriced. A gasPrice/maxPriorityFeePerGas of at least 22 is necessary to replace the existing transaction with nonce 0.`
            );

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              txMapToArray(pendingTxs).map((tx) => tx.raw),
              [tx1a].map((tx) => tx.raw)
            );
          });

          it("should throw if the new gas price is not at least 10% higher (queued tx)", async function () {
            await stateManager.putAccount(
              address,
              Account.fromAccountData({ balance: 10n ** 18n })
            );
            const tx2a = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasPrice: 20,
            });
            const tx2b = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasPrice: 21,
            });
            await txPool.addTransaction(
              stateManager.getAccount.bind(stateManager),
              tx2a
            );
            await assert.isRejected(
              txPool.addTransaction(
                stateManager.getAccount.bind(stateManager),
                tx2b
              ),
              InvalidInputError,
              `Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 22 is necessary to replace the existing transaction with nonce 1`
            );

            const queuedTxs = txPool.getQueuedTransactions();

            assert.sameDeepMembers(
              txMapToArray(queuedTxs).map((tx) => tx.raw),
              [tx2a].map((tx) => tx.raw)
            );
          });
        });
      });
    });

    describe("for multiple transaction senders", () => {
      const address1 = randomAddress();
      const address2 = randomAddress();

      beforeEach(async () => {
        await stateManager.putAccount(
          address1,
          Account.fromAccountData({ nonce: 0n })
        );
        await stateManager.putAccount(
          address2,
          Account.fromAccountData({ nonce: 0n })
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

        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          tx1
        );
        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          tx2
        );

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

          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx1
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx2
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx3
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx4
          );

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

          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx1
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx2
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx3
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx4
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx5
          );

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

          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx1
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx2
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx3
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx4
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx5
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx6
          );
          await txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx7
          );

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
        const to = randomAddress();
        const tx1 = createTestTransaction({ to, gasLimit: 21_000 });
        const tx2 = createTestTransaction({ to, gasLimit: 21_000 });

        const signedTx1 = tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
        const signedTx2 = tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          signedTx1
        );

        await assert.isRejected(
          txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            signedTx2
          ),
          InvalidInputError,
          `Known transaction: ${bufferToHex(signedTx1.hash())}`
        );
      });

      it("rejects if transaction's gas limit exceeds block gas limit", async () => {
        const gasLimit = 15_000_000;
        const tx = createTestFakeTransaction({ gasLimit });
        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${blockGasLimit}`
        );
      });

      it("rejects if transaction is not signed", async () => {
        const tx = createUnsignedTestTransaction();
        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          "Invalid Signature"
        );
      });

      it("rejects if transaction's nonce is too low", async () => {
        const address = randomAddress();
        await stateManager.putAccount(
          address,
          Account.fromAccountData({ nonce: 1 })
        );

        const tx = createTestFakeTransaction({
          from: address,
          nonce: 0,
        });

        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          "Nonce too low"
        );
      });

      it("rejects if transaction's gas limit is lower than transaction's base fee", async () => {
        const gasLimit = 100;
        const tx = createTestFakeTransaction({ gasLimit });
        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          `Transaction requires at least 21000 gas but got ${gasLimit}`
        );
      });

      it("rejects if creating a contract and no data is provided", async () => {
        const tx = createTestFakeTransaction({
          to: undefined,
        });
        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          "contract creation without any data provided"
        );
      });

      it("rejects if sender doesn't have enough ether on their balance", async () => {
        const address = randomAddress();
        await stateManager.putAccount(
          address,
          Account.fromAccountData({
            nonce: 0n,
            balance: 21000n * 900n + 5n - 1n,
          })
        );

        const tx = createTestFakeTransaction({
          from: address,
          gasLimit: 21000,
          gasPrice: 900,
          value: 5,
        });
        await assert.isRejected(
          txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
          InvalidInputError,
          "sender doesn't have enough funds to send tx"
        );

        const tx2 = createTestFakeTransaction({
          from: address,
          maxFeePerGas: 21000,
          maxPriorityFeePerGas: 0,
          value: 5,
        });
        await assert.isRejected(
          txPool.addTransaction(
            stateManager.getAccount.bind(stateManager),
            tx2
          ),
          InvalidInputError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });

    describe("assigning order ids", () => {
      const address = randomAddress();

      beforeEach(async () => {
        await stateManager.putAccount(
          address,
          Account.fromAccountData({ nonce: 0n })
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

        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          txA.data
        );
        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          txB.data
        );
        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          txC.data
        );
        await txPool.addTransaction(
          stateManager.getAccount.bind(stateManager),
          txD.data
        );

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
        to: randomAddress(),
        nonce: 0,
        gasLimit: 21_000,
      });

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx
      );

      const txFromTxPool = txPool.getOrderedTransactionByHash(tx.hash());

      assert.deepEqual(txFromTxPool?.data.raw, tx.raw);
    });

    it("returns a transaction from queued based on hash", async () => {
      const tx = createTestFakeTransaction({
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: randomAddress(),
        nonce: 2,
        gasLimit: 21_000,
      });

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx
      );

      const txFromTxPool = txPool.getOrderedTransactionByHash(tx.hash());

      assert.deepEqual(txFromTxPool?.data.raw, tx.raw);
    });

    it("returns undefined if transaction is not in pending anymore", async () => {
      const tx = createTestTransaction({
        to: randomAddress(),
        nonce: 0,
        gasLimit: 21_000,
      });

      const signedTx = tx.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx
      );

      const oldTxFromTxPool = txPool.getOrderedTransactionByHash(
        signedTx.hash()
      );

      assert.deepEqual(oldTxFromTxPool!.data.raw(), signedTx.raw());

      await stateManager.putAccount(
        signedTx.getSenderAddress(),
        Account.fromAccountData({
          nonce: 1,
          balance: 10n ** 18n,
        })
      );

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );

      const actualTxFromTxPool = txPool.getOrderedTransactionByHash(
        signedTx.hash()
      );

      assert.isUndefined(actualTxFromTxPool);
    });

    it("returns undefined if transaction is not in queued anymore", async () => {
      const tx = createTestTransaction({
        to: randomAddress(),
        nonce: 2,
        gasLimit: 21_000,
      });

      const signedTx = tx.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx
      );

      const oldTxFromTxPool = txPool.getOrderedTransactionByHash(
        signedTx.hash()
      );

      assert.deepEqual(oldTxFromTxPool!.data.raw(), signedTx.raw());

      await stateManager.putAccount(
        signedTx.getSenderAddress(),
        Account.fromAccountData({
          nonce: 3,
          balance: 10n ** 18n,
        })
      );

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );

      const actualTxFromTxPool = txPool.getOrderedTransactionByHash(
        signedTx.hash()
      );

      assert.isUndefined(actualTxFromTxPool);
    });
  });

  describe("getNextPendingNonce", () => {
    const address = randomAddress();

    beforeEach(async () => {
      await stateManager.putAccount(
        address,
        Account.fromAccountData({ nonce: 0n })
      );
    });

    it("returns the next nonce", async () => {
      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
      });

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );

      assert.isTrue(
        (await txPool.getNextPendingNonce(
          stateManager.getAccount.bind(stateManager),
          address
        )) === 1n
      );
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

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );

      assert.isTrue(
        (await txPool.getNextPendingNonce(
          stateManager.getAccount.bind(stateManager),
          address
        )) === 1n
      );
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

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx3
      );

      assert.isTrue(
        (await txPool.getNextPendingNonce(
          stateManager.getAccount.bind(stateManager),
          address
        )) === 3n
      );
    });

    it("returns correct nonce after some queued transactions are moved to pending", async () => {
      const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
      const tx2 = createTestFakeTransaction({ from: address, nonce: 2 });
      const tx3 = createTestFakeTransaction({ from: address, nonce: 5 });
      const tx4 = createTestFakeTransaction({ from: address, nonce: 1 });

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx3
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx4
      );

      assert.isTrue(
        (await txPool.getNextPendingNonce(
          stateManager.getAccount.bind(stateManager),
          address
        )) === 3n
      );
    });
  });

  describe("updatePendingAndQueued", () => {
    const address1 = Address.fromString(DEFAULT_ACCOUNTS_ADDRESSES[0]);
    const address2 = Address.fromString(DEFAULT_ACCOUNTS_ADDRESSES[1]);
    beforeEach(async () => {
      await stateManager.putAccount(
        address1,
        Account.fromAccountData({
          nonce: 0n,
          balance: 10n ** 18n,
        })
      );
      await stateManager.putAccount(
        address2,
        Account.fromAccountData({
          nonce: 0n,
          balance: 10n ** 18n,
        })
      );
    });

    it("removes pending transaction when it's gas limit exceeds block gas limit", async () => {
      const tx1 = createTestTransaction({ nonce: 0, gasLimit: 9_500_000 });
      const signedTx1 = tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx1
      );

      txPool.setBlockGasLimit(5_000_000);

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([]));
    });

    it("removes queued transaction when it's gas limit exceeds block gas limit", async () => {
      const tx1 = createTestTransaction({ nonce: 1, gasLimit: 9_500_000 });
      const signedTx1 = tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx1
      );

      txPool.setBlockGasLimit(5_000_000);

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );
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

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1.data
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2.data
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx3.data
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx4.data
      );

      await stateManager.putAccount(
        address1,
        Account.fromAccountData({
          nonce: 1n,
          balance: 10n ** 18n,
        })
      );
      await stateManager.putAccount(
        address2,
        Account.fromAccountData({
          nonce: 1n,
          balance: 10n ** 18n,
        })
      );

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );
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
      const signedTx1 = tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx1
      );

      await stateManager.putAccount(
        address1,
        Account.fromAccountData({ nonce: 0n, balance: 0n })
      );

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );
      const pendingTransactions = txPool.getPendingTransactions();

      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([]));
    });

    it("removes queued transaction when sender doesn't have enough ether to make the transaction", async () => {
      const tx1 = createTestTransaction({
        nonce: 2,
        gasLimit: 30_000,
        gasPrice: 500,
      });
      const signedTx1 = tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        signedTx1
      );

      await stateManager.putAccount(
        address1,
        Account.fromAccountData({ nonce: 0n, balance: 0n })
      );

      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );
      const queuedTransactions = txPool.getQueuedTransactions();

      assertEqualTransactionMaps(queuedTransactions, makeOrderedTxMap([]));
    });

    it("moves pending transactions to queued if needed", async () => {
      const sender = randomAddress();
      await stateManager.putAccount(
        sender,
        Account.fromAccountData({
          nonce: 0n,
          balance: 10n ** 20n,
        })
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

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx0
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx4
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx5
      );

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
      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );

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
      const sender = randomAddress();

      const tx1 = createTestFakeTransaction({
        nonce: 0,
        gasLimit: 100_000,
        from: sender,
      });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );

      let pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 1);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx1.raw);

      let queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);

      txPool.setBlockGasLimit(90_000);
      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );

      const tx2 = createTestFakeTransaction({
        gasLimit: 80_000,
        from: sender,
        nonce: 0,
      });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );

      pendingTxs = txPool.getPendingTransactions();
      assert.lengthOf(txMapToArray(pendingTxs), 1);
      assert.deepEqual(txMapToArray(pendingTxs)[0].raw, tx2.raw);

      queuedTxs = txPool.getQueuedTransactions();
      assert.lengthOf(txMapToArray(queuedTxs), 0);
    });

    it("accepts transactions after a no-op update", async function () {
      const sender = randomAddress();
      await stateManager.putAccount(
        sender,
        Account.fromAccountData({
          nonce: 0n,
          balance: 10n ** 20n,
        })
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

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx0
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );

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
      await txPool.updatePendingAndQueued(
        stateManager.getAccount.bind(stateManager)
      );

      const tx3 = createTestFakeTransaction({
        nonce: 3,
        from: sender,
      });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx3
      );

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
      assert.equal(txPool.getBlockGasLimit(), 10_000_000n);
      txPool.setBlockGasLimit(15_000_000);
      assert.equal(txPool.getBlockGasLimit(), 15_000_000n);
    });

    it("sets a new block gas limit when new limit is a bigint", () => {
      assert.equal(txPool.getBlockGasLimit(), 10_000_000n);
      txPool.setBlockGasLimit(15_000_000n);
      assert.equal(txPool.getBlockGasLimit(), 15_000_000n);
    });

    it("makes the new block gas limit actually used for validating added transactions", async () => {
      txPool.setBlockGasLimit(21_000);
      const tx = createTestFakeTransaction({ gasLimit: 50_000 });
      await assert.isRejected(
        txPool.addTransaction(stateManager.getAccount.bind(stateManager), tx),
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
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx
      );
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
      const address = randomAddress();
      await stateManager.putAccount(
        address,
        Account.fromAccountData({ nonce: 0n })
      );
      const tx1 = createTestOrderedTransaction({
        from: address,
        orderId: 0,
        nonce: 0,
      });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1.data
      );

      const id = txPool.snapshot();

      const tx2 = createTestOrderedTransaction({
        from: address,
        orderId: 1,
        nonce: 1,
      });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2.data
      );

      txPool.revert(id);
      const pendingTransactions = txPool.getPendingTransactions();
      assertEqualTransactionMaps(pendingTransactions, makeOrderedTxMap([tx1]));
    });

    it("reverts to the previous state of block gas limit", () => {
      const id = txPool.snapshot();
      txPool.setBlockGasLimit(5_000_000n);
      txPool.revert(id);
      assert.equal(txPool.getBlockGasLimit(), blockGasLimit);
    });
  });

  describe("hasPendingTransactions", () => {
    it("returns false when there are no pending transactions", async () => {
      assert.isFalse(txPool.hasPendingTransactions());
    });

    it("returns true when there is at least one pending transaction", async () => {
      const tx1 = createTestFakeTransaction({ nonce: 0 });
      const tx2 = createTestFakeTransaction({ nonce: 0 });

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      assert.isTrue(txPool.hasPendingTransactions());

      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );
      assert.isTrue(txPool.hasPendingTransactions());
    });

    it("returns false when there are only queued transactions", async () => {
      const tx1 = createTestFakeTransaction({ nonce: 1 });
      const tx2 = createTestFakeTransaction({ nonce: 1 });
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx1
      );
      await txPool.addTransaction(
        stateManager.getAccount.bind(stateManager),
        tx2
      );

      assert.isFalse(txPool.hasPendingTransactions());
    });
  });
});
