import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import sinon from "sinon";

import {
  numberToRpcQuantity,
  rpcDataToBigInt,
  rpcQuantityToBigInt,
  rpcQuantityToNumber,
} from "../../../../../src/internal/core/jsonrpc/types/base-types";
import {
  RpcBlockOutput,
  RpcTransactionOutput,
} from "../../../../../src/internal/hardhat-network/provider/output";
import { getCurrentTimestamp } from "../../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { useEnvironment } from "../../../../helpers/environment";
import { useFixtureProject } from "../../../../helpers/project";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidArgumentsError,
  assertInvalidInputError,
  assertLatestBlockNumber,
  assertQuantity,
} from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../helpers/constants";
import {
  EXAMPLE_CONTRACT,
  EXAMPLE_READ_CONTRACT,
} from "../../helpers/contracts";
import { setCWD } from "../../helpers/cwd";
import { getPendingBaseFeePerGas } from "../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../helpers/providers";
import { retrieveForkBlockNumber } from "../../helpers/retrieveForkBlockNumber";
import { sleep } from "../../helpers/sleep";
import { deployContract } from "../../helpers/transactions";

describe("Evm module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      const getBlockNumber = async () => {
        return rpcQuantityToNumber(
          await this.ctx.provider.send("eth_blockNumber")
        );
      };

      describe("evm_increaseTime", async function () {
        it("should increase the offset of time used for block timestamps", async function () {
          const blockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(21000),
            maxFeePerGas: numberToRpcQuantity(
              await getPendingBaseFeePerGas(this.provider)
            ),
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

          const firstTimestamp = rpcQuantityToNumber(firstBlock.timestamp);
          const secondTimestamp = rpcQuantityToNumber(secondBlock.timestamp);
          const thirdTimestamp = rpcQuantityToNumber(thirdBlock.timestamp);

          assert.isAtLeast(secondTimestamp - firstTimestamp, 123);
          assert.isAtLeast(thirdTimestamp - secondTimestamp, 456);
        });

        it("should return the total offset as a decimal string, not a QUANTITY", async function () {
          // get the current offset
          const initialOffset = parseInt(
            await this.provider.send("evm_increaseTime", [0]),
            10
          );

          let totalOffset = await this.provider.send("evm_increaseTime", [123]);
          assert.isString(totalOffset);
          assert.strictEqual(parseInt(totalOffset, 10), initialOffset + 123);

          totalOffset = await this.provider.send("evm_increaseTime", [3456789]);
          assert.isString(totalOffset);
          assert.strictEqual(
            parseInt(totalOffset, 10),
            initialOffset + 123 + 3456789
          );
        });

        it("should accept a hex string param", async function () {
          const originalOffset = parseInt(
            await this.provider.send("evm_increaseTime", [
              numberToRpcQuantity(0),
            ]),
            10
          );
          const offset1 = 123;
          const offset2 = 1000;
          const totalOffset1 = parseInt(
            await this.provider.send("evm_increaseTime", [
              numberToRpcQuantity(offset1),
            ]),
            10
          );
          const totalOffset2 = parseInt(
            await this.provider.send("evm_increaseTime", [
              numberToRpcQuantity(offset2),
            ]),
            10
          );
          assert.strictEqual(totalOffset1, originalOffset + offset1);
          assert.strictEqual(totalOffset2, originalOffset + offset1 + offset2);
        });
      });

      describe("evm_setNextBlockTimestamp", async function () {
        for (const { description, prepare } of [
          {
            description: "without any special preparation",
            prepare: () => {},
          },
          {
            description: "with hardhat_mine executed beforehand",
            prepare: async () => {
              await this.ctx.provider.send("hardhat_mine", ["0x4", "0x2"]);
            },
          },
        ]) {
          describe(description, function () {
            beforeEach(prepare);
            it("should set next block timestamp and the next EMPTY block will be mined with that timestamp", async function () {
              const timestamp = getCurrentTimestamp() + 60;

              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
              await this.provider.send("evm_mine", []);

              const block: RpcBlockOutput = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assertQuantity(block.timestamp, timestamp);
            });
            it("should set next block timestamp and the next tx will be mined with that timestamp", async function () {
              const timestamp = getCurrentTimestamp() + 70;

              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
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

              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
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

              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
              await this.provider.send("evm_mine", []);
              await this.provider.send("evm_mine", []);

              const block: RpcBlockOutput = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assert.isTrue(rpcQuantityToNumber(block.timestamp) > timestamp);
            });
            it("should be overridden if next EMPTY block is mined with timestamp", async function () {
              const timestamp = getCurrentTimestamp() + 90;

              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
              await this.provider.send("evm_mine", [timestamp + 100]);

              const block: RpcBlockOutput = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assertQuantity(block.timestamp, timestamp + 100);
            });
            it("should also advance time offset for future blocks", async function () {
              let timestamp = getCurrentTimestamp() + 70;
              await this.provider.send("evm_setNextBlockTimestamp", [
                timestamp,
              ]);
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

              assert.isTrue(rpcQuantityToNumber(block.timestamp) > timestamp);
            });
            it("shouldn't set if specified timestamp is less or equal to the previous block", async function () {
              const timestamp = getCurrentTimestamp() + 70;
              await this.provider.send("evm_mine", [timestamp]);

              await assertInvalidInputError(
                this.provider,
                "evm_setNextBlockTimestamp",
                [timestamp - 1],
                `Timestamp ${
                  timestamp - 1
                } is lower than the previous block's timestamp ${timestamp}`
              );

              await assertInvalidInputError(
                this.provider,
                "evm_setNextBlockTimestamp",
                [timestamp],
                `Timestamp ${timestamp} is equal to the previous block's timestamp`
              );
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

            it("should accept a hex string param", async function () {
              const timestamp = getCurrentTimestamp() + 60;

              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(timestamp),
              ]);
              await this.provider.send("evm_mine", []);

              const block: RpcBlockOutput = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assertQuantity(block.timestamp, timestamp);
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

                await this.env.network.provider.send(
                  "evm_setNextBlockTimestamp",
                  [timestamp - 500]
                );

                await this.env.network.provider.send("evm_mine");
                const latestBlock2 = await this.env.network.provider.send(
                  "eth_getBlockByNumber",
                  ["latest", false]
                );
                assertQuantity(latestBlock2.timestamp, timestamp - 500);
              });
            });
          });
        }
      });

      describe("evm_setBlockGasLimit", () => {
        it("validates block gas limit", async function () {
          await assertInvalidInputError(
            this.provider,
            "evm_setBlockGasLimit",
            [numberToRpcQuantity(0)],
            "Block gas limit must be greater than 0"
          );
        });

        it("sets a new block gas limit", async function () {
          const blockBefore = await this.provider.send("eth_getBlockByNumber", [
            "pending",
            false,
          ]);
          const gasLimitBefore = rpcQuantityToNumber(blockBefore.gasLimit);

          const newBlockGasLimit = 34228;
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(newBlockGasLimit),
          ]);

          const blockAfter = await this.provider.send("eth_getBlockByNumber", [
            "pending",
            false,
          ]);
          const gasLimitAfter = rpcQuantityToNumber(blockAfter.gasLimit);

          assert.notEqual(gasLimitBefore, gasLimitAfter);
          assert.equal(gasLimitAfter, newBlockGasLimit);
        });

        it("removes transactions that exceed the new block gas limit from the mempool", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const tx1Hash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(21_000),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(40_000),
            },
          ]);

          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(21_000),
          ]);

          const pendingTransactions = await this.provider.send(
            "eth_pendingTransactions"
          );

          assert.lengthOf(pendingTransactions, 1);
          assert.equal(pendingTransactions[0].hash, tx1Hash);
        });

        it("pending block works after removing a pending tx (first tx is dropped)", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(30_000),
              nonce: numberToRpcQuantity(0),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(21_000),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          // this removes the first transaction
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(25_000),
          ]);

          const pendingBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["pending", false]
          );

          assert.lengthOf(pendingBlock.transactions, 0);
        });

        it("pending block works after removing a pending tx (second tx is dropped)", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const tx1Hash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(21_000),
              nonce: numberToRpcQuantity(0),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              gas: numberToRpcQuantity(30_000),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          // this removes the second transaction
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(25_000),
          ]);

          const pendingBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["pending", false]
          );

          assert.deepEqual(pendingBlock.transactions, [tx1Hash]);
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
          const blockNumber = rpcQuantityToNumber(
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
          const blockNumber = rpcQuantityToNumber(
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

          assert.isTrue(rpcQuantityToNumber(block.timestamp) > timestamp);
        });

        it("should mine transactions with original gasLimit values", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[1]
          );

          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(2n * DEFAULT_BLOCK_GAS_LIMIT),
          ]);

          const tx1Hash = await this.provider.send("eth_sendTransaction", [
            {
              nonce: numberToRpcQuantity(1),
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: contractAddress,
              data: EXAMPLE_READ_CONTRACT.selectors.gasLeft,
              gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
            },
          ]);

          const tx2Hash = await this.provider.send("eth_sendTransaction", [
            {
              nonce: numberToRpcQuantity(2),
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: contractAddress,
              data: EXAMPLE_READ_CONTRACT.selectors.gasLeft,
              gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
            },
          ]);

          await this.provider.send("evm_mine");

          const [logTx1, logTx2] = await this.provider.send("eth_getLogs", [
            { address: contractAddress },
          ]);

          const gasUsedUntilGasLeftCall = 21_185n; // value established empirically using Remix on Rinkeby network
          const expectedGasLeft =
            DEFAULT_BLOCK_GAS_LIMIT - gasUsedUntilGasLeftCall;

          assert.equal(logTx1.transactionHash, tx1Hash);
          assert.equal(logTx2.transactionHash, tx2Hash);
          assert.equal(rpcDataToBigInt(logTx1.data), expectedGasLeft);
          assert.equal(rpcDataToBigInt(logTx2.data), expectedGasLeft);
        });

        it("should accept a hex string param", async function () {
          const blockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const timestamp = getCurrentTimestamp() + 60;
          await this.provider.send("evm_mine", [
            numberToRpcQuantity(timestamp),
          ]);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(blockNumber + 1), false]
          );

          assertQuantity(block.timestamp, timestamp);
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
            await this.provider.send("evm_setIntervalMining", [0]);
            sinonClock.restore();
          });

          it("should handle race condition with interval mining", async function () {
            const interval = 5000;
            const initialBlock = await getBlockNumber();
            await this.provider.send("evm_setIntervalMining", [interval]);

            await sinonClock.tickAsync(interval);
            await this.provider.send("evm_mine");

            const currentBlock = await getBlockNumber();
            assert.equal(currentBlock, initialBlock + 2);
          });
        });
      });

      describe("evm_setAutomine", () => {
        it("should allow disabling automine", async function () {
          await this.provider.send("evm_setAutomine", [false]);
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
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("evm_setAutomine", [true]);
          const previousBlock = await this.provider.send("eth_blockNumber");
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
            },
          ]);
          const currentBlock = await this.provider.send("eth_blockNumber");

          assertQuantity(currentBlock, rpcQuantityToBigInt(previousBlock) + 1n);
        });

        it("should mine all pending transactions after re-enabling automine", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const txHash1 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: "0x1111111111111111111111111111111111111111",
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          await this.provider.send("evm_setAutomine", [true]);

          const txHash2 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: "0x1111111111111111111111111111111111111111",
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          const currentBlock = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.lengthOf(currentBlock.transactions, 2);
          assert.sameDeepMembers(currentBlock.transactions, [txHash1, txHash2]);
        });
      });

      describe("evm_setIntervalMining", () => {
        it("validates blockTime parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "evm_setIntervalMining",
            [-10]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "evm_setIntervalMining",
            [[2000, 1000]]
          );
        });

        describe("time based tests", () => {
          beforeEach(async function () {
            await this.provider.send("evm_setAutomine", [false]);

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
              await this.provider.send("evm_setIntervalMining", [0]);
              sinonClock.restore();
            });

            it("should allow enabling interval mining", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [interval]);

              await sinonClock.tickAsync(interval);

              const currentBlock = await getBlockNumber();
              assert.equal(currentBlock, initialBlock + 1);
            });

            it("should continuously mine new blocks after each interval", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [interval]);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 1);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 2);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 3);
            });

            it("should mine blocks when a range is used", async function () {
              const interval = [4000, 5000];
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [interval]);

              // no block should be mined before the min value of the range
              await sinonClock.tickAsync(3999);
              assert.equal(await getBlockNumber(), initialBlock);

              // when the max value has passed, one block should'be been mined
              await sinonClock.tickAsync(1001);
              assert.equal(await getBlockNumber(), initialBlock + 1);

              // after another 5 seconds, another block should be mined
              await sinonClock.tickAsync(5000);
              assert.equal(await getBlockNumber(), initialBlock + 2);
            });

            it("should disable interval mining when 0 is passed", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [interval]);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 1);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 2);

              await this.provider.send("evm_setIntervalMining", [0]);

              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 2);
              await sinonClock.tickAsync(interval);
              assert.equal(await getBlockNumber(), initialBlock + 2);
            });

            const sendTx = async (nonce: number) =>
              this.ctx.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                  nonce: numberToRpcQuantity(nonce),
                },
              ]);

            const assertBlockWasMined = async (
              blockNumber: number,
              txHashes: string[]
            ) => {
              const block = await this.ctx.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );

              assert.equal(rpcQuantityToNumber(block.number), blockNumber);
              assert.deepEqual(block.transactions, txHashes);
            };

            it("automine and interval mining don't interfere with each other", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();

              await this.provider.send("evm_setAutomine", [false]);
              await this.provider.send("evm_setIntervalMining", [interval]);

              await sinonClock.tickAsync(interval);
              await assertBlockWasMined(initialBlock + 1, []);

              const txHash1 = await sendTx(0);
              await sinonClock.tickAsync(interval);
              await assertBlockWasMined(initialBlock + 2, [txHash1]);

              await this.provider.send("evm_setAutomine", [true]);

              await sinonClock.tickAsync(interval / 2);
              const txHash2 = await sendTx(1);
              await assertBlockWasMined(initialBlock + 3, [txHash2]);

              await sinonClock.tickAsync(interval / 2);
              await assertBlockWasMined(initialBlock + 4, []);
            });
          });

          describe("using sleep", () => {
            afterEach(async function () {
              await this.provider.send("evm_setIntervalMining", [0]);
            });

            it("should allow disabling interval mining", async function () {
              const interval = 100;
              const initialBlock = await getBlockNumber();
              await this.provider.send("evm_setIntervalMining", [interval]);

              await sleep(1.7 * interval);

              const nextBlock = await getBlockNumber();

              assert.equal(nextBlock, initialBlock + 1);

              await this.provider.send("evm_setIntervalMining", [interval * 2]);

              await sleep(interval);

              const currentBlock = await getBlockNumber();

              assert.equal(currentBlock, initialBlock + 1);
            });

            it("should mine block with transaction after the interval", async function () {
              const interval = 100;
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                  nonce: numberToRpcQuantity(0),
                },
              ]);

              await this.provider.send("evm_setIntervalMining", [interval]);

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
            latestBlockBeforeReverting.hash,
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
          const [, from] = await this.provider.send("eth_accounts");

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
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
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
          await this.provider.send("evm_setAutomine", [false]);

          const [, from] = await this.provider.send("eth_accounts");

          const snapshotId: string = await this.provider.send("evm_snapshot");

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
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
          await this.provider.send("evm_setAutomine", [false]);

          const [, from] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from,
              to: "0x1111111111111111111111111111111111111111",
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(100000),
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
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
          await this.provider.send("evm_setAutomine", [false]);

          const txHash1 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              nonce: numberToRpcQuantity(0),
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const txHash2 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              nonce: numberToRpcQuantity(3),
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const snapshotId: string = await this.provider.send("evm_snapshot");

          const txHash3 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              nonce: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21_000),
            },
          ]);

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

          const pendingTransactions: RpcTransactionOutput[] =
            await this.provider.send("eth_pendingTransactions");
          assert.sameDeepMembers(
            pendingTransactions.map((tx) => tx.hash),
            [txHash1, txHash2]
          );
        });

        it("Allows resending the same tx after a revert", async function () {
          const [, from] = await this.provider.send("eth_accounts");

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          const txParams = {
            from,
            to: "0x1111111111111111111111111111111111111111",
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(100000),
            maxFeePerGas: numberToRpcQuantity(
              await getPendingBaseFeePerGas(this.provider)
            ),
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
          const blockNumber = rpcQuantityToNumber(
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

        it("Restores the previous state", async function () {
          // This is a very coarse test, as we know that the entire state is
          // managed by the vm, and is restored as a whole
          const [, from] = await this.provider.send("eth_accounts");

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
            maxFeePerGas: numberToRpcQuantity(
              await getPendingBaseFeePerGas(this.provider)
            ),
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

        describe("tests using sinon", () => {
          let sinonClock: sinon.SinonFakeTimers;

          beforeEach(() => {
            sinonClock = sinon.useFakeTimers({
              now: Date.now(),
              toFake: ["Date", "setTimeout", "clearTimeout"],
            });
          });

          afterEach(async function () {
            await this.provider.send("evm_setIntervalMining", [0]);
            sinonClock.restore();
          });

          it("Resets the date to the right time", async function () {
            const mineEmptyBlock = async () => {
              await this.provider.send("evm_mine");
              return this.provider.send("eth_getBlockByNumber", [
                "latest",
                false,
              ]);
            };

            const firstBlock = await mineEmptyBlock();
            await this.provider.send("evm_increaseTime", [100]);
            const snapshotBlock = await mineEmptyBlock();
            const snapshotId = await this.provider.send("evm_snapshot");

            assert.equal(
              rpcQuantityToNumber(snapshotBlock.timestamp),
              rpcQuantityToNumber(firstBlock.timestamp) + 100
            );

            await sinonClock.tickAsync(20 * 1000);

            await this.provider.send("evm_revert", [snapshotId]);
            const afterRevertBlock = await mineEmptyBlock();

            // Check that time was correctly reverted to the snapshot time and that the new
            // block's timestamp has been incremented to avoid timestamp collision
            assert.equal(
              rpcQuantityToNumber(afterRevertBlock.timestamp),
              rpcQuantityToNumber(snapshotBlock.timestamp) + 1
            );
          });

          describe("when interval mining is enabled", () => {
            it("should handle race condition", async function () {
              const interval = 5000;
              const initialBlock = await getBlockNumber();
              const snapshotId = await this.provider.send("evm_snapshot");

              await this.provider.send("evm_setIntervalMining", [interval]);

              await sinonClock.tickAsync(interval);
              await this.provider.send("evm_revert", [snapshotId]);

              const currentBlock = await getBlockNumber();
              assert.equal(currentBlock, initialBlock);
            });
          });
        });
      });
    });

    describe(`${name} provider (allowBlocksWithSameTimestamp)`, function () {
      setCWD();
      useProvider({ allowBlocksWithSameTimestamp: true });

      describe("evm_setNextBlockTimestamp", async function () {
        it("should allow using the same timestamp as the previous block", async function () {
          const timestamp = getCurrentTimestamp() + 70;
          await this.provider.send("evm_mine", [timestamp]);

          await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);
          await this.provider.send("evm_mine", []);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assertQuantity(block.timestamp, timestamp);
        });

        it("shouldn't set if specified timestamp is less to the previous block", async function () {
          const timestamp = getCurrentTimestamp() + 70;
          await this.provider.send("evm_mine", [timestamp]);

          await assertInvalidInputError(
            this.provider,
            "evm_setNextBlockTimestamp",
            [timestamp - 1],
            `Timestamp ${
              timestamp - 1
            } is lower than the previous block's timestamp ${timestamp}`
          );
        });
      });
    });
  });
});
