import { assert } from "chai";
import { zeroAddress } from "ethereumjs-util";
import sinon from "sinon";

import {
  bufferToRpcData,
  numberToRpcQuantity,
  RpcBlockOutput,
  RpcTransactionOutput,
} from "../../../../../src/internal/hardhat-network/provider/output";
import { getCurrentTimestamp } from "../../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { EthereumProvider } from "../../../../../src/types";
import { useEnvironment } from "../../../../helpers/environment";
import { useFixtureProject } from "../../../../helpers/project";
import {
  assertInvalidArgumentsError,
  assertLatestBlockNumber,
  assertQuantity,
} from "../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../helpers/contracts";
import { quantityToBN, quantityToNumber } from "../../helpers/conversions";
import { setCWD } from "../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../helpers/providers";
import { retrieveForkBlockNumber } from "../../helpers/retrieveForkBlockNumber";
import { sleep } from "../../helpers/sleep";
import { waitForAssert } from "../../helpers/waitForAssert";

async function deployContract(
  provider: EthereumProvider,
  deploymentCode: string
) {
  const hash = await provider.send("eth_sendTransaction", [
    {
      from: DEFAULT_ACCOUNTS_ADDRESSES[0],
      data: deploymentCode,
      gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
    },
  ]);

  const { contractAddress } = await provider.send("eth_getTransactionReceipt", [
    hash,
  ]);

  return contractAddress;
}

describe("Evm module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      const getBlockNumber = async () => {
        return quantityToNumber(
          await this.ctx.provider.send("eth_blockNumber")
        );
      };

      describe("evm_increaseTime", async function () {
        it("should increase the offset of time used for block timestamps", async function () {
          const blockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(21000),
            gasPrice: numberToRpcQuantity(1),
          };

          const firstBlock = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(blockNumber),
            false,
          ]);

          await this.provider.send("evm_increaseTime", [123]);

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          const secondBlock = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(blockNumber + 1),
            false,
          ]);

          await this.provider.send("evm_increaseTime", [456]);

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          const thirdBlock = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(blockNumber + 2),
            false,
          ]);

          const firstTimestamp = quantityToNumber(firstBlock.timestamp);
          const secondTimestamp = quantityToNumber(secondBlock.timestamp);
          const thirdTimestamp = quantityToNumber(thirdBlock.timestamp);

          assert.isAtLeast(secondTimestamp - firstTimestamp, 123);
          assert.isAtLeast(thirdTimestamp - secondTimestamp, 456);
        });

        it("should return the total offset as a decimal string, not a QUANTITY", async function () {
          let totalOffset = await this.provider.send("evm_increaseTime", [123]);
          assert.isString(totalOffset);
          assert.strictEqual(parseInt(totalOffset, 10), 123);

          totalOffset = await this.provider.send("evm_increaseTime", [3456789]);
          assert.isString(totalOffset);
          assert.strictEqual(parseInt(totalOffset, 10), 123 + 3456789);
        });

        it("should expect an actual number as its first param, not a hex string", async function () {
          await assertInvalidArgumentsError(this.provider, "evm_increaseTime", [
            numberToRpcQuantity(123),
          ]);
        });
      });

      describe("evm_setNextBlockTimestamp", async function () {
        it("should set next block timestamp and the next EMPTY block will be mined with that timestamp", async function () {
          const timestamp = getCurrentTimestamp() + 60;

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_mine", []);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assertQuantity(block.timestamp, timestamp);
        });
        it("should set next block timestamp and the next tx will be mined with that timestamp", async function () {
          const timestamp = getCurrentTimestamp() + 70;

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assertQuantity(block.timestamp, timestamp);
        });
        it("should be able to set and replace an existing 'next block timestamp'", async function () {
          const timestamp = getCurrentTimestamp() + 60;

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_setNextBlockTimestamp", [
            timestamp + 10,
          ]);
          await this.provider.send("evm_mine", []);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assertQuantity(block.timestamp, timestamp + 10);
        });
        it("should be reset after the next block is mined", async function () {
          const timestamp = getCurrentTimestamp() + 60;

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.isTrue(quantityToNumber(block.timestamp) > timestamp);
        });
        it("should be overridden if next EMPTY block is mined with timestamp", async function () {
          const timestamp = getCurrentTimestamp() + 90;

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_mine", [timestamp + 100]);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assertQuantity(block.timestamp, timestamp + 100);
        });
        it("should also advance time offset for future blocks", async function () {
          let timestamp = getCurrentTimestamp() + 70;
          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_mine", []);

          timestamp = getCurrentTimestamp() + 90;
          await this.provider.send("evm_mine", [timestamp]);

          timestamp = getCurrentTimestamp() + 120;
          await this.provider.send("evm_mine", [timestamp]);

          await this.provider.send("evm_mine", []);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.isTrue(quantityToNumber(block.timestamp) > timestamp);
        });
        it("shouldn't set if specified timestamp is less or equal to the previous block", async function () {
          const timestamp = getCurrentTimestamp() + 70;
          await this.provider.send("evm_mine", [timestamp]);

          this.provider
            .send("evm_setNextBlockTimestamp", [timestamp - 1])
            .then(function () {
              assert.fail("should have failed setting next block timestamp");
            })
            .catch(function () {});

          this.provider
            .send("evm_setNextBlockTimestamp", [timestamp])
            .then(function () {
              assert.fail("should have failed setting next block timestamp");
            })
            .catch(function () {});
        });

        it("should advance the time offset accordingly to the timestamp", async function () {
          let timestamp = getCurrentTimestamp() + 70;
          await this.provider.send("evm_mine", [timestamp]);
          await this.provider.send("evm_mine");
          await this.provider.send("evm_setNextBlockTimestamp", [
            timestamp + 100,
          ]);
          await this.provider.send("evm_mine");
          await this.provider.send("evm_increaseTime", [30]);
          await this.provider.send("evm_mine");
          timestamp = getCurrentTimestamp();
          // 200 - 1 as we use ceil to round time to seconds
          assert.isTrue(timestamp >= 199);
        });

        describe("When the initial date is in the past", function () {
          // These test use a Hardhat Network instance with an initialDate in the
          // past. We do this by using a fixture project and useEnvironment(),
          // so instead of using this.provider they must use
          // this.env.network.provider

          useFixtureProject("hardhat-network-initial-date");
          useEnvironment();

          it("should still set the nextBlockTimestamp if it is less than the real time but larger than the previous block", async function () {
            const timestamp = getCurrentTimestamp();

            await this.env.network.provider.send("evm_mine", [
              timestamp - 1000,
            ]);
            const latestBlock = await this.env.network.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );

            assertQuantity(latestBlock.timestamp, timestamp - 1000);

            await this.env.network.provider.send("evm_setNextBlockTimestamp", [
              timestamp - 500,
            ]);

            await this.env.network.provider.send("evm_mine");
            const latestBlock2 = await this.env.network.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            assertQuantity(latestBlock2.timestamp, timestamp - 500);
          });
        });
      });

      describe("evm_mine", async function () {
        it("should mine empty blocks", async function () {
          const firstBlock = await getFirstBlock();
          await this.provider.send("evm_mine");

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlock + 1), false]
          );

          assert.isEmpty(block.transactions);

          await this.provider.send("evm_mine");

          const block2: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlock + 2), false]
          );

          assert.isEmpty(block2.transactions);
        });

        it("should mine an empty block with exact timestamp", async function () {
          const blockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const timestamp = getCurrentTimestamp() + 60;
          await this.provider.send("evm_mine", [timestamp]);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(blockNumber + 1), false]
          );

          assertQuantity(block.timestamp, timestamp);
        });

        it("should mine an empty block with the timestamp and other later blocks have higher timestamp", async function () {
          const blockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const timestamp = getCurrentTimestamp() + 60;
          await this.provider.send("evm_mine", [timestamp]);
          await this.provider.send("evm_mine");
          await this.provider.send("evm_mine");

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(blockNumber + 2), false]
          );

          assert.isTrue(quantityToNumber(block.timestamp) > timestamp);
        });

        describe("tests using sinon", () => {
          let sinonClock: sinon.SinonFakeTimers;

          beforeEach(() => {
            sinonClock = sinon.useFakeTimers({
              now: Date.now(),
              toFake: ["Date", "setTimeout", "clearTimeout"],
            });
          });

          afterEach(async function () {
            await this.provider.send("evm_setIntervalMining", [
              { enabled: false },
            ]);
            sinonClock.restore();
          });

          it("should handle race condition with interval mining", async function () {
            const interval = 5000;
            const initialBlock = await getBlockNumber();
            await this.provider.send("evm_setIntervalMining", [
              { enabled: true, blockTime: interval },
            ]);

            await sinonClock.tickAsync(interval);
            await this.provider.send("evm_mine");

            const currentBlock = await getBlockNumber();
            assert.equal(currentBlock, initialBlock + 2);
          });
        });
      });

      describe("evm_setAutomineEnabled", () => {
        it("should allow disabling automine", async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);
          const previousBlock = await this.provider.send("eth_blockNumber");
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
            },
          ]);
          const currentBlock = await this.provider.send("eth_blockNumber");

          assert.equal(currentBlock, previousBlock);
        });

        it("should allow re-enabling of automine", async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);
          await this.provider.send("evm_setAutomineEnabled", [true]);
          const previousBlock = await this.provider.send("eth_blockNumber");
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
            },
          ]);
          const currentBlock = await this.provider.send("eth_blockNumber");

          assertQuantity(currentBlock, quantityToBN(previousBlock).addn(1));
        });
      });

      describe("evm_setIntervalMining", () => {
        it("validates blockTime parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "evm_setIntervalMining",
            [{ enabled: false, blockTime: -10 }]
          );
        });

        describe("time based tests", () => {
          beforeEach(async function () {
            await this.provider.send("evm_setAutomineEnabled", [false]);

            if (isFork) {
              // This is done to speed up subsequent mineBlock calls made by MiningTimer.
              // On first mineBlock call there are many calls to JSON RPC provider which slow things down.
              await this.provider.send("evm_mine");
            }
          });

          describe("using sinon", () => {
            let sinonClock: sinon.SinonFakeTimers;

            beforeEach(() => {
              sinonClock = sinon.useFakeTimers({
                now: Date.now(),
                toFake: ["Date", "setTimeout", "clearTimeout"],
              });
            });

            afterEach(async function () {
              await this.provider.send("evm_setIntervalMining", [
                { enabled: false },
              ]);
              sinonClock.restore();
            });

            it("should allow enabling interval mining", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [
                { enabled: true, blockTime: interval },
              ]);

              await sinonClock.tickAsync(interval);

              await waitForAssert(10, async () => {
                const currentBlock = await getBlockNumber();
                assert.equal(currentBlock, initialBlock + 1);
              });
            });

            it("should continuously mine new blocks after each interval", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [
                { enabled: true, blockTime: interval },
              ]);

              await sinonClock.tickAsync(interval);

              await waitForAssert(10, async () => {
                const currentBlock = await getBlockNumber();
                assert.equal(currentBlock, initialBlock + 1);
              });

              await sinonClock.tickAsync(interval);

              await waitForAssert(10, async () => {
                const currentBlock = await getBlockNumber();
                assert.equal(currentBlock, initialBlock + 2);
              });

              await sinonClock.tickAsync(interval);

              await waitForAssert(10, async () => {
                const currentBlock = await getBlockNumber();
                assert.equal(currentBlock, initialBlock + 3);
              });
            });
          });

          describe("using sleep", () => {
            afterEach(async function () {
              await this.provider.send("evm_setIntervalMining", [
                { enabled: false },
              ]);
            });

            it("should allow disabling interval mining", async function () {
              const interval = 1000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [
                { enabled: true, blockTime: interval },
              ]);

              await sleep(1.7 * interval);

              const nextBlock = await getBlockNumber();

              assert.equal(nextBlock, initialBlock + 1);

              await this.provider.send("evm_setIntervalMining", [
                { enabled: false, blockTime: interval * 2 },
              ]);

              await sleep(interval);

              const currentBlock = await getBlockNumber();

              assert.equal(currentBlock, initialBlock + 1);
            });

            it("should mine block with transaction after the interval", async function () {
              const interval = 1000;
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: "0x1111111111111111111111111111111111111111",
                  nonce: numberToRpcQuantity(0),
                },
              ]);

              await this.provider.send("evm_setIntervalMining", [
                { enabled: true, blockTime: interval },
              ]);

              await sleep(1.7 * interval);

              const currentBlock = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assert.lengthOf(currentBlock.transactions, 1);
              assert.equal(currentBlock.transactions[0], txHash);

              const txReceipt = await this.provider.send(
                "eth_getTransactionReceipt",
                [txHash]
              );

              assert.isNotNull(txReceipt);
            });
          });
        });
      });

      describe("evm_snapshot", async function () {
        it("returns the snapshot id starting at 1", async function () {
          const id1: string = await this.provider.send("evm_snapshot", []);
          const id2: string = await this.provider.send("evm_snapshot", []);
          const id3: string = await this.provider.send("evm_snapshot", []);

          assert.equal(id1, "0x1");
          assert.equal(id2, "0x2");
          assert.equal(id3, "0x3");
        });

        it("Doesn't repeat snapshot ids after revert is called", async function () {
          const id1: string = await this.provider.send("evm_snapshot", []);
          const reverted: boolean = await this.provider.send("evm_revert", [
            id1,
          ]);
          const id2: string = await this.provider.send("evm_snapshot", []);

          assert.equal(id1, "0x1");
          assert.isTrue(reverted);
          assert.equal(id2, "0x2");
        });
      });

      describe("evm_revert", async function () {
        let sinonClock: sinon.SinonFakeTimers | undefined;

        afterEach(function () {
          if (sinonClock !== undefined) {
            sinonClock.restore();
            sinonClock = undefined;
          }
        });

        it("Returns false for non-existing ids", async function () {
          const reverted1: boolean = await this.provider.send("evm_revert", [
            "0x1",
          ]);
          const reverted2: boolean = await this.provider.send("evm_revert", [
            "0x2",
          ]);
          const reverted3: boolean = await this.provider.send("evm_revert", [
            "0x0",
          ]);

          assert.isFalse(reverted1);
          assert.isFalse(reverted2);
          assert.isFalse(reverted3);
        });

        it("Returns false for already reverted ids", async function () {
          const id1: string = await this.provider.send("evm_snapshot", []);
          const reverted: boolean = await this.provider.send("evm_revert", [
            id1,
          ]);
          const reverted2: boolean = await this.provider.send("evm_revert", [
            id1,
          ]);

          assert.isTrue(reverted);
          assert.isFalse(reverted2);
        });

        it("Deletes blocks mined after snapshot", async function () {
          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );
          const initialLatestBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          await this.provider.send("evm_mine");
          await this.provider.send("evm_mine");
          await this.provider.send("evm_mine");
          await this.provider.send("evm_mine");
          const latestBlockBeforeReverting = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const newLatestBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );
          assert.equal(newLatestBlock.hash, initialLatestBlock.hash);

          const blockByHash = await this.provider.send("eth_getBlockByHash", [
            bufferToRpcData(latestBlockBeforeReverting.hash),
            false,
          ]);
          assert.isNull(blockByHash);

          const blockByNumber = await this.provider.send(
            "eth_getBlockByNumber",
            [latestBlockBeforeReverting.number, false]
          );
          assert.isNull(blockByNumber);
        });

        it("Deletes transactions mined after snapshot", async function () {
          const [from] = await this.provider.send("eth_accounts");

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const txHashAfter = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );
          assert.isNull(txHashAfter);
        });

        it("Deletes pending transactions added after snapshot", async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);

          const [from] = await this.provider.send("eth_accounts");

          const snapshotId: string = await this.provider.send("evm_snapshot");

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          const pendingTransactionsBefore = await this.provider.send(
            "eth_pendingTransactions"
          );
          assert.lengthOf(pendingTransactionsBefore, 2);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const pendingTransactionsAfter = await this.provider.send(
            "eth_pendingTransactions"
          );
          assert.lengthOf(pendingTransactionsAfter, 0);
        });

        it("Re-adds the transactions that were mined after snapshot to the tx pool", async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);

          const [from] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          const snapshotId: string = await this.provider.send("evm_snapshot");

          await this.provider.send("evm_mine");

          const pendingTransactionsBefore = await this.provider.send(
            "eth_pendingTransactions"
          );
          assert.lengthOf(pendingTransactionsBefore, 0);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const pendingTransactionsAfter = await this.provider.send(
            "eth_pendingTransactions"
          );
          assert.lengthOf(pendingTransactionsAfter, 2);
        });

        it("TxPool state reverts back correctly to the snapshot state", async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);

          const txHash1 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              nonce: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          const txHash2 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              nonce: numberToRpcQuantity(3),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          const snapshotId: string = await this.provider.send("evm_snapshot");

          const txHash3 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              nonce: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          await this.provider.send("eth_pendingTransactions");

          await this.provider.send("evm_mine");

          const currentBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.lengthOf(currentBlock.transactions, 2);
          assert.sameDeepMembers(currentBlock.transactions, [txHash1, txHash3]);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const pendingTransactions: RpcTransactionOutput[] = await this.provider.send(
            "eth_pendingTransactions"
          );
          assert.sameDeepMembers(
            pendingTransactions.map((tx) => tx.hash),
            [txHash1, txHash2]
          );
        });

        it("Allows resending the same tx after a revert", async function () {
          const [from] = await this.provider.send("eth_accounts");

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          const txParams = {
            from,
            to: "0x1111111111111111111111111111111111111111",
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(100000),
            gasPrice: numberToRpcQuantity(1),
            nonce: numberToRpcQuantity(0),
          };

          const txHash = await this.provider.send("eth_sendTransaction", [
            txParams,
          ]);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const txHash2 = await this.provider.send("eth_sendTransaction", [
            txParams,
          ]);

          assert.equal(txHash2, txHash);
        });

        it("Deletes the used snapshot and the following ones", async function () {
          const snapshotId1: string = await this.provider.send(
            "evm_snapshot",
            []
          );
          const snapshotId2: string = await this.provider.send(
            "evm_snapshot",
            []
          );
          const snapshotId3: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          const revertedTo2: boolean = await this.provider.send("evm_revert", [
            snapshotId2,
          ]);
          assert.isTrue(revertedTo2);

          const revertedTo3: boolean = await this.provider.send("evm_revert", [
            snapshotId3,
          ]);
          // snapshot 3 didn't exist anymore
          assert.isFalse(revertedTo3);

          const revertedTo1: boolean = await this.provider.send("evm_revert", [
            snapshotId1,
          ]);
          // snapshot 1 still existed
          assert.isTrue(revertedTo1);
        });

        it("Resets the blockchain so that new blocks are added with the right numbers", async function () {
          const blockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          await this.provider.send("evm_mine");
          await this.provider.send("evm_mine");

          await assertLatestBlockNumber(this.provider, blockNumber + 2);

          const snapshotId1: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          await this.provider.send("evm_mine");

          await assertLatestBlockNumber(this.provider, blockNumber + 3);

          const revertedTo1: boolean = await this.provider.send("evm_revert", [
            snapshotId1,
          ]);
          assert.isTrue(revertedTo1);

          await assertLatestBlockNumber(this.provider, blockNumber + 2);

          await this.provider.send("evm_mine");

          await assertLatestBlockNumber(this.provider, blockNumber + 3);

          await this.provider.send("evm_mine");

          const snapshotId2: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          await this.provider.send("evm_mine");

          await this.provider.send("evm_mine");

          await assertLatestBlockNumber(this.provider, blockNumber + 6);

          const revertedTo2: boolean = await this.provider.send("evm_revert", [
            snapshotId2,
          ]);
          assert.isTrue(revertedTo2);

          await assertLatestBlockNumber(this.provider, blockNumber + 4);
        });

        it("Resets the date to the right time", async function () {
          const mineEmptyBlock = async () => {
            await this.provider.send("evm_mine");
            return this.provider.send("eth_getBlockByNumber", [
              "latest",
              false,
            ]);
          };

          sinonClock = sinon.useFakeTimers({
            now: Date.now(),
            toFake: ["Date"],
          });

          await this.provider.send("evm_increaseTime", [100]);
          const snapshotBlock = await mineEmptyBlock();
          const snapshotId = await this.provider.send("evm_snapshot");

          assert.equal(
            quantityToNumber(snapshotBlock.timestamp),
            getCurrentTimestamp() + 100
          );

          sinonClock.tick(20 * 1000);

          await this.provider.send("evm_revert", [snapshotId]);
          const afterRevertBlock = await mineEmptyBlock();

          // Check that time was correctly reverted to the snapshot time and that the new
          // block's timestamp has been incremented to avoid timestamp collision
          assert.equal(
            quantityToNumber(afterRevertBlock.timestamp),
            quantityToNumber(snapshotBlock.timestamp) + 1
          );
        });

        it("Restores the previous state", async function () {
          // This is a very coarse test, as we know that the entire state is
          // managed by the vm, and is restored as a whole
          const [from] = await this.provider.send("eth_accounts");

          const balanceBeforeTx = await this.provider.send("eth_getBalance", [
            from,
          ]);

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          const txParams = {
            from,
            to: "0x1111111111111111111111111111111111111111",
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(100000),
            gasPrice: numberToRpcQuantity(1),
            nonce: numberToRpcQuantity(0),
          };

          await this.provider.send("eth_sendTransaction", [txParams]);

          const balanceAfterTx = await this.provider.send("eth_getBalance", [
            from,
          ]);

          assert.notEqual(balanceAfterTx, balanceBeforeTx);

          const reverted: boolean = await this.provider.send("evm_revert", [
            snapshotId,
          ]);
          assert.isTrue(reverted);

          const balanceAfterRevert = await this.provider.send(
            "eth_getBalance",
            [from]
          );

          assert.equal(balanceAfterRevert, balanceBeforeTx);
        });
      });
    });
  });
});
