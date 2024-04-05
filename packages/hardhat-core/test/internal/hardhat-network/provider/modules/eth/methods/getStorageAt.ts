import { assert } from "chai";

import {
  numberToRpcQuantity,
  numberToRpcStorageSlot,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidArgumentsError } from "../../../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../../../helpers/providers";
import { deployContract } from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_getStorageAt", function () {
        describe("Imitating Ganache", function () {
          describe("When a slot has not been written into", function () {
            it("Should return `0x0000000000000000000000000000000000000000000000000000000000000000`", async function () {
              const exampleContract = await deployContract(
                this.provider,
                `0x${EXAMPLE_CONTRACT.bytecode.object}`
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcStorageSlot(3),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcStorageSlot(4),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  DEFAULT_ACCOUNTS_ADDRESSES[0],
                  numberToRpcStorageSlot(0),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            });
          });

          describe("When a slot has been written into", function () {
            describe("When 32 bytes were written", function () {
              it("Should return a 32-byte DATA string", async function () {
                const firstBlockNumber = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(2),
                    numberToRpcQuantity(firstBlockNumber),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(2),
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(2),
                    "latest",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );
              });

              it("Should return a 32-byte DATA string in the context of a new block with 'pending' block tag param", async function () {
                const snapshotId = await this.provider.send("evm_snapshot");
                const contractAddress = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                await this.provider.send("evm_revert", [snapshotId]);
                await this.provider.send("evm_setAutomine", [false]);

                const txHash = await this.provider.send("eth_sendTransaction", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
                    gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
                  },
                ]);
                const txReceipt = await this.provider.send(
                  "eth_getTransactionReceipt",
                  [txHash]
                );

                assert.isNotNull(contractAddress);
                assert.isNull(txReceipt);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    contractAddress,
                    numberToRpcStorageSlot(2),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    contractAddress,
                    numberToRpcStorageSlot(2),
                    "pending",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );
              });

              it("Should return a zero-value 32-byte DATA string in the context of the first block with 'earliest' block tag param", async function () {
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(2),
                    "latest",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(2),
                    "earliest",
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );
              });
            });

            describe("When less than 32 bytes where written", function () {
              it("Should return a DATA string with the same amount bytes that have been written", async function () {
                const firstBlockNumber = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                // We return as the EthereumJS VM stores it. This has been checked
                // against remix

                let newState =
                  "000000000000000000000000000000000000000000000000000000000000007b";

                await this.provider.send("eth_sendTransaction", [
                  {
                    to: exampleContract,
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
                  },
                ]);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(0),
                    numberToRpcQuantity(firstBlockNumber + 1),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(0),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007b"
                );

                newState =
                  "000000000000000000000000000000000000000000000000000000000000007c";

                await this.provider.send("eth_sendTransaction", [
                  {
                    to: exampleContract,
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
                  },
                ]);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(0),
                    numberToRpcQuantity(firstBlockNumber + 2),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007b"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcStorageSlot(0),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007c"
                );
              });
            });
          });
        });

        describe("validation", function () {
          it("should accept valid storage slot arguments", async function () {
            // 0x010101... is almost surely an empty account
            assert.strictEqual(
              await this.provider.send("eth_getStorageAt", [
                "0x0101010101010101010101010101010101010101",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              ]),
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            // check that it also works with some random storage slot
            assert.strictEqual(
              await this.provider.send("eth_getStorageAt", [
                "0x0101010101010101010101010101010101010101",
                "0xcd39aa866fd639607c7241f617cf83f33c646551f3d205f2905c5abacca2db85",
              ]),
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );
          });

          it("should accept short hex strings", async function () {
            const validHexStrings = [
              "0x",
              "0x0",
              "0x00",
              "0x000",
              "0x1",
              "0x01",
              "0x001",
              "0xA",
              "0x0A",
              "0x00A",
              "0xb",
              "0x0b",
              "0x00b",
            ];

            for (const storageSlot of validHexStrings) {
              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  "0x0101010101010101010101010101010101010101",
                  storageSlot,
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            }
          });

          it("should accept storage slots without the 0x prefix", async function () {
            const validHexStrings = [
              "0",
              "00",
              "000",
              "1",
              "01",
              "001",
              "A",
              "0A",
              "00A",
              "b",
              "0b",
              "00b",
            ];

            for (const storageSlot of validHexStrings) {
              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  "0x0101010101010101010101010101010101010101",
                  storageSlot,
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            }

            assert.strictEqual(
              await this.provider.send("eth_getStorageAt", [
                "0x0101010101010101010101010101010101010101",
                "0000000000000000000000000000000000000000000000000000000000000000",
              ]),
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );
          });

          it("should not accept plain numbers", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "eth_getStorageAt",
              ["0x0101010101010101010101010101010101010101", 0],
              "Storage slot argument must be a string, got '0'"
            );
          });

          it("should not accept empty strings", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "eth_getStorageAt",
              ["0x0101010101010101010101010101010101010101", ""],
              "Storage slot argument cannot be an empty string"
            );
          });

          it("should not accept invalid hex strings", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "eth_getStorageAt",
              ["0x0101010101010101010101010101010101010101", "0xABCDEFG"],
              "Storage slot argument must be a valid hexadecimal, got '0xABCDEFG'"
            );
          });

          it("should not accept hex strings that are too long", async function () {
            await assertInvalidArgumentsError(
              this.provider,
              "eth_getStorageAt",
              [
                "0x0101010101010101010101010101010101010101",
                "0x00000000000000000000000000000000000000000000000000000000000000000",
              ],
              `Storage slot argument must have a length of at most 66 ("0x" + 32 bytes), but '0x00000000000000000000000000000000000000000000000000000000000000000' has a length of 67`
            );

            await assertInvalidArgumentsError(
              this.provider,
              "eth_getStorageAt",
              [
                "0x0101010101010101010101010101010101010101",
                "00000000000000000000000000000000000000000000000000000000000000000",
              ],
              `Storage slot argument must have a length of at most 64 (32 bytes), but '00000000000000000000000000000000000000000000000000000000000000000' has a length of 65`
            );
          });
        });
      });
    });
  });
});
