import { bufferToHex, zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import { Client } from "undici";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
  rpcQuantityToBigInt,
  rpcDataToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { InvalidInputError } from "../../../../../../../src/internal/core/providers/errors";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidInputError,
  assertReceiptMatchesGethOne,
  assertTransactionFailure,
} from "../../../../helpers/assertions";
import {
  EXAMPLE_BLOCK_NUMBER_CONTRACT,
  EXAMPLE_REVERT_CONTRACT,
} from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import { getPendingBaseFeePerGas } from "../../../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_ACCOUNTS_BALANCES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../../../helpers/providers";
import { sendDummyTransaction } from "../../../../helpers/sendDummyTransaction";
import {
  deployContract,
  sendTxToZeroAddress,
} from "../../../../helpers/transactions";
import { useHelpers } from "../../../../helpers/useHelpers";
import { compileLiteral } from "../../../../stack-traces/compilation";
import {
  EIP1559RpcTransactionOutput,
  RpcBlockOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
import { EthereumProvider } from "../../../../../../../src/types";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, isJsonRpc }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();

      describe("eth_sendTransaction", async function () {
        useProvider({ hardfork: "london" });
        useHelpers();

        // Because of the way we are testing this (i.e. integration testing) it's almost impossible to
        // fully test this method in a reasonable amount of time. This is because it executes the core
        // of Ethereum: its state transition function.
        //
        // We have mostly test about logic added on top of that, and will add new ones whenever
        // suitable. This is approximately the same as assuming that EDR is correct, which
        // seems reasonable, and if it weren't we should address the issues there.

        describe("Params validation", function () {
          it("Should fail for tx sent from account that is neither local nor marked as impersonated", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: zeroAddress(),
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
              "unknown account",
              InvalidInputError.CODE
            );
          });

          it("Should fail if sending to the null address without data", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );

            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );

            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: "0x",
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );
          });

          it("Should accept EIP-1559 transactions", async function () {
            const hash = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                maxFeePerGas: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
                maxPriorityFeePerGas: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
            ]);

            assert.match(hash, /^0x[a-f\d]{64}$/);
          });

          it("Should throw if tx includes gasPrice, maxFeePerGas and maxPriorityFeePerGas", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
                maxFeePerGas: numberToRpcQuantity(10),
                maxPriorityFeePerGas: numberToRpcQuantity(10),
              },
              "Cannot send both gasPrice and maxFeePerGas",
              InvalidInputError.CODE
            );
          });

          it("Should throw if tx includes gasPrice and maxFeePerGas", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(10),
                maxFeePerGas: numberToRpcQuantity(10),
              },
              "Cannot send both gasPrice and maxFeePerGas",
              InvalidInputError.CODE
            );
          });

          it("Should throw if tx includes gasPrice and maxPriorityFeePerGas", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
                maxPriorityFeePerGas: numberToRpcQuantity(1),
              },
              "Cannot send both gasPrice and maxPriorityFeePerGas",
              InvalidInputError.CODE
            );
          });

          it("Should throw if maxPriorityFeePerGas is bigger than maxFeePerGas", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                maxFeePerGas: numberToRpcQuantity(10),
                maxPriorityFeePerGas: numberToRpcQuantity(20),
              },
              "maxPriorityFeePerGas (20) is bigger than maxFeePerGas (10)",
              InvalidInputError.CODE
            );
          });

          it("Should succeed if sending an explicit null for an optional parameter value", async function () {
            assert.match(
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  gas: null,
                  gasPrice: null,
                  value: null,
                  nonce: null,
                  data: null,
                  accessList: null,
                  chainId: null,
                },
              ]),
              /^0x[a-f\d]{64}$/
            );
          });
        });

        describe("when automine is enabled", () => {
          it("Should return a valid transaction hash", async function () {
            const hash = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
            ]);

            assert.match(hash, /^0x[a-f\d]{64}$/);
          });

          describe("With just from and data", function () {
            for (const toValue of [undefined, null]) {
              it(`Should work with a 'to' value of ${toValue}`, async function () {
                const firstBlockNumber = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                const hash = await this.provider.send("eth_sendTransaction", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: "0x00",
                    to: toValue,
                  },
                ]);

                const receipt = await this.provider.send(
                  "eth_getTransactionReceipt",
                  [hash]
                );

                const receiptFromGeth = {
                  blockHash:
                    "0x01490da2af913e9a868430b7b4c5060fc29cbdb1692bb91d3c72c734acd73bc8",
                  blockNumber: "0x6",
                  contractAddress: "0x6ea84fcbef576d66896dc2c32e139b60e641170c",
                  cumulativeGasUsed: "0xcf0c",
                  from: "0xda4585f6e68ed1cdfdad44a08dbe3979ec74ad8f",
                  gasUsed: "0xcf0c",
                  logs: [],
                  logsBloom:
                    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                  status: "0x1",
                  to: null,
                  transactionHash:
                    "0xbd24cbe9c1633b98e61d93619230341141d2cff49470ed6afa739cee057fd0aa",
                  transactionIndex: "0x0",
                };

                assertReceiptMatchesGethOne(
                  receipt,
                  receiptFromGeth,
                  firstBlockNumber + 1
                );
              });
            }
          });

          it("Should throw if the tx nonce is higher than the account nonce", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(1),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too high. Expected nonce to be 0 but got 1. Note that transactions can't be queued when automining."
            );
          });

          it("Should throw if the tx nonce is lower than the account nonce", async function () {
            await sendTxToZeroAddress(
              this.provider,
              DEFAULT_ACCOUNTS_ADDRESSES[1]
            );
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(0),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too low. Expected nonce to be 1 but got 0."
            );
          });

          it("Should throw if the transaction fails", async function () {
            // Not enough gas
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(1),
                },
              ],
              "Transaction requires at least 21000 gas but got 1"
            );

            // Not enough balance
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(21000),
                  gasPrice: numberToRpcQuantity(DEFAULT_ACCOUNTS_BALANCES[0]),
                },
              ],
              "sender doesn't have enough funds to send tx"
            );

            // Gas is larger than block gas limit
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT + 1n),
                },
              ],
              `Transaction gas limit is ${
                DEFAULT_BLOCK_GAS_LIMIT + 1n
              } and exceeds block gas limit of ${DEFAULT_BLOCK_GAS_LIMIT}`
            );

            // Invalid opcode. We try to deploy a contract with an invalid opcode in the deployment code
            // The transaction gets executed anyway, so the account is updated
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0xAA",
              },
              "VM Exception while processing transaction: invalid opcode"
            );

            // Out of gas. This a deployment transaction that pushes 0x00 multiple times
            // The transaction gets executed anyway, so the account is updated.
            //
            // Note: this test is pretty fragile, as the tx needs to have enough gas
            // to pay for the calldata, but not enough to execute. This costs changed
            // with istanbul, and may change again in the future.
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x6000600060006000600060006000600060006000600060006000600060006000600060006000600060006000600060006000",
                gas: numberToRpcQuantity(53500),
              },
              "out of gas"
            );

            // Revert. This is a deployment transaction that immediately reverts without a reason
            // The transaction gets executed anyway, so the account is updated
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x60006000fd",
              },
              "Transaction reverted without a reason"
            );

            // This is a contract that reverts with A in its constructor
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x6080604052348015600f57600080fd5b506040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260018152602001807f410000000000000000000000000000000000000000000000000000000000000081525060200191505060405180910390fdfe",
              },
              "reverted with reason string 'A'"
            );

            // This deploys a contract that reverts with a custom error in its constructor:
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x6080604052348015600f57600080fd5b506040517ffbd8bc9c00000000000000000000000000000000000000000000000000000000815260040160405180910390fdfe",
              },
              "VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xfbd8bc9c)"
            );

            // This deploys a contract that divides by zero in its contstructor:
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x6080604052348015600f57600080fd5b5060006001601c91906021565b506084565b6000602a82604b565b9150603383604b565b925082604057603f6055565b5b828204905092915050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b603f8060916000396000f3fe6080604052600080fdfea26469706673582212208c4325ab2d6243893246d7f86891a2b8fad695c73555169ce9c8b4faebb42cac64736f6c63430008070033",
              },
              "VM Exception while processing transaction: reverted with panic code 0x12 (Division or modulo division by zero)"
            );

            // This deploys a contract that induces an invalid opcode in its constructor:
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x6080604052348015600f57600080fd5b50336000600181548110601e57fe5b9060005260206000200160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550603f8060736000396000f3fe6080604052600080fdfea264697066735822122030b617dfc8dcad16dee465096971a42c88e1814350c1c5bc2a33165078e4f50f64736f6c634300060c0033",
              },
              "VM Exception while processing transaction: invalid opcode"
            );
          });

          describe("when there are pending transactions in the mempool", () => {
            describe("when the sent transaction fits in the first block", () => {
              it("Should throw if the sender doesn't have enough balance as a result of mining pending transactions first", async function () {
                const gasPrice = 10n;

                const firstBlockNumber = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                const wholeAccountBalance = numberToRpcQuantity(
                  DEFAULT_ACCOUNTS_BALANCES[0] - 21_000n * gasPrice
                );
                await this.provider.send("evm_setAutomine", [false]);
                await this.provider.send("eth_sendTransaction", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                    nonce: numberToRpcQuantity(0),
                    gas: numberToRpcQuantity(21000),
                    gasPrice: numberToRpcQuantity(gasPrice),
                    value: wholeAccountBalance,
                  },
                ]);
                await this.provider.send("evm_setAutomine", [true]);

                await assertInvalidInputError(
                  this.provider,
                  "eth_sendTransaction",
                  [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(
                        await getPendingBaseFeePerGas(this.provider)
                      ),
                      value: wholeAccountBalance,
                    },
                  ],
                  "sender doesn't have enough funds to send tx"
                );
                assert.equal(
                  rpcQuantityToNumber(
                    await this.provider.send("eth_blockNumber")
                  ),
                  firstBlockNumber
                );
                assert.lengthOf(
                  await this.provider.send("eth_pendingTransactions"),
                  1
                );
              });
            });

            describe("when multiple blocks have to be mined before the sent transaction is included", () => {
              beforeEach(async function () {
                await this.provider.send("evm_setBlockGasLimit", [
                  numberToRpcQuantity(45000),
                ]);
              });

              it("Should eventually mine the sent transaction", async function () {
                await this.provider.send("evm_setAutomine", [false]);
                const blockNumberBefore = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                await sendDummyTransaction(this.provider, 0, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 1, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 2, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 3, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await this.provider.send("evm_setAutomine", [true]);
                const txHash = await sendDummyTransaction(this.provider, 4, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });

                const blockAfter = await this.provider.send(
                  "eth_getBlockByNumber",
                  ["latest", false]
                );
                const blockNumberAfter = rpcQuantityToNumber(blockAfter.number);

                assert.equal(blockNumberAfter, blockNumberBefore + 3);
                assert.lengthOf(blockAfter.transactions, 1);
                assert.sameDeepMembers(blockAfter.transactions, [txHash]);
              });

              it("Should throw if the sender doesn't have enough balance as a result of mining pending transactions first", async function () {
                const gasPrice = await getPendingBaseFeePerGas(this.provider);

                const sendTransaction = async (
                  nonce: number,
                  value: bigint | number
                ) => {
                  return this.provider.send("eth_sendTransaction", [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      nonce: numberToRpcQuantity(nonce),
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(gasPrice),
                      value: numberToRpcQuantity(value),
                    },
                  ]);
                };
                const initialBalance = DEFAULT_ACCOUNTS_BALANCES[1];
                const firstBlockNumber = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                await this.provider.send("evm_setAutomine", [false]);
                await sendTransaction(0, 0);
                await sendTransaction(1, 0);
                await sendTransaction(
                  2,
                  initialBalance - 3n * 21_000n * gasPrice
                );

                await this.provider.send("evm_setAutomine", [true]);

                await assertInvalidInputError(
                  this.provider,
                  "eth_sendTransaction",
                  [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(gasPrice),
                      value: numberToRpcQuantity(100),
                    },
                  ],
                  "sender doesn't have enough funds to send tx"
                );
                assert.equal(
                  rpcQuantityToNumber(
                    await this.provider.send("eth_blockNumber")
                  ),
                  firstBlockNumber
                );
                assert.lengthOf(
                  await this.provider.send("eth_pendingTransactions"),
                  3
                );
              });
            });
          });

          it("Should throw if a tx can't be mined in the next block because of its fees", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  maxFeePerGas: numberToRpcQuantity(1),
                },
              ],
              "too low for the next block, which has a baseFeePerGas of"
            );

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  gasPrice: numberToRpcQuantity(1),
                },
              ],
              "too low for the next block, which has a baseFeePerGas of"
            );

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  gasPrice: numberToRpcQuantity(1),
                  accessList: [],
                },
              ],
              "too low for the next block, which has a baseFeePerGas of"
            );
          });
        });

        describe("when automine is disabled", () => {
          beforeEach(async function () {
            await this.provider.send("evm_setAutomine", [false]);
          });

          it("Should not throw if the tx nonce is higher than the account nonce", async function () {
            await assert.isFulfilled(
              this.provider.send("eth_sendTransaction", [
                {
                  nonce: numberToRpcQuantity(1),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ])
            );
          });

          it("Should throw if the tx nonce is lower than the account nonce", async function () {
            await sendTxToZeroAddress(
              this.provider,
              DEFAULT_ACCOUNTS_ADDRESSES[1]
            );
            await this.provider.send("evm_mine");
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(0),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too low. Expected nonce to be at least 1 but got 0."
            );
          });

          it("Should throw an error if the same transaction is sent twice", async function () {
            const txParams = {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              nonce: numberToRpcQuantity(0),
            };

            const hash = await this.provider.send("eth_sendTransaction", [
              txParams,
            ]);

            await assertTransactionFailure(
              this.provider,
              txParams,
              `Known transaction: ${bufferToHex(hash)}`
            );
          });

          it("Should replace pending transactions", async function () {
            const gasPrice = await getPendingBaseFeePerGas(this.provider);
            const txHash1 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                nonce: numberToRpcQuantity(0),
                gasPrice: numberToRpcQuantity(gasPrice),
              },
            ]);
            let tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            assert.isNotNull(tx1);

            const txHash2 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                nonce: numberToRpcQuantity(0),
                gasPrice: numberToRpcQuantity(2n * gasPrice),
              },
            ]);
            tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            const tx2 = await this.provider.send("eth_getTransactionByHash", [
              txHash2,
            ]);
            assert.isNull(tx1);
            assert.isNotNull(tx2);

            const pendingTxs = await this.provider.send(
              "eth_pendingTransactions"
            );

            assert.lengthOf(pendingTxs, 1);
            assert.equal(pendingTxs[0].hash, tx2.hash);

            await this.provider.send("evm_mine");
            const minedBlock = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            assert.lengthOf(minedBlock.transactions, 1);
            assert.equal(minedBlock.transactions[0], tx2.hash);
          });

          it("Should replace queued transactions", async function () {
            const txHash1 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                nonce: numberToRpcQuantity(2),
                gasPrice: numberToRpcQuantity(20),
              },
            ]);
            let tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            assert.isNotNull(tx1);

            const txHash2 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                nonce: numberToRpcQuantity(2),
                gasPrice: numberToRpcQuantity(30),
              },
            ]);
            tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            const tx2 = await this.provider.send("eth_getTransactionByHash", [
              txHash2,
            ]);
            assert.isNull(tx1);
            assert.isNotNull(tx2);

            await this.provider.send("evm_mine");
            const minedBlock = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            assert.lengthOf(minedBlock.transactions, 0);
          });

          it("Should throw an error if the replacement gasPrice, maxFeePerGas or maxPriorityFeePerGas are too low", async function () {
            const baseFeePerGas = await getPendingBaseFeePerGas(this.provider);
            const txHash1 = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                nonce: numberToRpcQuantity(0),
                gasPrice: numberToRpcQuantity(baseFeePerGas),
              },
            ]);

            let tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            assert.isNotNull(tx1);

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  nonce: numberToRpcQuantity(0),
                  gasPrice: numberToRpcQuantity(baseFeePerGas + 1n),
                },
              ],
              "Replacement transaction underpriced."
            );

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  nonce: numberToRpcQuantity(0),
                  maxFeePerGas: numberToRpcQuantity(baseFeePerGas + 1n),
                },
              ],
              "Replacement transaction underpriced."
            );

            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                  nonce: numberToRpcQuantity(0),
                  maxPriorityFeePerGas: numberToRpcQuantity(baseFeePerGas + 1n),
                },
              ],
              "Replacement transaction underpriced."
            );

            // check that original tx was not replaced
            tx1 = await this.provider.send("eth_getTransactionByHash", [
              txHash1,
            ]);
            assert.isNotNull(tx1);

            const pendingTxs = await this.provider.send(
              "eth_pendingTransactions"
            );

            assert.lengthOf(pendingTxs, 1);
            assert.equal(pendingTxs[0].hash, tx1.hash);

            await this.provider.send("evm_mine");
            const minedBlock = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            assert.lengthOf(minedBlock.transactions, 1);
            assert.equal(minedBlock.transactions[0], tx1.hash);
          });
        });

        describe("Fee params default values", function () {
          let nextBlockBaseFee: bigint;
          const ONE_GWEI = 10n ** 9n;

          beforeEach(async function () {
            // We disable automining as enqueueing the txs is enough and we want
            // to test some that may have a low maxFeePerGas
            await this.provider.send("evm_setAutomine", [false]);

            const pendingBlock: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["pending", false]
            );

            nextBlockBaseFee = rpcQuantityToBigInt(pendingBlock.baseFeePerGas!);
          });

          describe("When no fee param is provided", function () {
            it("Should use 1gwei maxPriorityFeePerGas and base the maxFeePerGas on that plus 2 * next block's baseFee", async function () {
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                },
              ]);

              const tx: EIP1559RpcTransactionOutput = await this.provider.send(
                "eth_getTransactionByHash",
                [txHash]
              );

              assert.equal(
                tx.maxPriorityFeePerGas,
                numberToRpcQuantity(ONE_GWEI)
              );
              assert.equal(
                tx.maxFeePerGas,
                numberToRpcQuantity(2n * nextBlockBaseFee + ONE_GWEI)
              );
            });
          });

          describe("When maxFeePerGas is provided", function () {
            it("Should use 1gwei maxPriorityFeePerGas if maxFeePerGas is >= 1gwei", async function () {
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  maxFeePerGas: numberToRpcQuantity(2n * ONE_GWEI),
                },
              ]);

              const tx: EIP1559RpcTransactionOutput = await this.provider.send(
                "eth_getTransactionByHash",
                [txHash]
              );

              assert.equal(
                tx.maxPriorityFeePerGas,
                numberToRpcQuantity(ONE_GWEI)
              );
              assert.equal(tx.maxFeePerGas, numberToRpcQuantity(2n * ONE_GWEI));
            });

            it("Should use 1gwei maxPriorityFeePerGas if maxFeePerGas is < 1gwei", async function () {
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  maxFeePerGas: numberToRpcQuantity(10000),
                },
              ]);

              const tx: EIP1559RpcTransactionOutput = await this.provider.send(
                "eth_getTransactionByHash",
                [txHash]
              );

              assert.equal(tx.maxPriorityFeePerGas, numberToRpcQuantity(10000));
              assert.equal(tx.maxFeePerGas, numberToRpcQuantity(10000));
            });
          });

          describe("When maxPriorityFeePerGas is provided", function () {
            it("Should use the maxPriorityFeePerGas and base the maxFeePerGas on that plus 2 * next block's baseFee", async function () {
              const txHash = await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  maxPriorityFeePerGas: numberToRpcQuantity(1000),
                },
              ]);

              const tx: EIP1559RpcTransactionOutput = await this.provider.send(
                "eth_getTransactionByHash",
                [txHash]
              );

              assert.equal(tx.maxPriorityFeePerGas, numberToRpcQuantity(1000));
              assert.equal(
                tx.maxFeePerGas,
                numberToRpcQuantity(2n * nextBlockBaseFee + 1000n)
              );
            });
          });
        });

        describe("return txHash", () => {
          it("Should return the hash of an out of gas transaction", async function () {
            if (!isJsonRpc || isFork) {
              this.skip();
            }

            try {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: "0x0000000000000000000000000000000000000001",
                  gas: numberToRpcQuantity(21000), // Address 1 is a precompile, so this will OOG
                  gasPrice: numberToRpcQuantity(
                    await getPendingBaseFeePerGas(this.provider)
                  ),
                },
              ]);

              assert.fail("Tx should have failed");
            } catch (e: any) {
              assert.notInclude(e.message, "Tx should have failed");
              assert.isDefined(e.data.txHash);
            }
          });

          it("Should return the hash of a reverted transaction", async function () {
            if (!isJsonRpc || isFork) {
              this.skip();
            }

            try {
              const contractAddress = await deployContract(
                this.provider,
                `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
              );

              await this.provider.send("eth_sendTransaction", [
                {
                  to: contractAddress,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  data: `${EXAMPLE_REVERT_CONTRACT.selectors.f}0000000000000000000000000000000000000000000000000000000000000000`,
                },
              ]);

              assert.fail("Tx should have failed");
            } catch (e: any) {
              assert.notInclude(e.message, "Tx should have failed");

              assert.isDefined(e.data.txHash);
            }
          });
        });

        // This test checks that an on-chain value can be set to 0
        // To do this, we transfer all the balance of the 0x0000...0001 account
        // to some random account, and then check that its balance is zero
        it("should set a value to 0", async function () {
          if (!isFork) {
            this.skip();
          }

          const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
          const sender = "0x0000000000000000000000000000000000000001";

          await this.provider.send("hardhat_impersonateAccount", [sender]);

          // get balance of 0x0000...0001
          const balanceBefore = await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: daiAddress,
              data: "0x70a082310000000000000000000000000000000000000000000000000000000000000001",
            },
          ]);

          // send out the full balance
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: daiAddress,
              data: `0xa9059cbb0000000000000000000000005a3fed996fc40791a26e7fb78dda4f9293788951${balanceBefore.slice(
                2
              )}`,
            },
          ]);

          const balanceAfter = await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: daiAddress,
              data: "0x70a082310000000000000000000000000000000000000000000000000000000000000001",
            },
          ]);

          assert.equal(BigInt(balanceAfter), 0n);
        });

        it("should use the proper chain ID", async function () {
          // arrange: deploy a contract that will emit the chain ID:
          const [_, compilerOutput] = await compileLiteral(`
            contract ChainIdEmitter {
              event ChainId(uint i);
              function emitChainId() public {
                uint chainId;
                assembly { chainId := chainid() }
                emit ChainId(chainId);
              }
            }
          `);
          const contractAddress = await deployContract(
            this.provider,
            `0x${compilerOutput.contracts["literal.sol"].ChainIdEmitter.evm.bytecode.object}`
          );

          async function getChainIdFromContract(
            provider: EthereumProvider
          ): Promise<number> {
            const txHash = await provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: contractAddress,
                data: "0x68df392f", // abi-encoded "emitChainId()"
              },
            ]);
            const receipt = await provider.send("eth_getTransactionReceipt", [
              txHash,
            ]);
            return rpcQuantityToNumber(
              receipt.logs[0].data.replace(/0x0*/, "0x")
            );
          }

          const chainId = await this.provider.send("eth_chainId");

          // assert:
          assert.equal(await getChainIdFromContract(this.provider), chainId);
        });

        it("Should use the correct value of block.number", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_BLOCK_NUMBER_CONTRACT.bytecode.object}`
          );

          const blockNumberBeforeTx = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_BLOCK_NUMBER_CONTRACT.selectors.setBlockNumber}`,
            },
          ]);

          const contractBlockNumber = rpcDataToNumber(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: `${EXAMPLE_BLOCK_NUMBER_CONTRACT.selectors.blockNumber}`,
              },
            ])
          );

          assert.equal(contractBlockNumber, blockNumberBeforeTx + 1);
        });
      });

      describe("eth_sendTransaction with minGasPrice", function () {
        useProvider({ hardfork: "berlin" });
        useHelpers();

        const minGasPrice = 20;

        beforeEach(async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("hardhat_setMinGasPrice", [
            numberToRpcQuantity(minGasPrice),
          ]);
        });

        it("should not mine transactions with a gas price below the minimum", async function () {
          const txHash1 = await this.sendTx({
            nonce: 0,
            gasPrice: minGasPrice - 1,
          });
          const txHash2 = await this.sendTx({
            nonce: 1,
            gasPrice: minGasPrice - 1,
          });

          await this.assertPendingTxs([txHash1, txHash2]);
          await this.mine();
          await this.assertPendingTxs([txHash1, txHash2]);
        });

        it("should not mine a queued transaction if previous txs have a low gas price", async function () {
          const txHash1 = await this.sendTx({
            nonce: 0,
            gasPrice: minGasPrice - 1,
          });
          const txHash2 = await this.sendTx({
            nonce: 1,
            gasPrice: minGasPrice - 1,
          });
          const txHash3 = await this.sendTx({
            nonce: 2,
            gasPrice: minGasPrice,
          });

          await this.assertPendingTxs([txHash1, txHash2, txHash3]);
          await this.mine();
          await this.assertPendingTxs([txHash1, txHash2, txHash3]);
        });

        it("should mine a pending tx even if txs from another account have a low gas price", async function () {
          const txHash1 = await this.sendTx({
            nonce: 0,
            gasPrice: minGasPrice - 1,
          });
          const txHash2 = await this.sendTx({
            nonce: 1,
            gasPrice: minGasPrice - 1,
          });
          const txHash3 = await this.sendTx({
            from: DEFAULT_ACCOUNTS_ADDRESSES[2],
            nonce: 0,
            gasPrice: minGasPrice + 1,
          });

          await this.assertPendingTxs([txHash1, txHash2, txHash3]);
          await this.mine();
          await this.assertPendingTxs([txHash1, txHash2]);
          await this.assertLatestBlockTxs([txHash3]);
        });
      });

      describe("eth_sendTransaction http JSON-RPC response", function () {
        useProvider({ hardfork: "london" });

        let client: Client;

        // send the transaction using an http client, otherwise the wrapped
        // provider will intercept the response and throw an error
        async function sendTransaction({ from, to, data }: any): Promise<any> {
          return client
            .request({
              method: "POST",
              path: "/",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_sendTransaction",
                params: [
                  {
                    from,
                    to,
                    data,
                  },
                ],
              }),
            })
            .then((x) => x.body.json());
        }

        beforeEach(function () {
          if (this.serverInfo === undefined || isFork) {
            this.skip();
          }

          const url = `http://${this.serverInfo.address}:${this.serverInfo.port}`;
          client = new Client(url, {
            keepAliveTimeout: 10,
            keepAliveMaxTimeout: 10,
          });
        });

        it("Should return the hash of the transaction that reverts", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          const response = await sendTransaction({
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: contractAddress,
            data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
          });

          const txHash = response.error?.data?.txHash;
          assert.isDefined(txHash);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          assert.equal(receipt.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
          assert.equal(receipt.to, contractAddress);
          assert.equal(receipt.status, "0x0");
        });

        it("Should return the data of a transaction that reverts without a reason string", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          const response = await sendTransaction({
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: contractAddress,
            data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
          });

          assert.isDefined(response.error?.data);
          assert.equal(response.error.message, response.error.data.message);
          assert.equal(response.error.data.data, "0x");
        });

        it("Should return the data of a transaction that reverts with a reason string", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          const response = await sendTransaction({
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: contractAddress,
            data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}`,
          });

          assert.isDefined(response.error?.data);
          assert.equal(response.error.message, response.error.data.message);
          assert.equal(
            response.error.data.data,
            // Error(string) encoded with value "a reason"
            "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000086120726561736f6e000000000000000000000000000000000000000000000000"
          );
        });

        it("Should return the data of a transaction that panics", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          const response = await sendTransaction({
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: contractAddress,
            data: `${EXAMPLE_REVERT_CONTRACT.selectors.panics}`,
          });

          assert.isDefined(response.error?.data);
          assert.equal(response.error.message, response.error.data.message);
          assert.equal(
            response.error.data.data,
            // Panic(uint256) encoded with value 0x32 (out-of-bounds array access)
            "0x4e487b710000000000000000000000000000000000000000000000000000000000000032"
          );
        });

        it("Should return the data of a transaction that reverts with a custom error", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          const response = await sendTransaction({
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: contractAddress,
            data: `${EXAMPLE_REVERT_CONTRACT.selectors.customError}`,
          });

          assert.isDefined(response.error?.data);
          assert.equal(response.error.message, response.error.data.message);
          assert.equal(
            response.error.data.data,
            // MyCustomError() encoded
            "0x4e7254d6"
          );
        });
      });
    });
  });
});
