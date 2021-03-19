import { assert } from "chai";
import Common from "ethereumjs-common";
import { FakeTxData, Transaction } from "ethereumjs-tx";
import FakeTransaction from "ethereumjs-tx/dist/fake";
import { BN, bufferToHex, bufferToInt } from "ethereumjs-util";
import sinon from "sinon";

import { numberToRpcQuantity } from "../../../../src/internal/core/providers/provider-utils";
import { rpcToBlockData } from "../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import {
  ForkedNodeConfig,
  NodeConfig,
} from "../../../../src/internal/hardhat-network/provider/node-types";
import { Block } from "../../../../src/internal/hardhat-network/provider/types/Block";
import { getCurrentTimestamp } from "../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { makeForkClient } from "../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { ALCHEMY_URL } from "../../../setup";
import { assertQuantity } from "../helpers/assertions";
import {
  EMPTY_ACCOUNT_ADDRESS,
  FORK_TESTS_CACHE_PATH,
} from "../helpers/constants";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "../helpers/providers";

// tslint:disable no-string-literal

interface ForkPoint {
  networkName: string;
  url?: string;
  /**
   * Fork block number.
   * This is the last observable block from the remote blockchain.
   * Later blocks are all constructed by Hardhat Network.
   */
  blockNumber: number;
  chainId: number;
  hardfork: "istanbul" | "muirGlacier";
}

describe("HardhatNode", () => {
  const config: NodeConfig = {
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
    createTestTransaction = (txData) => {
      const tx = new FakeTransaction({ gasPrice, ...txData }, { common });
      tx.hash();
      return tx;
    };
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
        await node.setBlockGasLimit(55_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
        });
        const expensiveTx2 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 40_000,
        });
        const tx3 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
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
        await node.setBlockGasLimit(30_000);
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

      it("uses gasLimit value for determining if a new transaction will fit in a block (1 fits)", async () => {
        await node.setBlockGasLimit(50_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
        });
        const tx2 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1]);
        assert.isUndefined(await node.getTransactionReceipt(tx2.hash()));
      });

      it("uses gasLimit value for determining if a new transaction will fit in a block (2 fit)", async () => {
        // here the first tx is added, and it uses 21_000 gas
        // this leaves 31_000 of gas in the block, so the second one is also included
        await node.setBlockGasLimit(52_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
        });
        const tx2 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx2]);
      });

      it("uses the rest of the txs when one is dropped because of its gas limit", async () => {
        await node.setBlockGasLimit(50_000);
        const tx1 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
          gasPrice: 2,
        });
        const tx2 = createTestTransaction({
          nonce: 1,
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 30_000, // actual gas used is 21_000
          gasPrice: 2,
        });
        const tx3 = createTestTransaction({
          nonce: 0,
          from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          to: EMPTY_ACCOUNT_ADDRESS,
          gasLimit: 21_000,
          gasPrice: 1,
        });
        await node.sendTransaction(tx1);
        await node.sendTransaction(tx2);
        await node.sendTransaction(tx3);
        await node.mineBlock();

        await assertTransactionsWereMined([tx1, tx3]);
        assert.isUndefined(await node.getTransactionReceipt(tx2.hash()));
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
        await node.mineBlock(timestamp);

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

  describe("full block", function () {
    this.timeout(120000);
    // Note that here `blockNumber` is the number of the forked block, not the number of the "simulated" block.
    // Tests are written to fork this block and execute all transactions of the block following the forked block.
    // This means that if the forked block number is 9300076, what the test will do is:
    //   - setup a forked blockchain based on block 9300076
    //   - fetch all transactions from 9300077
    //   - create a new block with them
    //   - execute the whole block and save it with the rest of the blockchain
    const forkPoints: ForkPoint[] = [
      {
        networkName: "mainnet",
        url: ALCHEMY_URL,
        blockNumber: 9300076,
        chainId: 1,
        hardfork: "muirGlacier",
      },
      {
        networkName: "kovan",
        url: (ALCHEMY_URL ?? "").replace("mainnet", "kovan"),
        blockNumber: 23115226,
        chainId: 42,
        hardfork: "istanbul",
      },
      {
        networkName: "rinkeby",
        url: (ALCHEMY_URL ?? "").replace("mainnet", "rinkeby"),
        blockNumber: 8004364,
        chainId: 4,
        hardfork: "istanbul",
      },
    ];

    for (const {
      url,
      blockNumber,
      networkName,
      chainId,
      hardfork,
    } of forkPoints) {
      it(`should run a ${networkName} block and produce the same results`, async function () {
        if (url === undefined || url === "") {
          this.skip();
        }

        const forkConfig = {
          jsonRpcUrl: url,
          blockNumber,
        };

        const { forkClient } = await makeForkClient(forkConfig);

        const rpcBlock = await forkClient.getBlockByNumber(
          new BN(blockNumber + 1),
          true
        );

        if (rpcBlock === null) {
          assert.fail();
        }

        const forkedNodeConfig: ForkedNodeConfig = {
          automine: true,
          networkName: "mainnet",
          chainId,
          networkId: 1,
          hardfork,
          forkConfig,
          FORK_TESTS_CACHE_PATH,
          blockGasLimit: rpcBlock.gasLimit.toNumber(),
          genesisAccounts: [],
        };

        const [common, forkedNode] = await HardhatNode.create(forkedNodeConfig);

        const block = new Block(rpcToBlockData(rpcBlock), { common });

        forkedNode["_vmTracer"].disableTracing();
        block.header.receiptTrie = Buffer.alloc(32, 0);
        const result = await forkedNode["_vm"].runBlock({
          block,
          generate: true,
          skipBlockValidation: true,
        });

        await forkedNode["_saveBlockAsSuccessfullyRun"](block, result);

        const newBlock = await forkedNode.getBlockByNumber(
          new BN(blockNumber + 1)
        );

        if (newBlock === undefined) {
          assert.fail();
        }

        const localReceiptRoot = newBlock.header.receiptTrie.toString("hex");
        const remoteReceiptRoot = rpcBlock.receiptsRoot.toString("hex");

        // We do some manual comparisons here to understand why the root of the receipt tries differ.
        if (localReceiptRoot !== remoteReceiptRoot) {
          for (let i = 0; i < block.transactions.length; i++) {
            const tx = block.transactions[i];
            const txHash = bufferToHex(tx.hash(true));

            const remoteReceipt = (await forkClient["_httpProvider"].request({
              method: "eth_getTransactionReceipt",
              params: [txHash],
            })) as any;

            const localReceipt = result.receipts[i];
            const evmResult = result.results[i];

            assert.equal(
              bufferToHex(localReceipt.bitvector),
              remoteReceipt.logsBloom,
              `Logs bloom of tx index ${i} (${txHash}) should match`
            );

            assert.equal(
              numberToRpcQuantity(evmResult.gasUsed.toNumber()),
              remoteReceipt.gasUsed,
              `Gas used of tx index ${i} (${txHash}) should match`
            );

            assert.equal(
              localReceipt.status,
              remoteReceipt.status,
              `Status of tx index ${i} (${txHash}) should be the same`
            );

            assert.equal(
              evmResult.createdAddress === undefined
                ? undefined
                : `0x${evmResult.createdAddress.toString("hex")}`,
              remoteReceipt.contractAddress,
              `Contract address created by tx index ${i} (${txHash}) should be the same`
            );
          }
        }

        assert.equal(
          localReceiptRoot,
          remoteReceiptRoot,
          "The root of the receipts trie is different than expected"
        );
      });
    }
  });
});
