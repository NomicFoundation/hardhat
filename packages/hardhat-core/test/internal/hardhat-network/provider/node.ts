import { assert } from "chai";
import Common from "ethereumjs-common";
import { FakeTxData, Transaction } from "ethereumjs-tx";
import FakeTransaction from "ethereumjs-tx/dist/fake";
import { BN, bufferToHex, bufferToInt } from "ethereumjs-util";
import sinon from "sinon";

import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { NodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { getCurrentTimestamp } from "../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { assertQuantity } from "../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../helpers/constants";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "../helpers/providers";

describe("HardhatNode", () => {
  const config: NodeConfig = {
    type: "local",
    automine: false,
    hardfork: DEFAULT_HARDFORK,
    networkName: DEFAULT_NETWORK_NAME,
    chainId: DEFAULT_CHAIN_ID,
    networkId: DEFAULT_NETWORK_ID,
    blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
    genesisAccounts: DEFAULT_ACCOUNTS,
  };
  const gasPrice = 1;
  let node: HardhatNode;
  let createTestTransaction: (txData: FakeTxData) => FakeTransaction;

  beforeEach(async () => {
    let common: Common;
    [common, node] = await HardhatNode.create(config);
    createTestTransaction = (txData) =>
      new FakeTransaction({ gasPrice, ...txData }, { common });
  });

  describe("getPendingTransactions", () => {
    it("returns both pending and queued transactions from TxPool", async () => {
      const tx1 = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
      });
      const tx2 = createTestTransaction({
        nonce: 2,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
      });
      const tx3 = createTestTransaction({
        nonce: 3,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
      });

      await node.sendTransaction(tx1);
      await node.sendTransaction(tx2);
      await node.sendTransaction(tx3);

      const nodePendingTxs = await node.getPendingTransactions();

      assert.sameDeepMembers(
        nodePendingTxs.map((tx) => tx.raw),
        [tx1, tx2, tx3].map((tx) => tx.raw)
      );
    });
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

    describe("basic tests", () => {
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
        await node.sendTransaction(tx);
        await node.mineBlock();

        await assertTransactionsWereMined([tx]);
        const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS);
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
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx2]);
        const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS);
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
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx2]);
        const balance = await node.getAccountBalance(EMPTY_ACCOUNT_ADDRESS);
        assert.equal(balance.toString(), "2468");
      });

      it("removes the mined transaction from the tx pool", async () => {
        const tx = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 21_000,
          value: 1234,
        });
        await node.sendTransaction(tx);

        const pendingTransactionsBefore = await node.getPendingTransactions();
        assert.lengthOf(pendingTransactionsBefore, 1);

        await node.mineBlock();

        const pendingTransactionsAfter = await node.getPendingTransactions();
        assert.lengthOf(pendingTransactionsAfter, 0);
      });

      it("leaves the transactions in the tx pool that did not fit in a block", async () => {
        node.setBlockGasLimit(42_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        const expensiveTx2 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000,
          data: Buffer.alloc(1024, 1), // actual gas used is 37_384
        });
        const tx3 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(expensiveTx2);
        await node.sendTransaction(tx3);

        const pendingTransactionsBefore = await node.getPendingTransactions();
        assert.sameDeepMembers(
          pendingTransactionsBefore.map((tx) => tx.raw),
          [tx1, expensiveTx2, tx3].map((tx) => tx.raw)
        );

        await node.mineBlock();
        await assertTransactionsWereMined([tx1, tx3]);

        const pendingTransactionsAfter = await node.getPendingTransactions();
        assert.sameDeepMembers(
          pendingTransactionsAfter.map((tx) => tx.raw),
          [expensiveTx2.raw]
        );
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
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        const tx1Receipt = await node.getTransactionReceipt(tx1.hash());
        const tx2Receipt = await node.getTransactionReceipt(tx2.hash());
        assertQuantity(tx1Receipt?.gasUsed, 21_000);
        assertQuantity(tx2Receipt?.gasUsed, 21_000);

        const block = await node.getLatestBlock();
        assert.equal(bufferToInt(block.header.gasUsed), 42_000);
      });

      it("assigns miner rewards", async () => {
        const miner = node.getCoinbaseAddress();
        const initialMinerBalance = await node.getAccountBalance(miner);

        const oneEther = new BN(10).pow(new BN(18));
        const txFee = 21_000 * gasPrice;
        const minerReward = oneEther.muln(2).addn(txFee);

        const tx = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 21_000,
          value: 1234,
        });
        await node.sendTransaction(tx);
        await node.mineBlock();

        const minerBalance = await node.getAccountBalance(miner);
        assert.equal(
          minerBalance.toString(),
          initialMinerBalance.add(minerReward).toString()
        );
      });
    });

    describe("gas limit tests", () => {
      it("mines only as many transactions as would fit in a block", async () => {
        node.setBlockGasLimit(30_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 21_000,
        });
        const tx2 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 21_000,
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1]);
        assert.isUndefined(await node.getTransactionReceipt(tx2.hash()));
      });

      it("uses gasUsed value for determining if two transactions will fit in a block", async () => {
        node.setBlockGasLimit(50_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        const tx2 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx2]);
      });

      it("puts as many transactions as it can in a block", async () => {
        node.setBlockGasLimit(42_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        const expensiveTx2 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000,
          data: Buffer.alloc(1024, 1), // actual gas used is 37_384
        });
        const tx3 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000, // actual gas used is 21_000
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(expensiveTx2);
        await node.sendTransaction(tx3);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx3]);
        assert.isUndefined(
          await node.getTransactionReceipt(expensiveTx2.hash())
        );
      });
    });

    describe("timestamp tests", () => {
      let clock: sinon.SinonFakeTimers;

      beforeEach(() => {
        clock = sinon.useFakeTimers(Date.now());
      });

      afterEach(() => {
        clock.restore();
      });

      it("mines a block with the current timestamp", async () => {
        clock.tick(15_000);
        const now = getCurrentTimestamp();

        await node.mineBlock();
        const block = await node.getLatestBlock();

        assert.equal(bufferToInt(block.header.timestamp), now);
      });

      it("mines a block with an incremented timestamp if it clashes with the previous block", async () => {
        const firstBlock = await node.getLatestBlock();
        const firstBlockTimestamp = bufferToInt(firstBlock.header.timestamp);

        await node.mineBlock();
        const latestBlock = await node.getLatestBlock();
        const latestBlockTimestamp = bufferToInt(latestBlock.header.timestamp);

        assert.equal(latestBlockTimestamp, firstBlockTimestamp + 1);
      });

      it("assigns an incremented timestamp to each new block mined within the same second", async () => {
        const firstBlock = await node.getLatestBlock();
        const firstBlockTimestamp = bufferToInt(firstBlock.header.timestamp);

        await node.mineBlock();
        const secondBlock = await node.getLatestBlock();
        const secondBlockTimestamp = bufferToInt(secondBlock.header.timestamp);

        await node.mineBlock();
        const thirdBlock = await node.getLatestBlock();
        const thirdBlockTimestamp = bufferToInt(thirdBlock.header.timestamp);

        assert.equal(secondBlockTimestamp, firstBlockTimestamp + 1);
        assert.equal(thirdBlockTimestamp, secondBlockTimestamp + 1);
      });

      it("mines a block with a preset timestamp", async () => {
        const now = getCurrentTimestamp();
        const timestamp = new BN(now).addn(30);
        node.setNextBlockTimestamp(timestamp);
        await node.mineBlock();

        const block = await node.getLatestBlock();
        const blockTimestamp = bufferToInt(block.header.timestamp);
        assert.equal(blockTimestamp, timestamp.toNumber());
      });

      it("mines the next block normally after a block with preset timestamp", async () => {
        const now = getCurrentTimestamp();
        const timestamp = new BN(now).addn(30);
        node.setNextBlockTimestamp(timestamp);
        await node.mineBlock();

        clock.tick(3_000);
        await node.mineBlock();

        const block = await node.getLatestBlock();
        const blockTimestamp = bufferToInt(block.header.timestamp);
        assert.equal(blockTimestamp, timestamp.toNumber() + 3);
      });

      it("mines a block with the timestamp passed as a parameter irrespective of the preset timestamp", async () => {
        const now = getCurrentTimestamp();
        const presetTimestamp = new BN(now).addn(30);
        node.setNextBlockTimestamp(presetTimestamp);
        const timestamp = new BN(now).addn(60);
        await node.mineBlock(false, timestamp);

        const block = await node.getLatestBlock();
        const blockTimestamp = bufferToInt(block.header.timestamp);
        assert.equal(blockTimestamp, timestamp.toNumber());
      });

      it("mines a block with correct timestamp after time increase", async () => {
        const now = getCurrentTimestamp();
        node.increaseTime(new BN(30));
        await node.mineBlock();

        const block = await node.getLatestBlock();
        const blockTimestamp = bufferToInt(block.header.timestamp);
        assert.equal(blockTimestamp, now + 30);
      });

      describe("when time is increased by 30s", () => {
        function testPresetTimestamp(offset: number) {
          it("mines a block with the preset timestamp", async () => {
            const now = getCurrentTimestamp();
            const timestamp = new BN(now).addn(offset);
            node.increaseTime(new BN(30));
            node.setNextBlockTimestamp(timestamp);
            await node.mineBlock();

            const block = await node.getLatestBlock();
            const blockTimestamp = bufferToInt(block.header.timestamp);
            assert.equal(blockTimestamp, timestamp.toNumber());
          });

          it("mining a block with a preset timestamp changes the time offset", async () => {
            const now = getCurrentTimestamp();
            const timestamp = new BN(now).addn(offset);
            node.increaseTime(new BN(30));
            node.setNextBlockTimestamp(timestamp);
            await node.mineBlock();

            clock.tick(3_000);
            await node.mineBlock();

            const block = await node.getLatestBlock();
            const blockTimestamp = bufferToInt(block.header.timestamp);
            assert.equal(blockTimestamp, timestamp.toNumber() + 3);
          });
        }

        describe("when preset timestamp is 20s into the future", () => {
          testPresetTimestamp(20);
        });

        describe("when preset timestamp is 40s into the future", () => {
          testPresetTimestamp(40);
        });
      });
    });
  });
});
