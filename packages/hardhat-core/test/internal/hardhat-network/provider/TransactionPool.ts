import StateManager from "@nomiclabs/ethereumjs-vm/dist/state/stateManager";
import { assert } from "chai";
import Account from "ethereumjs-account";
import { BN, toBuffer } from "ethereumjs-util";

import {
  randomAddress,
  randomAddressBuffer,
} from "../../../../src/internal/hardhat-network/provider/fork/random";
import { TransactionPool } from "../../../../src/internal/hardhat-network/provider/TransactionPool";
import { PStateManager } from "../../../../src/internal/hardhat-network/provider/types/PStateManager";
import { asPStateManager } from "../../../../src/internal/hardhat-network/provider/utils/asPStateManager";
import {
  createTestFakeTransaction,
  createTestTransaction,
} from "../helpers/blockchain";

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
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
            });
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
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 3,
              gasLimit: 30000,
            });
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
            const tx = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
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
              gasLimit: 30000,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasLimit: 30000,
            });
            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1, tx2].map((tx) => tx.raw)
            );
          });

          it("moves queued transactions with subsequent nonces to pending", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
              gasLimit: 30000,
            });
            const tx3 = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasLimit: 30000,
            });

            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);
            await txPool.addTransaction(tx3);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1, tx2, tx3].map((tx) => tx.raw)
            );
          });

          it("does not move queued transactions to pending which have too high nonces", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
              gasLimit: 30000,
            });
            const tx3 = createTestFakeTransaction({
              from: address,
              nonce: 4,
              gasLimit: 30000,
            });
            const tx4 = createTestFakeTransaction({
              from: address,
              nonce: 1,
              gasLimit: 30000,
            });

            await txPool.addTransaction(tx1);
            await txPool.addTransaction(tx2);
            await txPool.addTransaction(tx3);
            await txPool.addTransaction(tx4);

            const pendingTxs = txPool.getPendingTransactions();
            assert.sameDeepMembers(
              pendingTxs.map((tx) => tx.raw),
              [tx1, tx2, tx4].map((tx) => tx.raw)
            );
          });
        });

        describe("when transaction nonce is higher than account executable nonce", () => {
          it("queues the transaction", async () => {
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 2,
              gasLimit: 30000,
            });
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
            const tx1 = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
            });
            const tx2 = createTestFakeTransaction({
              from: address,
              nonce: 0,
              gasLimit: 30000,
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
          gasLimit: 30000,
        });
        const tx2 = createTestFakeTransaction({
          from: address2,
          nonce: 0,
          gasLimit: 30000,
        });

        await txPool.addTransaction(tx1);
        await txPool.addTransaction(tx2);

        const pendingTxs = txPool.getPendingTransactions();

        assert.sameDeepMembers(
          pendingTxs.map((tx) => tx.raw),
          [tx1, tx2].map((tx) => tx.raw)
        );
      });

      describe("does not mix up queued transactions from different senders", () => {
        it("missing transaction", async () => {
          // A. as S1 add tx.n=0
          // B. as S2 add tx.n=0
          // C. as S1 add tx.n=2
          // D. as S2 add tx.n=1
          // getPendingTxs => A, B, D

          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
            gasLimit: 30000,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
            gasLimit: 30000,
          });

          await txPool.addTransaction(tx1);
          await txPool.addTransaction(tx2);
          await txPool.addTransaction(tx3);
          await txPool.addTransaction(tx4);

          const pendingTxs = txPool.getPendingTransactions();

          assert.sameDeepMembers(
            pendingTxs.map((tx) => tx.raw),
            [tx1, tx2, tx4].map((tx) => tx.raw)
          );
        });

        it("all transactions are present", async () => {
          // A. as S1 add tx.n=0
          // B. as S2 add tx.n=0
          // C. as S1 add tx.n=2
          // D. as S2 add tx.n=1
          // E. as S1 add tx.n=1
          // getPendingTxs => A, B, C, D, E

          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
            gasLimit: 30000,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
            gasLimit: 30000,
          });
          const tx5 = createTestFakeTransaction({
            from: address1,
            nonce: 1,
            gasLimit: 30000,
          });

          await txPool.addTransaction(tx1);
          await txPool.addTransaction(tx2);
          await txPool.addTransaction(tx3);
          await txPool.addTransaction(tx4);
          await txPool.addTransaction(tx5);

          const pendingTxs = txPool.getPendingTransactions();

          assert.sameDeepMembers(
            pendingTxs.map((tx) => tx.raw),
            [tx1, tx2, tx3, tx4, tx5].map((tx) => tx.raw)
          );
        });

        it("some transactions are present", async () => {
          // executableNonce = 1
          // queued = [2, 3];

          const tx1 = createTestFakeTransaction({
            from: address1,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx2 = createTestFakeTransaction({
            from: address2,
            nonce: 0,
            gasLimit: 30000,
          });
          const tx3 = createTestFakeTransaction({
            from: address1,
            nonce: 2,
            gasLimit: 30000,
          });
          const tx4 = createTestFakeTransaction({
            from: address2,
            nonce: 2,
            gasLimit: 30000,
          });
          const tx5 = createTestFakeTransaction({
            from: address1,
            nonce: 3,
            gasLimit: 30000,
          });
          const tx6 = createTestFakeTransaction({
            from: address2,
            nonce: 3,
            gasLimit: 30000,
          });
          const tx7 = createTestFakeTransaction({
            from: address2,
            nonce: 1,
            gasLimit: 30000,
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
            pendingTxs.map((tx) => tx.raw),
            [tx1, tx2, tx4, tx6, tx7].map((tx) => tx.raw)
          );
        });
      });
    });

    describe("validation", () => {
      it("throws an error if transaction's gas limit exceeds block gas limit", () => {
        const tx = createTestFakeTransaction({ gasLimit: 15000000 });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "Transaction gas limit"
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
          gasLimit: 30000,
        });
        const tx2 = createTestFakeTransaction({
          from: address,
          nonce: 0,
          gasLimit: 30000,
        });
        await txPool.addTransaction(tx1);

        await assert.isRejected(
          txPool.addTransaction(tx2),
          Error,
          "Nonce too low"
        );
      });

      it("throws an error if transaction's gas limit is greater than transaction's base fee", () => {
        const tx = createTestFakeTransaction({ gasLimit: 100 });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "Transaction requires at least"
        );
      });

      it("throws an error if creating a contract and no data is provided", () => {
        const tx = createTestFakeTransaction({
          to: undefined,
          gasLimit: 30000,
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
          gasLimit: 30000,
          gasPrice: 900,
          value: 5,
        });
        assert.isRejected(
          txPool.addTransaction(tx),
          Error,
          "Account balance too low to make the transaction"
        );
      });
    });
  });

  describe("getExecutableNonce", () => {
    const address = randomAddressBuffer();

    beforeEach(async () => {
      await stateManager.putAccount(address, new Account({ nonce: new BN(0) }));
    });

    it("returns current executable nonce", async () => {
      // add one transaction to pending
      // p: [1]

      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
        gasLimit: 30000,
      });

      await txPool.addTransaction(tx1);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(1)));
    });

    it("is not affected by queued transactions", async () => {
      // p: [1]
      // q: [3]

      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
        gasLimit: 30000,
      });
      const tx2 = createTestFakeTransaction({
        from: address,
        nonce: 2,
        gasLimit: 30000,
      });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(1)));
    });

    it("returns correct nonce after queued transactions are moved to pending", async () => {
      // p: [1]
      // q: [3]
      // later 2 is added:
      // p: [1, 2, 3]
      // q: []

      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
        gasLimit: 30000,
      });
      const tx2 = createTestFakeTransaction({
        from: address,
        nonce: 2,
        gasLimit: 30000,
      });
      const tx3 = createTestFakeTransaction({
        from: address,
        nonce: 1,
        gasLimit: 30000,
      });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx3);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(3)));
    });

    it("returns correct nonce after moving some queued transactions", async () => {
      // p: [1]
      // q: [3, 5]
      // later 2 is added:
      // p: [1, 2, 3]
      // q: [5]

      const tx1 = createTestFakeTransaction({
        from: address,
        nonce: 0,
        gasLimit: 30000,
      });
      const tx2 = createTestFakeTransaction({
        from: address,
        nonce: 2,
        gasLimit: 30000,
      });
      const tx3 = createTestFakeTransaction({
        from: address,
        nonce: 5,
        gasLimit: 30000,
      });
      const tx4 = createTestFakeTransaction({
        from: address,
        nonce: 1,
        gasLimit: 30000,
      });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);
      await txPool.addTransaction(tx3);
      await txPool.addTransaction(tx4);

      assert.isTrue((await txPool.getExecutableNonce(address)).eq(new BN(3)));
    });
  });
});
