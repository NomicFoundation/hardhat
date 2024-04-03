import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcBlockOutput } from "../../../../../../../src/internal/hardhat-network/provider/output";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_feeHistory", async function () {
        describe("Params validation", function () {
          it("Should validate that block count is in [1, 1024]", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(0), "latest"],
              "blockCount should be at least 1"
            );

            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(1025), "latest"],
              "blockCount should be at most 1024"
            );
          });

          it("Should validate that newestBlock exists", async function () {
            const block = 10n ** 10n;

            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(1), numberToRpcQuantity(block)],
              `Received invalid block tag ${block}`
            );
          });

          it("Should validate that percentiles are in [0, 100]", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(1), "latest", [1, 2, -1]],
              "The reward percentile number 3 is invalid. It must be a float between 0 and 100, but is -1 instead."
            );

            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(1), "latest", [100.1, 2, 3]],
              "The reward percentile number 1 is invalid. It must be a float between 0 and 100, but is 100.1 instead."
            );
          });

          it("Should validate that percentiles are sorted", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_feeHistory",
              [numberToRpcQuantity(1), "latest", [1, 2, 2, 1]],
              "The reward percentiles should be in non-decreasing order, but the percentile number 3 is greater than the next one"
            );
          });
        });

        describe("Reward percentiles", function () {
          it("Should not return the field reward if no percentiles were given", async function () {
            const { reward } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(1),
              "latest",
            ]);

            assert.isUndefined(reward);

            const { reward: reward2 } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(1), "latest", []]
            );

            assert.isUndefined(reward2);
          });

          it("Should give all 0s for empty blocks", async function () {
            await this.provider.send("evm_mine");

            const { reward } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(1),
              "latest",
              [50, 100],
            ]);

            assert.deepEqual(reward, [["0x0", "0x0"]]);
          });

          it("Should give all 0s for the pending block", async function () {
            // We first mine an empty block to normalize the forked networks
            await this.provider.send("evm_mine");

            const { reward } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(2),
              "pending",
              [50, 100],
            ]);

            assert.deepEqual(reward, [
              ["0x0", "0x0"],
              ["0x0", "0x0"],
            ]);
          });

          it("Should give the right values for a block with txs (0 base fee)", async function () {
            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x0",
            ]);

            const pendingBlock = await this.provider.send(
              "eth_getBlockByNumber",
              ["pending", false]
            );

            const gasLimit = rpcQuantityToNumber(pendingBlock.gasLimit);

            const tx1 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                maxPriorityFeePerGas: numberToRpcQuantity(2e9),
              },
            ]);

            const tx2 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                maxPriorityFeePerGas: numberToRpcQuantity(1e9),
              },
            ]);

            const tx3 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(100e9),
              },
            ]);

            await this.provider.send("evm_mine", []);

            const { effectiveGasPrice: effectiveGasPrice1 } =
              await this.provider.send("eth_getTransactionReceipt", [tx1]);

            const { effectiveGasPrice: effectiveGasPrice2 } =
              await this.provider.send("eth_getTransactionReceipt", [tx2]);

            const { effectiveGasPrice: effectiveGasPrice3 } =
              await this.provider.send("eth_getTransactionReceipt", [tx3]);

            const { reward } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(1),
              "latest",
              [
                // Percentile 0 should give the effective gas price of the first tx
                0,
                // Less than the gas of the first tx, so the first one should be used
                (21000 / gasLimit) * 100 * 0.5,
                // Exactly the gas of the first one. Should still be used.
                (21000 / gasLimit) * 100,
                // More than 1 tx's worth of gas. Should use the second one.
                (21000 / gasLimit) * 100 * 1.5,
                // Exactly 2 txs woth of gas. Should still use the 2nd one.
                (21000 / gasLimit) * 100 * 2,
                // 3 txs worth of gas, so should use the third one.
                (21000 / gasLimit) * 100 * 3,
                // Should use the third one.
                100,
              ],
            ]);

            // since the base fee is 0, the effective gas price is equal to the reward
            const expected = [
              [
                effectiveGasPrice2,
                effectiveGasPrice2,
                effectiveGasPrice2,
                effectiveGasPrice1,
                effectiveGasPrice1,
                effectiveGasPrice3,
                effectiveGasPrice3,
              ],
            ];

            assert.deepEqual(reward, expected);
          });

          it("Should give the right values for a block with txs (non-zero base fee)", async function () {
            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              numberToRpcQuantity(1e9),
            ]);

            const pendingBlock = await this.provider.send(
              "eth_getBlockByNumber",
              ["pending", false]
            );

            const gasLimit = rpcQuantityToNumber(pendingBlock.gasLimit);

            // reward is 1 gwei
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                maxFeePerGas: numberToRpcQuantity(10e9),
                maxPriorityFeePerGas: numberToRpcQuantity(1e9),
              },
            ]);

            // reward is 99 gwei
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(100e9),
              },
            ]);

            // reward is 9 gwei
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(10e9),
              },
            ]);

            await this.provider.send("evm_mine", []);

            const { reward } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(1),
              "latest",
              [
                // Percentile 0 should give the reward of the first tx
                0,
                // Less than the gas of the first tx, so the first one should be used
                (21000 / gasLimit) * 100 * 0.5,
                // Exactly the gas of the first one. Should still be used.
                (21000 / gasLimit) * 100,
                // More than 1 tx's worth of gas. Should use the second one.
                (21000 / gasLimit) * 100 * 1.5,
                // Exactly 2 txs woth of gas. Should still use the 2nd one.
                (21000 / gasLimit) * 100 * 2,
                // 3 txs worth of gas, so should use the third one.
                (21000 / gasLimit) * 100 * 3,
                // Should use the third one.
                100,
              ],
            ]);

            const expected = [
              [
                numberToRpcQuantity(1e9),
                numberToRpcQuantity(1e9),
                numberToRpcQuantity(1e9),
                numberToRpcQuantity(9e9),
                numberToRpcQuantity(9e9),
                numberToRpcQuantity(99e9),
                numberToRpcQuantity(99e9),
              ],
            ];

            assert.deepEqual(reward, expected);
          });
        });

        describe("Oldest block", function () {
          it("Should compute it based on the newest block and block count", async function () {
            const firstBlock = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber")
            );

            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);

            const { oldestBlock } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(2),
              "latest",
            ]);

            assert.equal(oldestBlock, numberToRpcQuantity(firstBlock + 2));

            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);

            const { oldestBlock: oldestBlock2 } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(3), numberToRpcQuantity(firstBlock + 4)]
            );

            assert.equal(oldestBlock2, numberToRpcQuantity(firstBlock + 2));
          });

          it("Should cap the oldestBlock in 0", async function () {
            // To test this in a forked network we should fork from a block < 1024
            if (isFork) {
              this.skip();
            }

            const firstBlock = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber")
            );

            const { oldestBlock } = await this.provider.send("eth_feeHistory", [
              numberToRpcQuantity(1024),
              "latest",
            ]);

            assert.equal(oldestBlock, firstBlock);
          });
        });

        describe("gasUsedRatio", function () {
          it("Should compute it for mined blocks", async function () {
            // Mine an empty block to normalize forked networks
            await this.provider.send("evm_mine");

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
            ]);

            const { gasUsedRatio } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(2), "latest"]
            );

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );

            assert.deepEqual(gasUsedRatio, [
              0,
              21000 / rpcQuantityToNumber(block.gasLimit),
            ]);
          });

          it("Should compute the pending block", async function () {
            // Mine an empty block to normalize forked networks
            await this.provider.send("evm_mine");

            await this.provider.send("evm_setAutomine", [false]);

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
              },
            ]);

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
              },
            ]);

            const pendingBlock: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["pending", false]
            );

            const { gasUsedRatio } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(2), "pending"]
            );

            assert.deepEqual(gasUsedRatio, [
              0,
              (2 * 21000) / rpcQuantityToNumber(pendingBlock.gasLimit),
            ]);
          });
        });

        describe("baseFeePerGas", function () {
          let firstBlock: number;
          beforeEach(
            "Normalize between fork and not forked networks by mining an empty block in the forked ones",
            async function () {
              if (isFork) {
                await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
                  numberToRpcQuantity(1_000_000_000),
                ]);
                await this.provider.send("evm_mine", []);
              }

              firstBlock = rpcQuantityToNumber(
                await this.provider.send("eth_blockNumber")
              );
            }
          );

          it("Should return blockCount + 1 entries", async function () {
            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);

            const { baseFeePerGas, oldestBlock } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(3), numberToRpcQuantity(firstBlock + 2)]
            );

            assert.equal(oldestBlock, firstBlock);
            assert.deepEqual(baseFeePerGas, [
              numberToRpcQuantity(1_000_000_000),
              // All of them are empty blocks, so each has 7/8 the base fee of
              // the previous one
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 1)),
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 2)),
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 3)),
            ]);
          });

          it("Should compute it for the pending block", async function () {
            const { baseFeePerGas, oldestBlock } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(1), "latest"]
            );

            assert.equal(oldestBlock, firstBlock);
            assert.deepEqual(baseFeePerGas, [
              numberToRpcQuantity(1_000_000_000),
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 1)),
            ]);
          });

          it("Should compute it for the block after the pending one", async function () {
            const { baseFeePerGas, oldestBlock } = await this.provider.send(
              "eth_feeHistory",
              [numberToRpcQuantity(1), "pending"]
            );

            assert.equal(oldestBlock, numberToRpcQuantity(firstBlock + 1));
            assert.deepEqual(baseFeePerGas, [
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 1)),
              numberToRpcQuantity(Math.ceil(1_000_000_000 * (7 / 8) ** 2)),
            ]);
          });
        });
      });
    });
  });
});
