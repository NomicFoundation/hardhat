import { assert } from "chai";
// eslint-disable-next-line import/no-extraneous-dependencies
import { ethers } from "ethers";
import sinon from "sinon";

import {
  numberToRpcQuantity,
  numberToRpcStorageSlot,
  rpcQuantityToBigInt,
  rpcQuantityToNumber,
} from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { CompilerOutputContract } from "../../../../../src/types/artifacts";
import { expectErrorAsync } from "../../../../helpers/errors";
import { ALCHEMY_URL } from "../../../../setup";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import {
  assertEqualCode,
  assertInternalError,
  assertInvalidArgumentsError,
  assertInvalidInputError,
} from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../helpers/constants";
import { setCWD } from "../../helpers/cwd";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../../helpers/providers";
import {
  deployContract,
  sendTxToZeroAddress,
} from "../../helpers/transactions";
import { compileLiteral } from "../../stack-traces/compilation";
import { getPendingBaseFeePerGas } from "../../helpers/getPendingBaseFeePerGas";
import { RpcBlockOutput } from "../../../../../src/internal/hardhat-network/provider/output";
import * as BigIntUtils from "../../../../../src/internal/util/bigint";
import {
  EXAMPLE_CONTRACT,
  EXAMPLE_DIFFICULTY_CONTRACT,
} from "../../helpers/contracts";
import { HardhatMetadata } from "../../../../../src/internal/core/jsonrpc/types/output/metadata";
import { useFixtureProject } from "../../../../helpers/project";
import { useEnvironment } from "../../../../helpers/environment";
import { isEdrProvider } from "../../helpers/isEdrProvider";

describe("Hardhat module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(80000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      const safeBlockInThePast = 11_200_000; // this should resolve CI errors probably caused by using a block too far in the past

      setCWD();
      useProvider();

      describe("hardhat_impersonateAccount", function () {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_impersonateAccount",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_impersonateAccount",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true", async function () {
          const result = await this.provider.send(
            "hardhat_impersonateAccount",
            [EMPTY_ACCOUNT_ADDRESS.toString()]
          );
          assert.isTrue(result);
        });

        it("lets you send a transaction from an impersonated account", async function () {
          const impersonatedAddress =
            "0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E";

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: impersonatedAddress,
              value: numberToRpcQuantity(10n ** 18n),
            },
          ]);

          // The tx's msg.sender should be correct during execution

          // msg.sender assertion contract:
          //
          // pragma solidity 0.7.0;
          //
          // contract C {
          //     constructor() {
          //         require(msg.sender == 0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E);
          //     }
          // }
          const CODE =
            "0x6080604052348015600f57600080fd5b5073c014ba5ec014ba5ec014ba5ec014ba5ec014ba5e73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614605b57600080fd5b603f8060686000396000f3fe6080604052600080fdfea26469706673582212208048da4076c3540ec6ad48a816e6531a302449e979836bd7955dc6bd2c87a52064736f6c63430007000033";

          await this.provider.send("hardhat_impersonateAccount", [
            impersonatedAddress,
          ]);

          await expectErrorAsync(() =>
            deployContract(this.provider, CODE, DEFAULT_ACCOUNTS_ADDRESSES[0])
          );

          // deploying with the right address should work
          await deployContract(this.provider, CODE, impersonatedAddress);

          // Getting the tx through the RPC should give the right from

          const tx = await this.provider.send("eth_sendTransaction", [
            {
              from: impersonatedAddress,
              to: impersonatedAddress,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.equal(receipt.from, impersonatedAddress.toLowerCase());
        });

        it("lets you deploy a contract from an impersonated account", async function () {
          const impersonatedAddress =
            "0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E";

          await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: impersonatedAddress,
              value: numberToRpcQuantity(10n ** 18n),
            },
          ]);

          await this.provider.send("hardhat_impersonateAccount", [
            impersonatedAddress,
          ]);

          await deployContract(
            this.provider,
            "0x7f410000000000000000000000000000000000000000000000000000000000000060005260016000f3",
            impersonatedAddress
          );
        });

        it("lets you impresonate a contract", async function () {
          const contract = await deployContract(
            this.provider,
            "0x7f410000000000000000000000000000000000000000000000000000000000000060005260016000f3"
          );

          const funds = "0x10000000000000000000000000";
          await this.provider.send("hardhat_setBalance", [contract, funds]);

          await this.provider.send("hardhat_impersonateAccount", [contract]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: contract,
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              value: "0x100",
            },
          ]);

          const code = await this.provider.send("eth_getCode", [contract]);
          assert.notEqual(code, "0x");

          const balance = await this.provider.send("eth_getBalance", [
            contract,
          ]);
          assert.notEqual(balance, funds);
        });

        describe("hash collisions", function () {
          async function checkForHashCollisions(provider: any, txData: any) {
            const hashes = new Set<string>();

            const randomAddress = () =>
              `0x${Buffer.from(
                [...Array(20)].map(() => Math.floor(256 * Math.random()))
              ).toString("hex")}`;

            await provider.send("hardhat_setNextBlockBaseFeePerGas", [
              numberToRpcQuantity(1),
            ]);

            for (let i = 0; i < 200; i++) {
              const address = randomAddress();

              // send 0.1 eth to the address
              await provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: address,
                  value: "0x16345785d8a0000",
                },
              ]);

              await provider.send("hardhat_impersonateAccount", [address]);
              const hash = await provider.send("eth_sendTransaction", [
                {
                  from: address,
                  to: "0x0000000000000000000000000000000000000000",
                  gas: numberToRpcQuantity(5_000_000),
                  ...txData,
                },
              ]);

              if (hashes.has(hash)) {
                assert.fail(
                  `Found a tx hash collision while using hardhat_impersonateAccount after ${i} transactions`
                );
              }

              hashes.add(hash);
            }
          }

          it("doesn't produce hash collisions (legacy transactions)", async function () {
            await checkForHashCollisions(this.provider, {
              gasPrice: "0x10",
            });
          });

          it("doesn't produce hash collisions (access list transactions)", async function () {
            await checkForHashCollisions(this.provider, {
              gasPrice: "0x10",
              accessList: [],
            });
          });

          it("doesn't produce hash collisions (EIP1559 transactions)", async function () {
            await checkForHashCollisions(this.provider, {
              maxFeePerGas: "0x10",
            });
          });
        });
      });

      describe("hardhat_stopImpersonatingAccount", function () {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_stopImpersonatingAccount",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_stopImpersonatingAccount",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true if the account was impersonated before", async function () {
          await this.provider.send("hardhat_impersonateAccount", [
            EMPTY_ACCOUNT_ADDRESS.toString(),
          ]);
          const result = await this.provider.send(
            "hardhat_stopImpersonatingAccount",
            [EMPTY_ACCOUNT_ADDRESS.toString()]
          );
          assert.isTrue(result);
        });

        it("returns false if the account wasn't impersonated before", async function () {
          const result = await this.provider.send(
            "hardhat_stopImpersonatingAccount",
            [EMPTY_ACCOUNT_ADDRESS.toString()]
          );
          assert.isFalse(result);
        });
      });

      describe("hardhat_getAutomine", () => {
        it("should return automine status true when enabled", async function () {
          await this.provider.send("evm_setAutomine", [true]);
          const result = await this.provider.send("hardhat_getAutomine");
          assert.isTrue(result);
        });
        it("should return automine status false when disabled", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const result = await this.provider.send("hardhat_getAutomine");
          assert.isFalse(result);
        });
      });

      describe("hardhat_mine", function () {
        const getLatestBlockNumber = async (): Promise<number> => {
          return rpcQuantityToNumber(
            await this.ctx.provider.send("eth_blockNumber")
          );
        };

        const assertBlockDoesntExist = async (blockNumber: number) => {
          const blockThatShouldntExist = await this.ctx.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(blockNumber), false]
          );
          assert.isNull(
            blockThatShouldntExist,
            `expected block number ${blockNumber} to be null, but successfully retrieved block ${JSON.stringify(
              blockThatShouldntExist
            )}`
          );
        };

        it("should work without any arguments", async function () {
          const previousBlockNumber = await getLatestBlockNumber();

          await this.provider.send("hardhat_mine");

          const blockNumber = await getLatestBlockNumber();
          assert.equal(blockNumber - previousBlockNumber, 1);
        });

        for (const minedBlocks of [0, 1, 2, 3, 4, 5, 10, 100, 1_000_000_000]) {
          it(`should work with ${minedBlocks} mined blocks`, async function () {
            const previousBlockNumber = await getLatestBlockNumber();

            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(minedBlocks),
            ]);

            const blockNumber = await getLatestBlockNumber();
            assert.equal(blockNumber - previousBlockNumber, minedBlocks);
          });
        }

        it("should permit the mining of a regular block afterwards", async function () {
          const previousBlockNumber = await getLatestBlockNumber();

          await this.provider.send("hardhat_mine", [
            numberToRpcQuantity(1_000_000_000),
          ]);
          await this.provider.send("evm_mine");

          const blockNumber = await getLatestBlockNumber();
          assert.equal(blockNumber - previousBlockNumber, 1_000_000_001);
        });

        it("should be able to get by hash the parent block of the last block", async function () {
          await this.provider.send("hardhat_mine", [
            numberToRpcQuantity(1_000_000_000),
          ]);

          const latestBlock = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);

          const parentOfLatestBlock = await this.provider.send(
            "eth_getBlockByHash",
            [latestBlock.parentHash, false]
          );

          assert.isNotNull(parentOfLatestBlock);
        });

        describe("should permit the retrieval of a reserved block", function () {
          const getAndAssertBlock = async (blockNumber: number) => {
            const block = await this.ctx.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(blockNumber),
              false,
            ]);
            assert.isNotNull(block, `expected block ${blockNumber} to exist`);
            assert.isDefined(block.number);
            assert.equal(blockNumber, block.number);

            const parentHash = block.parentHash;

            // the parent hash has to be zero, or a valid block hash
            if (
              parentHash !==
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            ) {
              const parentBlock = await this.ctx.provider.send(
                "eth_getBlockByHash",
                [parentHash, false]
              );

              assert.isNotNull(
                parentBlock,
                `expected block with hash ${parentHash} to exist`
              );
              assert.isDefined(parentBlock.number);
              assert.equal(
                rpcQuantityToNumber(parentBlock.number),
                rpcQuantityToNumber(block.number) - 1
              );
            }
          };

          const blockCount = 3_000_000_000;
          const mineBlocks = async () => {
            await this.ctx.provider.send("hardhat_mine", [
              numberToRpcQuantity(blockCount),
            ]);
          };

          let previousLatestBlockNumber: number;

          beforeEach(async function () {
            previousLatestBlockNumber = await getLatestBlockNumber();
            await mineBlocks();
          });

          it("works at the beginning of the reservation", async function () {
            await getAndAssertBlock(previousLatestBlockNumber + 1);
            await getAndAssertBlock(previousLatestBlockNumber + 2);
          });

          it("works in the middle of the reservation", async function () {
            await getAndAssertBlock(
              previousLatestBlockNumber + Math.floor(blockCount / 2) - 1
            );
            await getAndAssertBlock(
              previousLatestBlockNumber + Math.floor(blockCount / 2)
            );
            await getAndAssertBlock(
              previousLatestBlockNumber + Math.floor(blockCount / 2) + 1
            );
          });

          it("works at the end of the reservation", async function () {
            await getAndAssertBlock(previousLatestBlockNumber + blockCount - 1);
            await getAndAssertBlock(previousLatestBlockNumber + blockCount);
          });

          it("works several times over within the reservation", async function () {
            for (
              let blockNumber = previousLatestBlockNumber + blockCount;
              blockNumber > previousLatestBlockNumber;
              blockNumber = Math.floor(blockNumber / 2)
            ) {
              await getAndAssertBlock(blockNumber);
            }
          });
        });

        it("should not mine too many blocks", async function () {
          const blocksToMine = 1_000_000_000;
          const latestBlockNumber = await getLatestBlockNumber();
          await this.provider.send("hardhat_mine", [
            numberToRpcQuantity(blocksToMine),
          ]);
          assert.isNotNull(
            await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(latestBlockNumber + blocksToMine),
              false,
            ])
          );
          assert.isNull(
            await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(latestBlockNumber + blocksToMine + 1),
              false,
            ])
          );
        });

        describe("should increment the block number", async function () {
          it("when not given any arguments", async function () {
            const latestBlockNumber = await getLatestBlockNumber();
            await this.provider.send("hardhat_mine");
            assert.equal(await getLatestBlockNumber(), latestBlockNumber + 1);
          });

          it("when mining 1_000_000 blocks", async function () {
            const latestBlockNumber = await getLatestBlockNumber();
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000),
            ]);
            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumber + 1_000_000
            );
          });
        });

        describe("should reflect timestamps properly", function () {
          const getBlockTimestamp = async (block: number): Promise<number> => {
            return rpcQuantityToNumber(
              (
                await this.ctx.provider.send("eth_getBlockByNumber", [
                  numberToRpcQuantity(block),
                  false,
                ])
              ).timestamp
            );
          };

          const assertTimestampIncrease = async (
            block: number,
            expectedDifference: number
          ) => {
            const timestampPreviousBlock = await getBlockTimestamp(block - 1);
            const timestampBlock = await getBlockTimestamp(block);

            const timestampDifference = timestampBlock - timestampPreviousBlock;

            assert.equal(
              timestampDifference,
              expectedDifference,
              `Expected block ${block} to have a timestamp increase of ${expectedDifference}, but got ${timestampDifference} instead`
            );
          };

          it("with only one hardhat_mine invocation", async function () {
            const originalLatestBlockNumber = await getLatestBlockNumber();
            const numberOfBlocksToMine = 10;
            const timestampInterval = 3600;
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(numberOfBlocksToMine),
              numberToRpcQuantity(timestampInterval),
            ]);

            // Assert: first mined block is not affected by the interval
            await assertTimestampIncrease(originalLatestBlockNumber + 1, 1);

            for (const offset of [
              2, // first block affected by the interval
              numberOfBlocksToMine - 1, // second to last block
              numberOfBlocksToMine, // last block
            ]) {
              await assertTimestampIncrease(
                originalLatestBlockNumber + offset,
                timestampInterval
              );
            }
          });

          it("with two consecutive hardhat_mine invocations", async function () {
            const originalLatestBlockNumber = await getLatestBlockNumber();

            const numberOfBlocksToMine = 20;
            const timestampInterval = 10;

            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(numberOfBlocksToMine / 2),
              numberToRpcQuantity(timestampInterval),
            ]);
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(numberOfBlocksToMine / 2),
              numberToRpcQuantity(timestampInterval),
            ]);

            // Assert: first mined block in each group is not affected by the
            // interval
            await assertTimestampIncrease(originalLatestBlockNumber + 1, 1);
            await assertTimestampIncrease(
              originalLatestBlockNumber + numberOfBlocksToMine / 2 + 1,
              1
            );

            for (const offset of [
              2, // first block affected by the interval in the first group
              numberOfBlocksToMine / 2, // last block of first group
              numberOfBlocksToMine / 2 + 2, // first block affected by the interval in the second group
              numberOfBlocksToMine, // last block
            ]) {
              await assertTimestampIncrease(
                originalLatestBlockNumber + offset,
                timestampInterval
              );
            }
          });

          it("with two consecutive hardhat_mine invocations with different intervals", async function () {
            const originalLatestBlockNumber = await getLatestBlockNumber();

            const numberOfBlocksToMine = 20;
            const timestampInterval1 = 50;
            const timestampInterval2 = 100;

            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(numberOfBlocksToMine / 2),
              numberToRpcQuantity(timestampInterval1),
            ]);
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(numberOfBlocksToMine / 2),
              numberToRpcQuantity(timestampInterval2),
            ]);

            // Assert: first mined block in each group is not affected by the
            // interval
            await assertTimestampIncrease(originalLatestBlockNumber + 1, 1);
            await assertTimestampIncrease(
              originalLatestBlockNumber + numberOfBlocksToMine / 2 + 1,
              1
            );

            // Assert: the proper interval values are used in the first group
            await assertTimestampIncrease(
              originalLatestBlockNumber + 2,
              timestampInterval1
            );
            await assertTimestampIncrease(
              originalLatestBlockNumber + numberOfBlocksToMine / 2,
              timestampInterval1
            );

            // Assert: the proper interval values are used in the second group
            await assertTimestampIncrease(
              originalLatestBlockNumber + numberOfBlocksToMine / 2 + 2,
              timestampInterval2
            );
            await assertTimestampIncrease(
              originalLatestBlockNumber + numberOfBlocksToMine,
              timestampInterval2
            );
          });

          it("when there are transactions in the mempool", async function () {
            // Arrange: put some transactions into the mempool
            await this.provider.send("evm_setAutomine", [false]);
            for (let i = 0; i < 5; i++) {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                  nonce: numberToRpcQuantity(i),
                },
              ]);
            }

            const originalLatestBlockNumber = await getLatestBlockNumber();

            // Act:
            const blocksToMine = 10;
            const interval = 60;
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(blocksToMine),
              numberToRpcQuantity(interval),
            ]);

            // Assert: first mined block is not affected by the interval
            await assertTimestampIncrease(originalLatestBlockNumber + 1, 1);

            // Assert: all blocks affected by the interval value
            // have the correct timestamp
            for (let i = 2; i <= blocksToMine; i++) {
              await assertTimestampIncrease(
                originalLatestBlockNumber + i,
                interval
              );
            }
          });

          describe("when evm_setNextBlockTimestamp is used", function () {
            it("should work when 1 block is mined", async function () {
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );

              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(1),
              ]);

              const timestampAfter = await getBlockTimestamp(
                originalLatestBlockNumber + 1
              );
              assert.equal(timestampAfter, originalLatestBlockTimestamp + 3600);
            });

            it("should work when 10 blocks are mined", async function () {
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );

              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              const blocksToMine = 10;
              const interval = 60;
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(blocksToMine),
                numberToRpcQuantity(interval),
              ]);

              const timestampFirstMinedBlock = await getBlockTimestamp(
                originalLatestBlockNumber + 1
              );
              assert.equal(
                timestampFirstMinedBlock,
                originalLatestBlockTimestamp + 3600
              );

              // check that the rest of the blocks respect the interval
              for (let i = 2; i <= blocksToMine; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // check that there weren't too many blocks mined
              await assertBlockDoesntExist(
                originalLatestBlockNumber + blocksToMine + 1
              );
            });

            it("should work when 1 billion blocks are mined", async function () {
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );

              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              const blocksToMine = 1_000_000_000;
              const interval = 60;
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(blocksToMine),
                numberToRpcQuantity(interval),
              ]);

              const timestampFirstMinedBlock = await getBlockTimestamp(
                originalLatestBlockNumber + 1
              );
              assert.equal(
                timestampFirstMinedBlock,
                originalLatestBlockTimestamp + 3600
              );

              // check that the first blocks respect the interval
              for (let i = 2; i <= 20; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // check that the last blocks respect the interval
              for (let i = blocksToMine - 20; i <= blocksToMine; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // check that there weren't too many blocks mined
              await assertBlockDoesntExist(
                originalLatestBlockNumber + blocksToMine + 1
              );
            });

            it("should work when 1 block is mined and there are pending txs", async function () {
              // Arrange: put a tx in the mempool
              await this.provider.send("evm_setAutomine", [false]);
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                },
              ]);
              const blocksToMine = 1;

              // Act: set the next timestamp and mine 1 block
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );
              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(blocksToMine),
              ]);

              // Assert: check that the chosen timestamp was used
              const latestBlockNumber = await getLatestBlockNumber();
              assert.equal(
                latestBlockNumber,
                originalLatestBlockNumber + blocksToMine
              );
              const timestampAfter = await getBlockTimestamp(latestBlockNumber);
              assert.equal(timestampAfter, originalLatestBlockTimestamp + 3600);

              // Assert: check that there weren't too many blocks mined
              await assertBlockDoesntExist(
                originalLatestBlockNumber + blocksToMine + 1
              );
            });

            it("should work when 10 blocks are mined and there are pending txs", async function () {
              // Arrange: put a tx in the mempool
              await this.provider.send("evm_setAutomine", [false]);
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                },
              ]);

              // Act: set the next timestamp and mine 10 blocks
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );
              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              const blocksToMine = 10;
              const interval = 60;
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(blocksToMine),
                numberToRpcQuantity(interval),
              ]);

              // Assert: check that the chosen timestamp was used for the first
              // mined block
              const latestBlockNumber = await getLatestBlockNumber();
              assert.equal(
                latestBlockNumber,
                originalLatestBlockNumber + blocksToMine
              );
              const timestampFirstBlock = await getBlockTimestamp(
                originalLatestBlockNumber + 1
              );
              assert.equal(
                timestampFirstBlock,
                originalLatestBlockTimestamp + 3600
              );

              // Assert: check that the interval was properly used for the
              // subsequent blocks
              for (let i = 2; i <= blocksToMine; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // Assert: check that there weren't too many blocks mined
              await assertBlockDoesntExist(
                originalLatestBlockNumber + blocksToMine + 1
              );
            });

            it("should work when 1 billion blocks are mined and there are pending txs", async function () {
              // Arrange: put a tx in the mempool
              await this.provider.send("evm_setAutomine", [false]);
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                },
              ]);

              // Act: set the next timestamp and mine 1 billion blocks
              const originalLatestBlockNumber = await getLatestBlockNumber();
              const originalLatestBlockTimestamp = await getBlockTimestamp(
                originalLatestBlockNumber
              );
              await this.provider.send("evm_setNextBlockTimestamp", [
                numberToRpcQuantity(originalLatestBlockTimestamp + 3600),
              ]);
              const blocksToMine = 1_000_000_000;
              const interval = 60;
              await this.provider.send("hardhat_mine", [
                numberToRpcQuantity(blocksToMine),
                numberToRpcQuantity(interval),
              ]);

              // Assert: check that the chosen timestamp was used for the first
              // mined block
              const latestBlockNumber = await getLatestBlockNumber();
              assert.equal(
                latestBlockNumber,
                originalLatestBlockNumber + blocksToMine
              );
              const timestampFirstBlock = await getBlockTimestamp(
                originalLatestBlockNumber + 1
              );
              assert.equal(
                timestampFirstBlock,
                originalLatestBlockTimestamp + 3600
              );

              // Assert: check that the first blocks respect the interval
              for (let i = 2; i <= 20; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // Assert: check that the last blocks respect the interval
              for (let i = blocksToMine - 20; i <= blocksToMine; i++) {
                const blockNumber = originalLatestBlockNumber + i;
                const expectedTimestamp =
                  originalLatestBlockTimestamp + 3600 + (i - 1) * interval;
                assert.equal(
                  await getBlockTimestamp(blockNumber),
                  expectedTimestamp
                );
              }

              // check that there weren't too many blocks mined
              await assertBlockDoesntExist(
                originalLatestBlockNumber + blocksToMine + 1
              );
            });
          });
        });

        describe("base fee per gas", function () {
          const getBlockBaseFeePerGas = async (
            block: number
          ): Promise<bigint> => {
            return rpcQuantityToBigInt(
              (
                await this.ctx.provider.send("eth_getBlockByNumber", [
                  numberToRpcQuantity(block),
                  false,
                ])
              ).baseFeePerGas
            );
          };

          it("shouldn't increase if the blocks are empty", async function () {
            // the main reason for this test is that solidity-coverage sets the
            // initial base fee per gas to 1, and hardhat_mine shouldn't mess
            // with that

            const originalLatestBlockNumber = await getLatestBlockNumber();

            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              numberToRpcQuantity(1),
            ]);

            const blocksToMine = 20;
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(blocksToMine),
            ]);

            for (let i = 1; i <= blocksToMine; i++) {
              const blockBaseFeePerGas = await getBlockBaseFeePerGas(
                originalLatestBlockNumber + i
              );
              assert.equal(blockBaseFeePerGas, 1n);
            }
          });
        });

        it("should mine transactions in the mempool", async function () {
          // Arrange: put some transactions into the mempool and
          // set the block gas limit so that only 3 txs are mined per block
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(21000 * 3),
          ]);
          for (let i = 0; i < 4; i++) {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: "0x1111111111111111111111111111111111111111",
                gas: numberToRpcQuantity(21000),
              },
            ]);
          }

          // Act:
          const previousLatestBlockNumber = await getLatestBlockNumber();
          await this.provider.send("hardhat_mine", [
            numberToRpcQuantity(1_000_000_000),
          ]);

          // Assert:
          for (const expectation of [
            { block: previousLatestBlockNumber + 1, transactionCount: 3 },
            { block: previousLatestBlockNumber + 2, transactionCount: 1 },
            { block: previousLatestBlockNumber + 3, transactionCount: 0 },
            { block: previousLatestBlockNumber + 4, transactionCount: 0 },
            {
              block: previousLatestBlockNumber + 1_000_000_000,
              transactionCount: 0,
            },
          ]) {
            const block = await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(expectation.block),
              false,
            ]);
            assert.isNotNull(
              block,
              `block ${expectation.block} should be defined`
            );
            assert.isDefined(
              block.transactions,
              `block ${expectation.block} should have transactions`
            );
            assert.equal(
              expectation.transactionCount,
              block.transactions.length,
              `expected block ${expectation.block}'s transaction count to be ${expectation.transactionCount}, but it was ${block.transactions.length}`
            );
          }

          // Assert: check that there weren't too many blocks mined
          await assertBlockDoesntExist(
            previousLatestBlockNumber + 1_000_000_000 + 1
          );
        });

        it("should work when the mempool is not emptied after mining all blocks", async function () {
          // Arrange: put some transactions into the mempool and
          // set the block gas limit so that only 3 txs are mined per block
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(21000 * 3),
          ]);
          for (let i = 0; i < 10; i++) {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: "0x1111111111111111111111111111111111111111",
                gas: numberToRpcQuantity(21000),
              },
            ]);
          }

          // Act:
          const previousLatestBlockNumber = await getLatestBlockNumber();
          await this.provider.send("hardhat_mine", [numberToRpcQuantity(3)]);

          // Assert:
          const latestBlockNumber = await getLatestBlockNumber();
          assert.equal(latestBlockNumber, previousLatestBlockNumber + 3);

          for (const expectation of [
            { block: previousLatestBlockNumber + 1, transactionCount: 3 },
            { block: previousLatestBlockNumber + 2, transactionCount: 3 },
            { block: previousLatestBlockNumber + 3, transactionCount: 3 },
          ]) {
            const block = await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(expectation.block),
              false,
            ]);
            assert.isNotNull(
              block,
              `block ${expectation.block} should be defined`
            );
            assert.isDefined(
              block.transactions,
              `block ${expectation.block} should have transactions`
            );
            assert.equal(
              expectation.transactionCount,
              block.transactions.length,
              `expected block ${expectation.block}'s transaction count to be ${expectation.transactionCount}, but it was ${block.transactions.length}`
            );
          }

          // Assert: check that there weren't too many blocks mined
          await assertBlockDoesntExist(
            previousLatestBlockNumber + 1_000_000_000 + 1
          );
        });

        describe("shouldn't break hardhat_reset", function () {
          const mineSomeTxBlocks = async (blockCount: number) => {
            const originalLatestBlockNumber = await getLatestBlockNumber();
            for (let i = 1; i <= blockCount; i++) {
              await this.ctx.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: "0x1111111111111111111111111111111111111111",
                },
              ]);
            }
            assert.equal(
              originalLatestBlockNumber + blockCount,
              await getLatestBlockNumber(),
              `we should have mined ${blockCount} blocks`
            );
          };

          const runHardhatMine = async (blockCount: number) => {
            await this.ctx.provider.send("hardhat_mine", [
              numberToRpcQuantity(blockCount),
            ]);
          };

          it("when doing hardhat_mine before hardhat_reset", async function () {
            await runHardhatMine(1_000_000_000);
            await this.provider.send("hardhat_reset");
            assert.equal(await getLatestBlockNumber(), 0);
            await assertBlockDoesntExist(1);
            await assertBlockDoesntExist(2);
            await assertBlockDoesntExist(1_000_000_000);
            await mineSomeTxBlocks(3);
            assert.equal(await getLatestBlockNumber(), 3);
          });

          it("when doing hardhat_reset before hardhat_mine", async function () {
            await mineSomeTxBlocks(3);
            await this.provider.send("hardhat_reset");
            assert.equal(await getLatestBlockNumber(), 0);
            await runHardhatMine(1_000_000_000);
            assert.equal(await getLatestBlockNumber(), 1_000_000_000);
          });
        });

        describe("shouldn't break snapshots", function () {
          it("when doing hardhat_mine before a snapshot", async function () {
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000_000),
            ]);

            const latestBlockNumberBeforeSnapshot =
              await getLatestBlockNumber();

            const snapshotId = await this.provider.send("evm_snapshot");

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: "0x1111111111111111111111111111111111111111",
              },
            ]);

            await this.provider.send("evm_revert", [snapshotId]);

            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumberBeforeSnapshot
            );
          });

          it("when doing hardhat_mine after a snapshot", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: "0x1111111111111111111111111111111111111111",
              },
            ]);

            const latestBlockNumberBeforeSnapshot =
              await getLatestBlockNumber();

            const snapshotId = await this.provider.send("evm_snapshot");

            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000_000),
            ]);
            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumberBeforeSnapshot + 1_000_000_000
            );

            await this.provider.send("evm_revert", [snapshotId]);

            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumberBeforeSnapshot
            );

            for (const i of [
              1, 2, 9, 10, 100, 500, 1000, 1_000_000, 999_999_999,
              1_000_000_000, 1_000_000_001,
            ]) {
              await assertBlockDoesntExist(latestBlockNumberBeforeSnapshot + i);
            }
          });

          it("when doing _mine and then a regular tx and then a revert", async function () {
            const latestBlockNumberBeforeSnapshot =
              await getLatestBlockNumber();

            const snapshotId = await this.provider.send("evm_snapshot");

            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000_000),
            ]);
            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumberBeforeSnapshot + 1_000_000_000
            );

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: "0x1111111111111111111111111111111111111111",
              },
            ]);

            await this.provider.send("evm_revert", [snapshotId]);

            assert.equal(
              await getLatestBlockNumber(),
              latestBlockNumberBeforeSnapshot
            );

            for (const i of [
              1, 2, 9, 10, 100, 500, 1000, 1_000_000, 999_999_999,
              1_000_000_000, 1_000_000_001,
            ]) {
              await assertBlockDoesntExist(latestBlockNumberBeforeSnapshot + i);
            }
          });

          it("when doing _mine twice", async function () {
            const latestBlockNumberBeforeSnapshot =
              await getLatestBlockNumber();
            const snapshotId = await this.provider.send("evm_snapshot");
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000_000),
            ]);
            await this.provider.send("hardhat_mine", [
              numberToRpcQuantity(1_000_000_000),
            ]);
            await this.provider.send("evm_revert", [snapshotId]);

            for (const i of [
              1, 2, 9, 10, 100, 500, 1000, 1_000_000, 999_999_999,
              1_000_000_000, 1_000_000_001,
            ]) {
              await assertBlockDoesntExist(latestBlockNumberBeforeSnapshot + i);
            }
          });
        });

        describe("difficulty and totalDifficulty", function () {
          const getBlockDifficulty = async (blockNumber: number) => {
            const block = await this.ctx.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(blockNumber),
              false,
            ]);

            return {
              difficulty: rpcQuantityToBigInt(block.difficulty),
              totalDifficulty: rpcQuantityToBigInt(block.totalDifficulty),
            };
          };

          it("reserved blocks should have a difficulty of 0", async function () {
            const previousBlockNumber = await getLatestBlockNumber();

            await this.provider.send("hardhat_mine", [numberToRpcQuantity(20)]);

            // we get a block from the middle of the reservation to
            // be sure that it's a reserved block
            const middleBlockDifficulty = await getBlockDifficulty(
              previousBlockNumber + 10
            );

            assert.equal(middleBlockDifficulty.difficulty, 0n);
          });

          it("reserved blocks should have consistent difficulty values", async function () {
            const previousBlockNumber = await getLatestBlockNumber();

            await this.provider.send("hardhat_mine", [numberToRpcQuantity(20)]);

            let previousBlockDifficulty = await getBlockDifficulty(
              previousBlockNumber
            );

            for (let i = 1; i <= 20; i++) {
              const blockDifficulty = await getBlockDifficulty(
                previousBlockNumber + i
              );

              assert.equal(
                blockDifficulty.totalDifficulty,
                previousBlockDifficulty.totalDifficulty +
                  blockDifficulty.difficulty
              );

              previousBlockDifficulty = blockDifficulty;
            }
          });
        });
      });

      describe("hardhat_reset", function () {
        before(function () {
          if (ALCHEMY_URL === undefined) {
            this.skip();
          }
        });

        it("validates input parameters", async function () {
          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            { forking: {} },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: 123,
              },
            },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                blockNumber: 0,
              },
            },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: ALCHEMY_URL,
                blockNumber: "0",
              },
            },
          ]);
        });

        it("returns true", async function () {
          const result = await this.provider.send("hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: ALCHEMY_URL,
                blockNumber: safeBlockInThePast,
              },
            },
          ]);
          assert.isTrue(result);
        });

        it("hardhat_reset resets tx pool", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: "0x1111111111111111111111111111111111111111",
              nonce: numberToRpcQuantity(0),
            },
          ]);

          const pendingTxsBefore = await this.provider.send(
            "eth_pendingTransactions"
          );

          const result = await this.provider.send("hardhat_reset");

          const pendingTxsAfter = await this.provider.send(
            "eth_pendingTransactions"
          );

          assert.isTrue(result);
          assert.lengthOf(pendingTxsBefore, 1);
          assert.lengthOf(pendingTxsAfter, 0);
        });

        // TODO: https://github.com/NomicFoundation/edr/issues/249
        describe.skip("tests using sinon", () => {
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

          it("resets interval mining", async function () {
            const interval = 15_000;

            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("evm_setIntervalMining", [interval]);

            const firstBlockBefore = await getLatestBlockNumber();

            await sinonClock.tickAsync(interval);

            const secondBlockBefore = await getLatestBlockNumber();
            assert.equal(secondBlockBefore, firstBlockBefore + 1);

            const result = await this.provider.send("hardhat_reset");
            assert.isTrue(result);

            const firstBlockAfter = await getLatestBlockNumber();

            await sinonClock.tickAsync(interval);

            const secondBlockAfter = await getLatestBlockNumber();
            assert.equal(secondBlockAfter, firstBlockAfter);
          });
        });

        if (isFork) {
          testForkedProviderBehaviour();
        } else {
          testNormalProviderBehaviour();
        }

        const getLatestBlockNumber = async () => {
          return rpcQuantityToNumber(
            await this.ctx.provider.send("eth_blockNumber")
          );
        };

        function testForkedProviderBehaviour() {
          it("can reset the forked provider to a given forkBlockNumber", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            assert.equal(await getLatestBlockNumber(), safeBlockInThePast);
          });

          it("can reset the forked provider to the latest block number", async function () {
            const initialBlock = await getLatestBlockNumber();
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            await this.provider.send("hardhat_reset", [
              { forking: { jsonRpcUrl: ALCHEMY_URL } },
            ]);

            // This condition is rather loose as Infura can sometimes return
            // a smaller block number on subsequent eth_blockNumber call
            const latestBlockNumber = await getLatestBlockNumber();
            assert.isTrue(latestBlockNumber >= initialBlock - 4);
          });

          it("can reset the forked provider to a normal provider", async function () {
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);

            await this.provider.send("hardhat_reset", [{}]);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }

        function testNormalProviderBehaviour() {
          it("can reset the provider to initial state", async function () {
            await this.provider.send("evm_mine");
            assert.equal(await getLatestBlockNumber(), 1);
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });

          it("can reset the provider with a fork config", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            assert.equal(await getLatestBlockNumber(), safeBlockInThePast);
          });

          it("can reset the provider with fork config back to normal config", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }
      });

      describe("hardhat_setBalance", function () {
        it("should reject an invalid address", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setBalance",
            ["0x1234", "0x0"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 0: "
            }Invalid value "0x1234" supplied to : ADDRESS`
          );
        });

        it("should reject a non-numeric balance", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setBalance",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "xyz"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 1: "
            }Invalid value "xyz" supplied to : QUANTITY`
          );
        });

        it("should not reject valid argument types", async function () {
          await this.provider.send("hardhat_setBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            "0x0",
          ]);
        });

        it("should result in a modified balance", async function () {
          // Arrange: Capture existing balance
          const existingBalance = rpcQuantityToBigInt(
            await this.provider.send("eth_getBalance", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ])
          );

          // Act: Set the new balance.
          const targetBalance = (existingBalance + 1n) * 2n;
          // For sanity, ensure that we really are making a change:
          assert.notEqual(targetBalance, existingBalance);
          await this.provider.send("hardhat_setBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(targetBalance),
          ]);

          // Assert: Ensure the new balance was set.
          const newBalance = rpcQuantityToBigInt(
            await this.provider.send("eth_getBalance", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ])
          );
          assert(targetBalance === newBalance);
        });

        it("should not result in a modified state root", async function () {
          // Arrange 1: Send a transaction, in order to ensure a pre-existing
          // state root.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Arrange 2: Capture the existing state root.
          const oldStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;

          // Act: Set the new balance.
          await this.provider.send("hardhat_setBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(99),
          ]);

          // Assert: Ensure state root hasn't changed.
          const newStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;
          assert.equal(newStateRoot, oldStateRoot);
        });

        it("should get changed balance by block even after a new block is mined", async function () {
          // Arrange 1: Get current block number
          const currentBlockNumber = await this.provider.send(
            "eth_blockNumber"
          );

          // Arrange 2: Set a new balance
          const targetBalance = 123454321n;
          const targetBalanceHex = numberToRpcQuantity(targetBalance);
          await this.provider.send("hardhat_setBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            targetBalanceHex,
          ]);

          // Arrange 3: Mine a block
          await this.provider.send("evm_mine");

          // Act: Get the balance of the account in the previous block
          const balancePreviousBlock = await this.provider.send(
            "eth_getBalance",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], currentBlockNumber]
          );

          // Assert: Check that the balance is the one we set
          assert.equal(balancePreviousBlock, targetBalanceHex);
        });

        it("should fund an account and permit that account to send a transaction", async function () {
          // Arrange: Fund a not-yet-existing account.
          const notYetExistingAccount =
            "0x1234567890123456789012345678901234567890";
          const amountToBeSent = 10n;
          /* 21k gwei in wei * pending base fee */
          const cost =
            21_000_000_000_000n *
            (await getPendingBaseFeePerGas(this.provider));
          const balanceRequired = amountToBeSent + cost;
          await this.provider.send("hardhat_setBalance", [
            notYetExistingAccount,
            numberToRpcQuantity(balanceRequired),
          ]);

          // Arrange: Capture the existing balance of the destination account.
          const existingBalance = rpcQuantityToBigInt(
            await this.provider.send("eth_getBalance", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ])
          );

          // Act: Send a transaction from the newly-funded account.
          await this.provider.send("hardhat_impersonateAccount", [
            notYetExistingAccount,
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: notYetExistingAccount,
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              value: numberToRpcQuantity(amountToBeSent),
            },
          ]);
          await this.provider.send("hardhat_stopImpersonatingAccount", [
            notYetExistingAccount,
          ]);

          // Assert: ensure the destination address is increased as expected.
          const newBalance = rpcQuantityToBigInt(
            await this.provider.send("eth_getBalance", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ])
          );

          assert.equal(newBalance, existingBalance + amountToBeSent);
        });

        it("should have its effects persist across snapshot save/restore", async function () {
          const a = DEFAULT_ACCOUNTS_ADDRESSES[0];
          const currentBlockNumber = await this.provider.send(
            "eth_blockNumber"
          );

          // set balance1
          const targetBalance1 = numberToRpcQuantity(1);
          await this.provider.send("hardhat_setBalance", [a, targetBalance1]);

          // snapshot after balance1
          const snapshotId = await this.provider.send("evm_snapshot");

          // set balance 2
          const targetBalance2 = numberToRpcQuantity(2);
          await this.provider.send("hardhat_setBalance", [a, targetBalance2]);

          // check that previous block has balance 2
          await this.provider.send("evm_mine");
          const balancePreviousBlock = await this.provider.send(
            "eth_getBalance",
            [a, currentBlockNumber]
          );
          assert.strictEqual(balancePreviousBlock, targetBalance2);

          // revert snapshot
          await this.provider.send("evm_revert", [snapshotId]);

          // repeat previous check with balance 1 now
          await this.provider.send("evm_mine");
          const balancePreviousBlockAfterRevert = await this.provider.send(
            "eth_getBalance",
            [a, currentBlockNumber]
          );
          assert.strictEqual(balancePreviousBlockAfterRevert, targetBalance1);
        });
      });

      describe("hardhat_setCode", function () {
        let contractNine: CompilerOutputContract;
        let abiEncoder: ethers.Interface;
        before(async function () {
          [
            ,
            {
              contracts: {
                ["literal.sol"]: { Nine: contractNine },
              },
            },
          ] = await compileLiteral(`
            contract Nine {
                function returnNine() public pure returns (int) { return 9; }
            }
          `);
          abiEncoder = new ethers.Interface(contractNine.abi);
        });

        it("should reject an invalid address", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setCode",
            ["0x1234", "0x0"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 0: "
            }Invalid value "0x1234" supplied to : ADDRESS`
          );
        });

        it("should reject an invalid data argument", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setCode",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "xyz"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 1: "
            }Invalid value "xyz" supplied to : DATA`
          );
        });

        it("should not reject valid argument types", async function () {
          await this.provider.send("hardhat_setCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            "0xff",
          ]);
        });

        it("should result in modified code", async function () {
          const targetCode = "0x0123456789abcdef";
          await this.provider.send("hardhat_setCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            targetCode,
          ]);

          const actualCode = await this.provider.send("eth_getCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            "latest",
          ]);

          assert.equal(actualCode, targetCode);
        });

        it("should, when setting code on an empty account, result in code that can actually be executed", async function () {
          const notYetExistingAccount =
            "0x1234567890123456789012345678901234567890";

          await this.provider.send("hardhat_setCode", [
            notYetExistingAccount,
            `0x${contractNine.evm.deployedBytecode.object}`,
          ]);

          assert.equal(
            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: notYetExistingAccount,
                data: abiEncoder.encodeFunctionData("returnNine", []),
              },
              "latest",
            ]),
            abiEncoder.encodeFunctionResult("returnNine", [9])
          );
        });

        it("should, when setting code on an existing EOA, result in code that can actually be executed", async function () {
          await this.provider.send("hardhat_setCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            `0x${contractNine.evm.deployedBytecode.object}`,
          ]);

          assert.equal(
            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: abiEncoder.encodeFunctionData("returnNine", []),
              },
              "latest",
            ]),
            abiEncoder.encodeFunctionResult("returnNine", [9])
          );
        });

        it("should, when setting code on an existing contract account, result in code that can actually be executed", async function () {
          // Arrange: Deploy a contract that always returns 10.
          const [
            ,
            {
              contracts: {
                ["literal.sol"]: { Ten: contractTen },
              },
            },
          ] = await compileLiteral(`
            contract Ten {
              function returnTen() public pure returns (int) { return 10; }
            }
          `);
          const contractTenAddress = await deployContract(
            this.provider,
            `0x${contractTen.evm.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          // Act: Replace the code at that address to always return 9.
          await this.provider.send("hardhat_setCode", [
            contractTenAddress,
            `0x${contractNine.evm.deployedBytecode.object}`,
          ]);

          // Assert: Verify the call to get 9.
          assert.equal(
            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: contractTenAddress,
                data: abiEncoder.encodeFunctionData("returnNine", []),
              },
              "latest",
            ]),
            abiEncoder.encodeFunctionResult("returnNine", [9])
          );
        });

        it("should get changed code by block even after a new block is mined", async function () {
          // Arrange 1: Get current block number
          const currentBlockNumber = await this.provider.send(
            "eth_blockNumber"
          );

          // Act 1: Set code on an account.
          const code = `0x${contractNine.evm.deployedBytecode.object}`;
          await this.provider.send("hardhat_setCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            code,
          ]);

          // Act 2: Mine a block
          await this.provider.send("evm_mine");

          // Assert: Ensure code is still there.
          assert.equal(
            await this.provider.send("eth_getCode", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
              currentBlockNumber,
            ]),
            code
          );
        });

        it("should not result in a modified state root", async function () {
          // Arrange 1: Send a transaction, in order to ensure a pre-existing
          // state root.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Arrange 2: Capture the existing state root.
          const oldStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;

          // Act: Set the new code.
          await this.provider.send("hardhat_setCode", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            "0x0123456789abcdef",
          ]);

          // Assert: Ensure state root hasn't changed.
          const newStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;
          assert.equal(newStateRoot, oldStateRoot);
        });

        it("modifying an account's code shouldn't affect another account with the same code", async function () {
          // deploy two contracts with the same bytecode
          const contractAddress1 = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          const contractAddress2 = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          await assertEqualCode(
            this.provider,
            contractAddress1,
            contractAddress2
          );
          const contractCode1Before = await this.provider.send("eth_getCode", [
            contractAddress1,
          ]);

          // modify the code of the second one
          await this.provider.send("hardhat_setCode", [
            contractAddress2,
            "0xff",
          ]);

          // check that only the second one was affected
          const contractCode1 = await this.provider.send("eth_getCode", [
            contractAddress1,
          ]);
          assert.notEqual(contractCode1.toLowerCase(), "0xff");
          assert.equal(
            contractCode1.toLowerCase(),
            contractCode1Before.toLowerCase()
          );

          const contractCode2 = await this.provider.send("eth_getCode", [
            contractAddress2,
          ]);
          assert.equal(contractCode2.toLowerCase(), "0xff");
        });
      });

      describe("hardhat_setNonce", function () {
        it("should reject an invalid address", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setNonce",
            ["0x1234", "0x0"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 0: "
            }Invalid value "0x1234" supplied to : ADDRESS`
          );
        });

        it("should reject a non-numeric nonce", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setNonce",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "xyz"],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 1: "
            }Invalid value "xyz" supplied to : QUANTITY`
          );
        });

        it("should not reject valid argument types", async function () {
          await this.provider.send("hardhat_setNonce", [
            DEFAULT_ACCOUNTS_ADDRESSES[1],
            "0x0",
          ]);
        });

        it("should throw an InvalidInputError if new nonce is smaller than the current nonce", async function () {
          // Arrange: Send a transaction, in order to ensure a non-zero nonce.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              value: "0x100",
            },
          ]);

          // Act & Assert: Ensure that a zero nonce now triggers the error.
          await assertInvalidInputError(
            this.provider,
            "hardhat_setNonce",
            [DEFAULT_ACCOUNTS_ADDRESSES[1], "0x0"],
            "New nonce (0) must not be smaller than the existing nonce (1)"
          );
        });

        it("should result in a modified nonce", async function () {
          // Arrange: Send a transaction, in order to ensure a non-zero nonce.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Act: Set the new nonce.
          const targetNonce = 99;
          await this.provider.send("hardhat_setNonce", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(targetNonce),
          ]);

          // Assert: Ensure nonce got set.
          const resultingNonce = await this.provider.send(
            "eth_getTransactionCount",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "latest"]
          );
          assert.equal(resultingNonce, targetNonce);
        });

        it("should not result in a modified state root", async function () {
          // Arrange 1: Send a transaction, in order to ensure a non-zero nonce.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Arrange 2: Capture the existing state root.
          const oldStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;

          // Act: Set the new nonce.
          await this.provider.send("hardhat_setNonce", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(99),
          ]);

          // Assert: Ensure state root hasn't changed.
          const newStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;
          assert.equal(newStateRoot, oldStateRoot);
        });

        it("should not break a subsequent transaction", async function () {
          // Arrange: Send a transaction, in order to ensure a non-zero nonce.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Act: Set the new nonce and execute a transaction.

          const targetNonce = 99;
          await this.provider.send("hardhat_setNonce", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(targetNonce),
          ]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Assert: The executed transaction should reflects the nonce we set.
          assert.equal(
            (await this.provider.send("eth_getTransactionByHash", [txHash]))
              .nonce,
            targetNonce
          );
        });

        it("should get changed nonce by block even after a new block is mined", async function () {
          // Arrange 1: Send a transaction, in order to ensure a non-zero nonce.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Arrange 2: Get current block number.
          const currentBlockNumber = await this.provider.send(
            "eth_blockNumber"
          );

          // Act 1: Set the new nonce.
          const targetNonce = 99;
          await this.provider.send("hardhat_setNonce", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(targetNonce),
          ]);

          // Act 2: Mine a block
          await this.provider.send("evm_mine");

          // Assert: Ensure modified nonce has persisted.
          const resultingNonce = await this.provider.send(
            "eth_getTransactionCount",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], currentBlockNumber]
          );
          assert.equal(resultingNonce, targetNonce);
        });

        it("should throw when there are pending transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
            },
          ]);

          await assertInternalError(
            this.provider,
            "hardhat_setNonce",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "0xff"],
            "Cannot set account nonce when the transaction pool is not empty"
          );
        });
      });

      describe("hardhat_setStorageAt", function () {
        it("should reject an invalid address", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setStorageAt",
            ["0x1234", numberToRpcQuantity(0), numberToRpcQuantity(99)],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 0: "
            }Invalid value "0x1234" supplied to : ADDRESS`
          );
        });

        it("should reject storage key that is non-numeric", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_setStorageAt",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], "xyz", numberToRpcQuantity(99)],
            // TODO: https://github.com/NomicFoundation/edr/issues/104
            `${
              isEdrProvider(this.provider)
                ? ""
                : "Errors encountered in param 1: "
            }Invalid value "xyz" supplied to : QUANTITY`
          );
        });

        it("should reject a storage key that is greater than 32 bytes", async function () {
          const MAX_WORD_VALUE = 2n ** 256n;
          await assertInvalidInputError(
            this.provider,
            "hardhat_setStorageAt",
            [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
              numberToRpcQuantity(MAX_WORD_VALUE + 1n),
              "0xff",
            ],
            `Storage key must not be greater than or equal to 2^256. Received 0x10000000000000000000000000000000000000000000000000000000000000001.`
          );
        });

        for (const badInputLength of [1, 2, 31, 33, 64]) {
          it(`should reject a value that is ${badInputLength} (not exactly 32) bytes long`, async function () {
            await assertInvalidInputError(
              this.provider,
              "hardhat_setStorageAt",
              [
                DEFAULT_ACCOUNTS_ADDRESSES[0],
                numberToRpcQuantity(0),
                `0x${"ff".repeat(badInputLength)}`,
              ],
              `Storage value must be exactly 32 bytes long. Received 0x${"ff".repeat(
                badInputLength
              )}, which is ${badInputLength} bytes long.`
            );
          });
        }

        it("should not reject valid argument types", async function () {
          await this.provider.send("hardhat_setStorageAt", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(0),
            `0x${"ff".repeat(32)}`,
          ]);
        });

        it("should result in modified storage", async function () {
          const targetStorageValue = 99;
          await this.provider.send("hardhat_setStorageAt", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(0),
            `0x${BigIntUtils.toEvmWord(targetStorageValue)}`,
          ]);

          const resultingStorageValue = await this.provider.send(
            "eth_getStorageAt",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], numberToRpcStorageSlot(0), "latest"]
          );

          assert.equal(resultingStorageValue, targetStorageValue);
        });

        it("should permit a contract call to read an updated storage value", async function () {
          // Arrange: Deploy a contract that can get and set storage.
          const [
            ,
            {
              contracts: {
                ["literal.sol"]: { Storage: storageContract },
              },
            },
          ] = await compileLiteral(
            `contract Storage {
              function getValue(uint256 position) public view returns (uint256 result) {
                assembly { result := sload(position) }
              }
            }`
          );
          const contractAddress = await deployContract(
            this.provider,
            `0x${storageContract.evm.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          // Act: Modify the value in the existing storage position.
          await this.provider.send("hardhat_setStorageAt", [
            contractAddress,
            numberToRpcQuantity(0),
            `0x${BigIntUtils.toEvmWord(10n)}`,
          ]);

          // Assert: Verify that the contract retrieves the modified value.
          const abiEncoder = new ethers.Interface(storageContract.abi);
          assert.equal(
            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: contractAddress,
                data: abiEncoder.encodeFunctionData("getValue", [0]),
              },
              "latest",
            ]),
            abiEncoder.encodeFunctionResult("getValue", [10])
          );
        });

        it("should not result in a modified state root", async function () {
          // Arrange 1: Send a transaction, in order to ensure a pre-existing
          // state root.
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x100",
            },
          ]);

          // Arrange 2: Capture the existing state root.
          const oldStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;

          // Act: Set the new storage value.
          await this.provider.send("hardhat_setStorageAt", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(0),
            `0x${"ff".repeat(32)}`,
          ]);

          // Assert: Ensure state root hasn't changed.
          const newStateRoot = (
            await this.provider.send("eth_getBlockByNumber", ["latest", false])
          ).stateRoot;
          assert.equal(newStateRoot, oldStateRoot);
        });

        it("should have the storage modification persist even after a new block is mined", async function () {
          // Arrange 1: Get current block number.
          const currentBlockNumber = await this.provider.send(
            "eth_blockNumber"
          );

          // Act 1: Modify storage
          const targetStorageValue = 99;
          await this.provider.send("hardhat_setStorageAt", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            numberToRpcQuantity(0),
            `0x${BigIntUtils.toEvmWord(targetStorageValue)}`,
          ]);

          // Act 2: Mine a block
          await this.provider.send("evm_mine");

          // Assert: Get storage by block
          assert.equal(
            await this.provider.send("eth_getStorageAt", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
              numberToRpcStorageSlot(0),
              currentBlockNumber,
            ]),
            targetStorageValue
          );
        });
      });

      describe("hardhat_dropTransaction", function () {
        it("should remove pending transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);
          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isNull(tx);
          assert.isTrue(result);
        });

        it("should remove queued transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isNull(tx);
          assert.isTrue(result);
        });

        it("should rearrange transactions after removing one", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          // send 3 txs
          const txHash1 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);
          const txHash2 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);
          const txHash3 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          // drop second transaction
          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash2,
          ]);
          assert.isTrue(result);

          // mine block; it should have only the first tx
          await this.provider.send("evm_mine");
          const block = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.deepEqual(block.transactions, [txHash1]);

          // the first and third tx should exist
          const tx1 = await this.provider.send("eth_getTransactionByHash", [
            txHash1,
          ]);
          const tx2 = await this.provider.send("eth_getTransactionByHash", [
            txHash2,
          ]);
          const tx3 = await this.provider.send("eth_getTransactionByHash", [
            txHash3,
          ]);

          assert.isNotNull(tx1);
          assert.isNull(tx2);
          assert.isNotNull(tx3);
        });

        it("should return false if a tx doesn't exist", async function () {
          const nonExistentTxHash =
            "0xa4b46baa47145cb30af1ceed6172604aed4d8a27f66077cad951113bebb9513d";
          const result = await this.provider.send("hardhat_dropTransaction", [
            nonExistentTxHash,
          ]);

          assert.isFalse(result);
        });

        it("should return false when called a second time", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const firstResult = await this.provider.send(
            "hardhat_dropTransaction",
            [txHash]
          );
          assert.isTrue(firstResult);
          const secondResult = await this.provider.send(
            "hardhat_dropTransaction",
            [txHash]
          );
          assert.isFalse(secondResult);
        });

        it("should throw if the tx was already mined", async function () {
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
            },
          ]);

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_dropTransaction",
            [txHash]
          );
        });
      });

      describe("hardhat_setMinGasPrice", () => {
        describe("When EIP-1559 is not active", function () {
          useProvider({ hardfork: "berlin" });

          describe("When automine is disabled", function () {
            it("makes txs below the new min gas price not minable", async function () {
              await this.provider.send("evm_setAutomine", [false]);

              const tx1Hash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: EMPTY_ACCOUNT_ADDRESS.toString(),
                  gas: numberToRpcQuantity(21_000),
                  gasPrice: numberToRpcQuantity(10),
                },
              ]);
              const tx2Hash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: EMPTY_ACCOUNT_ADDRESS.toString(),
                  gas: numberToRpcQuantity(21_000),
                  gasPrice: numberToRpcQuantity(20),
                },
              ]);

              await this.provider.send("hardhat_setMinGasPrice", [
                numberToRpcQuantity(15),
              ]);

              // check the two txs are pending
              const pendingTransactionsBefore = await this.provider.send(
                "eth_pendingTransactions"
              );
              assert.sameMembers(
                pendingTransactionsBefore.map((x: any) => x.hash),
                [tx1Hash, tx2Hash]
              );

              // check only the second one is mined
              await this.provider.send("evm_mine");
              const latestBlock = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );
              assert.sameMembers(latestBlock.transactions, [tx2Hash]);

              // check the first tx is still pending
              const pendingTransactionsAfter = await this.provider.send(
                "eth_pendingTransactions"
              );
              assert.sameMembers(
                pendingTransactionsAfter.map((x: any) => x.hash),
                [tx1Hash]
              );
            });
          });

          describe("When automine is enabled", function () {
            it("Should make txs below the min gas price fail", async function () {
              await this.provider.send("hardhat_setMinGasPrice", [
                numberToRpcQuantity(20),
              ]);

              await assertInvalidInputError(
                this.provider,
                "eth_sendTransaction",
                [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    gasPrice: numberToRpcQuantity(10),
                  },
                ],
                "Transaction gas price is 10, which is below the minimum of 20"
              );
            });
          });
        });

        for (const hardfork of ["london", "arrowGlacier"]) {
          describe(`When EIP-1559 is active (${hardfork})`, function () {
            useProvider({ hardfork });

            it("Should be disabled", async function () {
              await assertInvalidInputError(
                this.provider,
                "hardhat_setMinGasPrice",
                [numberToRpcQuantity(1)],
                "hardhat_setMinGasPrice is not supported when EIP-1559 is active"
              );
            });
          });
        }
      });

      describe("hardhat_setNextBlockBaseFeePerGas", function () {
        it("Should set the baseFee of a single block", async function () {
          await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            numberToRpcQuantity(10),
          ]);

          await this.provider.send("evm_mine", []);

          const block1: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.equal(block1.baseFeePerGas, numberToRpcQuantity(10));

          await this.provider.send("evm_mine", []);

          const block2: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.notEqual(block2.baseFeePerGas, numberToRpcQuantity(10));
        });

        describe("When automine is enabled", function () {
          it("Should prevent you from sending transactions with lower maxFeePerGas or gasPrice", async function () {
            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              numberToRpcQuantity(10),
            ]);

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  gasPrice: numberToRpcQuantity(9),
                },
              ],
              "Transaction gasPrice (9) is too low for the next block, which has a baseFeePerGas of 10"
            );

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  maxFeePerGas: numberToRpcQuantity(8),
                },
              ],
              "Transaction maxFeePerGas (8) is too low for the next block, which has a baseFeePerGas of 10"
            );
          });
        });

        describe("When automine is disabled", function () {
          it("Should let you send transactions with lower maxFeePerGas or gasPrice, but not mine them", async function () {
            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              numberToRpcQuantity(10),
            ]);

            await this.provider.send("evm_setAutomine", [false]);

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                gasPrice: numberToRpcQuantity(9),
              },
            ]);

            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                maxFeePerGas: numberToRpcQuantity(8),
              },
            ]);

            await this.provider.send("evm_mine", []);

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );

            assert.lengthOf(block.transactions, 0);
          });
        });

        describe("When EIP-1559 is not active", function () {
          useProvider({ hardfork: "berlin" });
          it("should be disabled", async function () {
            await assertInvalidInputError(
              this.provider,
              "hardhat_setNextBlockBaseFeePerGas",
              [numberToRpcQuantity(8)],
              "hardhat_setNextBlockBaseFeePerGas is disabled because EIP-1559 is not active"
            );
          });
        });
      });

      describe("hardhat_setCoinbase", function () {
        const cb1 = "0x1234567890123456789012345678901234567890";
        const cb2 = "0x0987654321098765432109876543210987654321";

        it("should set the coinbase for the new blocks", async function () {
          await this.provider.send("hardhat_setCoinbase", [cb1]);
          await this.provider.send("evm_mine", []);
          const block1 = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.equal(block1.miner, cb1);

          await this.provider.send("hardhat_setCoinbase", [cb2]);

          await this.provider.send("evm_mine", []);
          const block2 = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.equal(block2.miner, cb2);

          await this.provider.send("evm_mine", []);
          const block3 = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.equal(block3.miner, cb2);
        });

        it("should be preserved in snapshots", async function () {
          await this.provider.send("hardhat_setCoinbase", [cb1]);

          const snapshot = await this.provider.send("evm_snapshot");

          await this.provider.send("hardhat_setCoinbase", [cb2]);

          await this.provider.send("evm_mine", []);
          const block1 = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.equal(block1.miner, cb2);

          await this.provider.send("evm_revert", [snapshot]);

          await this.provider.send("evm_mine", []);
          const block1Again = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.equal(block1Again.miner, cb1);
        });

        it("should affect eth_coinbase", async function () {
          await this.provider.send("hardhat_setCoinbase", [cb1]);
          assert.equal(await this.provider.send("eth_coinbase"), cb1);

          await this.provider.send("hardhat_setCoinbase", [cb2]);
          assert.equal(await this.provider.send("eth_coinbase"), cb2);
        });
      });

      describe("hardhat_setPrevRandao", function () {
        async function assertPrevRandao(
          provider: any,
          expectedPrevRandao: string
        ) {
          const latestBlock = await provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);

          assert.equal(latestBlock.mixHash, expectedPrevRandao);
        }

        describe("in hardforks before the merge", function () {
          useProvider({ hardfork: "london" });

          it("should throw", async function () {
            await assertInvalidInputError(
              this.provider,
              "hardhat_setPrevRandao",
              [
                "0x1234567812345678123456781234567812345678123456781234567812345678",
              ],
              "hardhat_setPrevRandao is only available in post-merge hardforks"
            );
          });
        });

        describe("in hardforks after the merge", function () {
          useProvider({ hardfork: "merge" });

          it("should set a value and get it in the next block header", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0x1234567812345678123456781234567812345678123456781234567812345678",
            ]);

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0x1234567812345678123456781234567812345678123456781234567812345678"
            );
          });

          it("should set a value and get it in the next block execution", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0x0000000000000000000000000000000000000000000000000000000000000017",
            ]);

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_DIFFICULTY_CONTRACT.bytecode.object}`
            );

            const difficultyHex = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_DIFFICULTY_CONTRACT.selectors.difficulty}`,
              },
            ]);

            const difficulty = BigInt(difficultyHex);

            assert.equal(difficulty, 0x17n);
          });

          it("should accept zero as a value", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ]);

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );
          });

          it("should accept 0xfff...fff as a value", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            ]);

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            );
          });

          it("should work with snapshots", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0x1234567812345678123456781234567812345678123456781234567812345678",
            ]);

            const snapshotId = await this.provider.send("evm_snapshot");

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0x1234567812345678123456781234567812345678123456781234567812345678"
            );

            await this.provider.send("evm_revert", [snapshotId]);

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0x1234567812345678123456781234567812345678123456781234567812345678"
            );
          });

          it("should be used as the preimage of the following block", async function () {
            await this.provider.send("hardhat_setPrevRandao", [
              "0x1234567812345678123456781234567812345678123456781234567812345678",
            ]);

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            await assertPrevRandao(
              this.provider,
              "0x1234567812345678123456781234567812345678123456781234567812345678"
            );

            // send a transaction to generate a new block
            await sendTxToZeroAddress(this.provider);

            // keccak of 0x12345671234...
            await assertPrevRandao(
              this.provider,
              "0x3d6b7104c741bf23615b1bb00e067e9ef51c8ba2ab40042ee05086c14870f17c"
            );
          });

          it("should reject values with less than 32 bytes", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "hardhat_setPrevRandao",
              ["0x12345678"]
            );
          });

          it("should reject values with more than 32 bytes", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "hardhat_setPrevRandao",
              [`0x${"f".repeat(65)}`]
            );
          });
        });
      });

      describe("hardhat_metadata", function () {
        it("has the right fields", async function () {
          const metadata = await this.provider.send("hardhat_metadata");

          assert.isString(metadata.clientVersion);
          assert.isNumber(metadata.chainId);
          assert.isString(metadata.instanceId);
          assert.isNumber(metadata.latestBlockNumber);
          assert.isString(metadata.latestBlockHash);

          // check that instance id is 32 bytes long
          assert.lengthOf(metadata.instanceId, 66);

          if (isFork) {
            assert.isDefined(metadata.forkedNetwork);
            assert.isNumber(metadata.forkedNetwork.chainId);
            assert.isNumber(metadata.forkedNetwork.forkBlockNumber);
            assert.isString(metadata.forkedNetwork.forkBlockHash);
          } else {
            assert.notProperty(metadata, "forkedNetwork");
          }
        });

        it("shouldn't change the instance id when a block is mined", async function () {
          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          // send a transaction to generate a new block
          await sendTxToZeroAddress(this.provider);

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.equal(metadataBefore.instanceId, metadataAfter.instanceId);
        });

        it("changes its instanceId when hardhat_reset is used", async function () {
          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          await this.provider.send("hardhat_reset");

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.notEqual(metadataBefore.instanceId, metadataAfter.instanceId);
        });

        it("doesn't change its instandeId when snapshots are used", async function () {
          const snapshotId = await this.provider.send("evm_snapshot");

          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          await sendTxToZeroAddress(this.provider);
          await this.provider.send("evm_revert", [snapshotId]);

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.equal(metadataBefore.instanceId, metadataAfter.instanceId);
        });

        it("updates the block number and block hash when a new block is mined (sending a tx)", async function () {
          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          // send a transaction to generate a new block
          await sendTxToZeroAddress(this.provider);

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.equal(
            metadataAfter.latestBlockNumber,
            metadataBefore.latestBlockNumber + 1
          );
          assert.notEqual(
            metadataBefore.latestBlockHash,
            metadataAfter.latestBlockHash
          );
        });

        it("updates the block number and block hash when a new block is mined (using hardhat_mine)", async function () {
          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          await this.provider.send("hardhat_mine", ["0x100"]);

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.equal(
            metadataAfter.latestBlockNumber,
            metadataBefore.latestBlockNumber + 0x100
          );
          assert.notEqual(
            metadataBefore.latestBlockHash,
            metadataAfter.latestBlockHash
          );
        });

        it("forkBlockNumber and forkBlockHash don't change when a block is mined", async function () {
          if (!isFork) {
            return this.skip();
          }

          const metadataBefore: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          // send a transaction to generate a new block
          await sendTxToZeroAddress(this.provider);

          const metadataAfter: HardhatMetadata = await this.provider.send(
            "hardhat_metadata"
          );

          assert.equal(
            metadataBefore.forkedNetwork!.forkBlockNumber,
            metadataAfter.forkedNetwork!.forkBlockNumber
          );
          assert.equal(
            metadataBefore.forkedNetwork!.forkBlockHash,
            metadataAfter.forkedNetwork!.forkBlockHash
          );
        });
      });
    });
  });

  describe("fixture project tests", function () {
    useFixtureProject("non-default-chainid");
    useEnvironment();

    it("should return the chainId set in the config", async function () {
      const metadata: HardhatMetadata = await this.env.network.provider.send(
        "hardhat_metadata"
      );

      assert.equal(metadata.chainId, 1000);
    });
  });
});
