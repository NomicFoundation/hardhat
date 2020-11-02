import { assert } from "chai";
import Common from "ethereumjs-common";
import { FakeTxData, Transaction } from "ethereumjs-tx";
import FakeTransaction from "ethereumjs-tx/dist/fake";
import { bufferToHex, bufferToInt } from "ethereumjs-util";

import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { NodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { assertQuantity } from "../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../helpers/constants";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_INTERVAL_MINING_CONFIG,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "../helpers/providers";

describe("HardhatNode", () => {
  const config: NodeConfig = {
    type: "local",
    automine: false,
    intervalMining: DEFAULT_INTERVAL_MINING_CONFIG,
    hardfork: DEFAULT_HARDFORK,
    networkName: DEFAULT_NETWORK_NAME,
    chainId: DEFAULT_CHAIN_ID,
    networkId: DEFAULT_NETWORK_ID,
    blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
    genesisAccounts: DEFAULT_ACCOUNTS,
  };
  let node: HardhatNode;
  let createTestTransaction: (txData: FakeTxData) => FakeTransaction;

  beforeEach(async () => {
    let common: Common;
    [common, node] = await HardhatNode.create(config);
    createTestTransaction = (txData) => new FakeTransaction(txData, { common });
  });

  describe("mineBlock", () => {
    async function assertTransactionsWereMined(txs: Transaction[]) {
      for (const tx of txs) {
        const txReceipt = await node.getTransactionReceipt(tx.hash());
        assert.isDefined(txReceipt);
      }

      const block = await node.getLatestBlock();
      assert.lengthOf(block.transactions, txs.length);
      assert.deepEqual(
        block.transactions.map((tx) => bufferToHex(tx.hash())),
        txs.map((tx) => bufferToHex(tx.hash()))
      );
    }

    it("can mine an empty block", async () => {
      const beforeBlock = await node.getLatestBlockNumber();
      await node.mineBlock();
      const currentBlock = await node.getLatestBlockNumber();
      assert.equal(currentBlock.toString(), beforeBlock.addn(1).toString());
    });

    it("can mine a block with one transaction", async () => {
      const tx = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      await node.runTransaction(tx);
      await node.mineBlock();

      await assertTransactionsWereMined([tx]);
      const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS, null);
      assert.equal(balance.toString(), "1234");
    });

    it("can mine a block with two transactions from different senders", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      const tx2 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[1],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      await node.runTransaction(tx1);
      await node.runTransaction(tx2);
      await node.mineBlock();

      await assertTransactionsWereMined([tx1, tx2]);
      const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS, null);
      assert.equal(balance.toString(), "2468");
    });

    it("can mine a block with two transactions from the same sender", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      const tx2 = createTestTransaction({
        nonce: 1,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      await node.runTransaction(tx1);
      await node.runTransaction(tx2);
      await node.mineBlock();

      await assertTransactionsWereMined([tx1, tx2]);
      const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS, null);
      assert.equal(balance.toString(), "2468");
    });

    it("sets correct gasUsed values", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 100_000,
        value: 1234,
      });
      const tx2 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[1],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 100_000,
        value: 1234,
      });
      await node.runTransaction(tx1);
      await node.runTransaction(tx2);
      await node.mineBlock();

      const tx1Receipt = await node.getTransactionReceipt(tx1.hash());
      const tx2Receipt = await node.getTransactionReceipt(tx2.hash());
      assertQuantity(tx1Receipt?.gasUsed, 21_000);
      assertQuantity(tx2Receipt?.gasUsed, 21_000);

      const block = await node.getLatestBlock();
      assert.equal(bufferToInt(block.header.gasUsed), 42_000);
    });

    it("respects block gas limit", async () => {
      node.setBlockGasLimit(21_000);
      const tx1 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      const tx2 = createTestTransaction({
        nonce: 1,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      await node.runTransaction(tx1);
      await node.runTransaction(tx2);
      await node.mineBlock();

      await assertTransactionsWereMined([tx1]);
      assert.isUndefined(await node.getTransactionReceipt(tx2.hash()));
    });

    xit("can mine two transactions which gasLimit sum exceeds block gas limit but actual gas used does not", async () => {
      // TODO
    });
  });
});
