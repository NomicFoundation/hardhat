import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
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

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      describe("eth_getStorageAt", async function () {
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
                  numberToRpcQuantity(3),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcQuantity(4),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  DEFAULT_ACCOUNTS_ADDRESSES[0],
                  numberToRpcQuantity(0),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            });
          });

          describe("When a slot has been written into", function () {
            describe("When 32 bytes were written", function () {
              it("Should return a 32-byte DATA string", async function () {
                const firstBlock = await getFirstBlock();
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    numberToRpcQuantity(firstBlock),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
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
                    numberToRpcQuantity(2),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    contractAddress,
                    numberToRpcQuantity(2),
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
                    numberToRpcQuantity(2),
                    "latest",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    "earliest",
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );
              });
            });

            describe("When less than 32 bytes where written", function () {
              it("Should return a DATA string with the same amount bytes that have been written", async function () {
                const firstBlock = await getFirstBlock();
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
                    numberToRpcQuantity(0),
                    numberToRpcQuantity(firstBlock + 1),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
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
                    numberToRpcQuantity(0),
                    numberToRpcQuantity(firstBlock + 2),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007b"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007c"
                );
              });
            });
          });
        });
      });
    });
  });
});
