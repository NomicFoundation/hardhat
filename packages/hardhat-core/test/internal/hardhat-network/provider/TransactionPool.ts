import StateManager from "@nomiclabs/ethereumjs-vm/dist/state/stateManager";
import { assert } from "chai";
import Account from "ethereumjs-account";
import { BN } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import { TransactionPool } from "../../../../src/internal/hardhat-network/provider/TransactionPool";
import { PStateManager } from "../../../../src/internal/hardhat-network/provider/types/PStateManager";
import { asPStateManager } from "../../../../src/internal/hardhat-network/provider/utils/asPStateManager";
import { createTestFakeTransaction } from "../helpers/blockchain";

describe("Transaction Pool", () => {
  let stateManager: PStateManager;
  let txPool: TransactionPool;

  beforeEach(() => {
    stateManager = asPStateManager(new StateManager());
    txPool = new TransactionPool(stateManager);
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
            const tx = createTestFakeTransaction({ from: address, nonce: 0 });
            await txPool.addTransaction(tx);

            const pendingTxs = txPool.getPendingTransactions();
            assert.lengthOf(pendingTxs, 1);
            assert.deepEqual(pendingTxs[0].raw, tx.raw);
          });
        });

        describe("when transaction nonce is higher than account nonce", () => {
          it("queues the transaction", async () => {
            await stateManager.putAccount(
              address,
              new Account({ nonce: new BN(0) })
            );
            const tx = createTestFakeTransaction({ from: address, nonce: 1 });
            await txPool.addTransaction(tx);

            const pendingTxs = txPool.getPendingTransactions();
            assert.lengthOf(pendingTxs, 0);
          });
        });

        describe("when transaction nonce is lower than account nonce", () => {
          it("throws an error", async () => {
            await stateManager.putAccount(
              address,
              new Account({ nonce: new BN(1) })
            );
            const tx = createTestFakeTransaction({ from: address, nonce: 0 });

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
            const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
            const tx2 = createTestFakeTransaction({ from: address, nonce: 1 });
            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1, tx2].map((tx) => tx.raw)
            );
          });

          xit("moves queued transactions with subsequent nonces to pending", async () => {
            const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
            const tx2 = createTestFakeTransaction({ from: address, nonce: 2 });
            const tx3 = createTestFakeTransaction({ from: address, nonce: 1 });

            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);
            await txPool.addTransaction(tx3);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1, tx2, tx3].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is higher than account executable nonce", () => {
          it("queues the transaction", async () => {
            const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
            const tx2 = createTestFakeTransaction({ from: address, nonce: 2 });
            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is lower than account executable nonce", () => {
          it("throws an error", async () => {
            const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
            const tx2 = createTestFakeTransaction({ from: address, nonce: 0 });
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

      it("can add transactions from many senders", async () => {
        const tx1 = createTestFakeTransaction({ from: address1, nonce: 0 });
        const tx2 = createTestFakeTransaction({ from: address2, nonce: 0 });

        await txPool.addTransaction(tx1);
        await txPool.addTransaction(tx2);

        const pendingTxs = txPool.getPendingTransactions();

        assert.sameDeepMembers(
          pendingTxs.map((tx) => tx.raw),
          [tx1, tx2].map((tx) => tx.raw)
        );
      });

      xit("does not mix up queued transactions from different senders", async () => {
        // A. as S1 add tx.n=0
        // B. as S2 add tx.n=0
        // C. as S1 add tx.n=2
        // D. as S2 add tx.n=1
        // getPendingTxs => A, B, D
      });

      xit("TODO", async () => {
        // A. as S1 add tx.n=0
        // B. as S2 add tx.n=0
        // C. as S1 add tx.n=2
        // D. as S2 add tx.n=1
        // E. as S1 add tx.n=1
        // getPendingTxs => A, B, C, D, E
      });

      xit("TODO", async () => {
        // executableNonce = 3
        // queued = [5, 4, 6];
      });
    });
  });
});
