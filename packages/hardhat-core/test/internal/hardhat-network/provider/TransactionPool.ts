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
      const tx = createTestFakeTransaction();
      await txPool.addTransaction(tx);

      assert.include(txPool.getPendingTransactions(), tx);
    });

    it("can add multiple transactions", async () => {
      const tx1 = createTestFakeTransaction();
      const tx2 = createTestFakeTransaction();

      await txPool.addTransaction(tx1);
      await txPool.addTransaction(tx2);

      assert.includeMembers(txPool.getPendingTransactions(), [tx1, tx2]);
    });

    it("throws error on attempt to add a transaction with a nonce too low", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(1) });
      await stateManager.putAccount(address, toPut);

      assert.isRejected(
        txPool.addTransaction(
          createTestFakeTransaction({ from: address, nonce: 1 })
        ),
        Error,
        "Nonce too low"
      );
    });
  });
});
