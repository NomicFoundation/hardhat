import StateManager from "@nomiclabs/ethereumjs-vm/dist/state/stateManager";
import { assert } from "chai";
import Account from "ethereumjs-account";
import { BN } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import { PStateManager } from "../../../../src/internal/hardhat-network/provider/types/PStateManager";
import { asPStateManager } from "../../../../src/internal/hardhat-network/provider/utils/asPStateManager";
import { createTestFakeTransaction } from "../helpers/blockchain";
import { TransactionPool } from "../../../../src/internal/hardhat-network/provider/TransactionPool";

describe("Transaction Pool", () => {
  let stateManager: PStateManager;
  let txPool: TransactionPool;

  beforeEach(() => {
    stateManager = asPStateManager(new StateManager());
    txPool = new TransactionPool(stateManager);
  });

  describe("addTransaction", () => {
    it("can save transaction", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(0) });
      await stateManager.putAccount(address, toPut);
      const tx = createTestFakeTransaction({ from: address, nonce: 0 });
      await txPool.addTransaction(tx);

      assert.include(txPool.getPendingTransactions(), tx);
    });

    it("can add multiple transactions", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(0) });
      await stateManager.putAccount(address, toPut);
      const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
      const tx2 = createTestFakeTransaction({ from: address, nonce: 1 });

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      assert.includeMembers(txPool.getPendingTransactions(), [tx1, tx2]);
    });

    it("throws error on attempt to add a transaction with a nonce too low", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(2) });
      await stateManager.putAccount(address, toPut);

      assert.isRejected(
        txPool.addTransaction(
          createTestFakeTransaction({ from: address, nonce: 1 })
        ),
        Error,
        "Nonce too low"
      );
    });

    it("can track account's nonce", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(0) });
      await stateManager.putAccount(address, toPut);

      await txPool.addTransaction(
        createTestFakeTransaction({ from: address, nonce: 0 })
      );
      assert.equal(await txPool.getAccountNonce(address), 1);

      await txPool.addTransaction(
        createTestFakeTransaction({ from: address, nonce: 1 })
      );
      assert.equal(await txPool.getAccountNonce(address), 2);
    });

    it("can add transactions to pending and queued", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(0) });
      await stateManager.putAccount(address, toPut);
      const tx1 = createTestFakeTransaction({ from: address, nonce: 0 });
      const tx2 = createTestFakeTransaction({ from: address, nonce: 4 });

      await txPool.addTransaction(tx1);
      assert.equal(await txPool.getAccountNonce(address), 1);
      assert.include(txPool.getPendingTransactions(), tx1);

      await txPool.addTransaction(tx2);
      assert.equal(await txPool.getAccountNonce(address), 1);
      assert.equal(txPool.getPendingTransactions().length, 1);
    });
  });
});
