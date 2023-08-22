import { assert } from "chai";
import { Client } from "undici";

import { ethers } from "ethers";
import {
  numberToRpcQuantity,
  rpcDataToNumber,
  rpcQuantityToNumber,
  rpcDataToBigInt,
  rpcQuantityToBigInt,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { getCurrentTimestamp } from "../../../../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertAddressBalance,
  assertInvalidArgumentsError,
  assertInvalidInputError,
} from "../../../../helpers/assertions";
import {
  EXAMPLE_BLOCKHASH_CONTRACT,
  EXAMPLE_CONTRACT,
  EXAMPLE_READ_CONTRACT,
  EXAMPLE_REVERT_CONTRACT,
  STATE_OVERRIDE_SET_CONTRACT_A,
  STATE_OVERRIDE_SET_CONTRACT_B,
  STATE_OVERRIDE_SET_CONTRACT_C,
  STATE_OVERRIDE_SET_CONTRACT_D,
} from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
import {
  deployContract,
  sendTxToZeroAddress,
} from "../../../../helpers/transactions";
import { compileLiteral } from "../../../../stack-traces/compilation";
import { EthereumProvider } from "../../../../../../../src/types";
import { InvalidInputError } from "../../../../../../../src/internal/core/providers/errors";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, chainId }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      describe("eth_call", async function () {
        describe("when called without blockTag param", () => {
          it("Should return the value returned by the contract", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
            ]);

            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });

          it("Should return the value returned by the contract using an unknown account as from", async function () {
            const from = "0x1234567890123456789012345678901234567890";

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i, from },
            ]);

            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i, from },
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });

          it("Should be run in the context of the last block", async function () {
            const firstBlock = await getFirstBlock();
            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
            ]);

            assert.equal(timestampResult, timestamp);
          });

          it("Should return an empty buffer when a non-contract account is called", async function () {
            const result = await this.provider.send("eth_call", [
              {
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: EXAMPLE_CONTRACT.selectors.i,
              },
            ]);

            assert.equal(result, "0x");
          });

          it("Should work with blockhashes calls", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_BLOCKHASH_CONTRACT.bytecode.object}`
            );

            const resultBlock0 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test0,
              },
            ]);

            assert.lengthOf(resultBlock0, 66);

            const resultBlock1 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test1,
              },
            ]);

            assert.lengthOf(resultBlock1, 66);

            const resultBlock1m = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test1m,
              },
            ]);

            assert.equal(
              resultBlock1m,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );
          });

          it("should run in the context of the blocktag's block", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockNumber = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber", [])
            );

            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              numberToRpcQuantity(blockNumber),
            ]);

            assert.equal(rpcDataToNumber(blockResult), blockNumber);
          });

          it("should accept a gas limit higher than the block gas limit being used", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockNumber = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber", [])
            );

            const gas = "0x5f5e100"; // 100M gas

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
                gas,
              },
              numberToRpcQuantity(blockNumber),
            ]);

            assert.equal(rpcDataToNumber(blockResult), blockNumber);

            const blockResult2 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
                gas,
              },
              "pending",
            ]);

            assert.equal(rpcDataToNumber(blockResult2), blockNumber + 1);
          });

          it("Should accept explicit nulls for optional parameter values", async function () {
            // For simplicity of this test, and because this test only intends
            // to exercise input parameter validation, utilize the case of
            // eth_call calling into a non-contract account, which returns an
            // empty buffer.
            assert.equal(
              await this.provider.send("eth_call", [
                {
                  from: null,
                  to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  gas: null,
                  gasPrice: null,
                  value: null,
                  data: null,
                },
              ]),
              "0x"
            );
          });
        });

        describe("when called with 'latest' blockTag param", () => {
          it("Should be run in the context of the last block", async function () {
            const firstBlock = await getFirstBlock();
            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              "latest",
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
              "latest",
            ]);

            assert.equal(timestampResult, timestamp);
          });
        });

        describe("when called with 'pending' blockTag param", () => {
          it("Should be run in the context of a new block", async function () {
            const firstBlock = await getFirstBlock();
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              "pending",
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 2);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
              "pending",
            ]);

            assert.equal(timestampResult, timestamp);
          });

          it("Should be run in the context with pending transactions mined", async function () {
            const snapshotId = await this.provider.send("evm_snapshot");
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            await this.provider.send("evm_revert", [snapshotId]);
            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
                gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
              },
            ]);

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
              "pending",
            ]);

            // result would equal "0x" if the contract wasn't deployed
            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("evm_mine");

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
              "pending",
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });
        });

        describe("when called with a block number as blockTag param", () => {
          it("Should be run in the context of the block passed as a parameter", async function () {
            const firstBlock = await getFirstBlock();

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            await this.provider.send("evm_mine");
            await this.provider.send("evm_mine");
            await this.provider.send("evm_mine");

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              numberToRpcQuantity(firstBlock + 1),
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);
          });

          it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
            const firstBlock = await getFirstBlock();
            const futureBlock = firstBlock + 1;

            await assertInvalidInputError(
              this.provider,
              "eth_call",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  value: numberToRpcQuantity(123),
                },
                numberToRpcQuantity(futureBlock),
              ],
              `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
            );
          });

          it("Should leverage block tag parameter", async function () {
            const firstBlock = await getFirstBlock();

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const newState =
              "000000000000000000000000000000000000000000000000000000000000000a";

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
              },
            ]);

            assert.equal(
              await this.provider.send("eth_call", [
                {
                  to: contractAddress,
                  data: EXAMPLE_CONTRACT.selectors.i,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                },
                numberToRpcQuantity(firstBlock + 1),
              ]),
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            assert.equal(
              await this.provider.send("eth_call", [
                {
                  to: contractAddress,
                  data: EXAMPLE_CONTRACT.selectors.i,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                },
                "latest",
              ]),
              `0x${newState}`
            );
          });

          it("Should return the initial balance for the genesis accounts in the previous block after a transaction", async function () {
            const blockNumber = await this.provider.send("eth_blockNumber");
            const account = DEFAULT_ACCOUNTS_ADDRESSES[0];

            const initialBalanceBeforeTx = await this.provider.send(
              "eth_getBalance",
              [account, blockNumber]
            );
            assert.equal(initialBalanceBeforeTx, "0x3635c9adc5dea00000");

            await sendTxToZeroAddress(this.provider, account);

            const initialBalanceAfterTx = await this.provider.send(
              "eth_getBalance",
              [account, blockNumber]
            );
            assert.equal(initialBalanceAfterTx, "0x3635c9adc5dea00000");
          });
        });

        describe.only("eth_call with state override", function () {
          const address = DEFAULT_ACCOUNTS_ADDRESSES[2];
          let contractAAddress: string;
          let contractBAddress: string;
          let contractDAddress: string;

          this.beforeEach(async function () {
            // Contract A imports contract B, so first deploy contract B
            contractBAddress = await deployContract(
              this.provider,
              `0x${STATE_OVERRIDE_SET_CONTRACT_B.bytecode.object}`
            );

            // Contract A constructor requires the address of contract B.
            // This value is encoded and appended to the data containing the bytecode of contract A
            const abiCoder = new ethers.AbiCoder();
            const encodedParameters = abiCoder
              .encode(["address"], [contractBAddress])
              .slice(2);

            contractAAddress = await deployContract(
              this.provider,
              `0x${STATE_OVERRIDE_SET_CONTRACT_A.bytecode.object}${encodedParameters}`
            );

            contractDAddress = await deployContract(
              this.provider,
              `0x${STATE_OVERRIDE_SET_CONTRACT_D.bytecode.object}`
            );
          });

          describe("balance", function () {
            it("should call eth_call without the optional state override properties", async function () {
              const balance = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.senderBalance,
                },
                "latest",
              ]);

              assert.equal(
                balance,
                "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"
              );
            });

            it("should override the balance", async function () {
              // The balance should be equal to the value set in the state override properties
              const balance = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.senderBalance,
                },
                "latest",
                {
                  [address]: {
                    balance: "0x0",
                  },
                },
              ]);

              assert.equal(
                balance,
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            });

            it("should throw an error, the wrong data format is used", async function () {
              await assertInvalidArgumentsError(
                this.provider,
                "eth_call",
                [
                  {
                    from: address,
                    to: contractAAddress,
                    data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.senderBalance,
                  },
                  "latest",
                  {
                    [address]: {
                      balance: "0x00000000000000001", // Padding zeros are not allowed. It should be 0x1
                    },
                  },
                ],
                'Errors encountered in param 2: Invalid value "0x00000000000000001" supplied to : ({ [K in address]: stateOverrideOptions } | undefined)/0: { [K in address]: stateOverrideOptions }/0xce9efd622e568b3a21b19532c77fc76c93c34bd4: stateOverrideOptions/balance: QUANTITY | undefined, Invalid value {"0xce9efd622e568b3a21b19532c77fc76c93c34bd4":{"balance":"0x00000000000000001"}} supplied to : ({ [K in address]: stateOverrideOptions } | undefined)/1: undefined'
              );
            });
          });

          describe("nonce", function () {
            let currentDAddrNonce: string;

            this.beforeEach(async function () {
              // Get the nonce for the D address
              currentDAddrNonce = await this.provider.send(
                "eth_getTransactionCount",
                [contractDAddress, "latest"]
              );
            });

            function padHexString(hexString: string) {
              const TOTAL_CHARS = 64;
              return `0x${hexString
                .slice(2)
                .padStart(TOTAL_CHARS, "0")
                .toLocaleLowerCase()}`;
            }

            it("should not override the nonce", async function () {
              const contractAddrNonOverrideNonce = ethers.getCreateAddress({
                from: contractDAddress,
                nonce: BigInt(currentDAddrNonce),
              });

              const nonOverrideNonceAddr = await this.provider.send(
                "eth_call",
                [
                  {
                    from: address,
                    to: contractDAddress,
                    data: STATE_OVERRIDE_SET_CONTRACT_D.selectors
                      .deployChildContract,
                  },
                  "latest",
                ]
              );

              assert.equal(
                nonOverrideNonceAddr,
                padHexString(contractAddrNonOverrideNonce)
              );
            });

            it("should override the nonce", async function () {
              const overrideNonce = "0x234";

              const contractAddrOverrideNonce = ethers.getCreateAddress({
                from: contractDAddress,
                nonce: BigInt(overrideNonce),
              });

              const overrideNonceAddr = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractDAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_D.selectors
                    .deployChildContract,
                },
                "latest",
                {
                  [contractDAddress]: {
                    nonce: overrideNonce,
                  },
                },
              ]);

              assert.equal(
                overrideNonceAddr,
                padHexString(contractAddrOverrideNonce)
              );
            });

            it("should throw an error, the wrong data format is used", async function () {
              await assertInvalidArgumentsError(
                this.provider,
                "eth_call",
                [
                  {
                    from: address,
                    to: contractAAddress,
                    data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.senderBalance,
                  },
                  "latest",
                  {
                    [address]: {
                      nonce: "0x00000000000000001", // Padding zeros are not allowed. It should be 0x1
                    },
                  },
                ],
                'Errors encountered in param 2: Invalid value "0x00000000000000001" supplied to : ({ [K in address]: stateOverrideOptions } | undefined)/0: { [K in address]: stateOverrideOptions }/0xce9efd622e568b3a21b19532c77fc76c93c34bd4: stateOverrideOptions/nonce: QUANTITY | undefined, Invalid value {"0xce9efd622e568b3a21b19532c77fc76c93c34bd4":{"nonce":"0x00000000000000001"}} supplied to : ({ [K in address]: stateOverrideOptions } | undefined)/1: undefined'
              );
            });

            describe("test the limit value (8 bytes) for the nonce", function () {
              it("should be successful, the nonce value is the maximum allowed value", async function () {
                await this.provider.send("eth_call", [
                  {
                    from: address,
                    to: contractAAddress,
                    data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.senderBalance,
                  },
                  "latest",
                  {
                    [address]: {
                      nonce: "0xFFFFFFFFFFFFFFFF",
                    },
                  },
                ]);
              });

              it("should throw an error, the nonce value is too big", async function () {
                await assertInvalidInputError(
                  this.provider,
                  "eth_call",
                  [
                    {
                      from: address,
                      to: contractAAddress,
                      data: STATE_OVERRIDE_SET_CONTRACT_A.selectors
                        .senderBalance,
                    },
                    "latest",
                    {
                      [address]: {
                        nonce: "0x10000000000000000",
                      },
                    },
                  ],
                  "The 'nonce' property should occupy a maximum of 8 bytes. The max allowed value is: 0xFFFFFFFFFFFFFFFF."
                );
              });
            });
          });

          it("should override the code of contract B with the code of contract C", async function () {
            const message = await this.provider.send("eth_call", [
              {
                from: address,
                to: contractAAddress,
                data: STATE_OVERRIDE_SET_CONTRACT_A.selectors
                  .getMessageFromBContract,
              },
              "latest",
              {
                [contractBAddress]: {
                  code: `0x${STATE_OVERRIDE_SET_CONTRACT_C.bytecode.object}`,
                },
              },
            ]);

            // Message should be the one from contract C: "Hello from the C contract"
            assert.equal(
              message,
              "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001948656c6c6f2066726f6d20746865204320636f6e747261637400000000000000"
            );
          });

          it("should throw an error when both the state and the stateDiff properties are defined", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_call",
              [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.getXAndY,
                },
                "latest",
                {
                  [contractAAddress]: {
                    state: {},
                    stateDiff: {},
                  },
                },
              ],
              "The properties 'state' and 'stateDiff' cannot be used simultaneously when configuring the state override set passed to the eth_call method."
            );
          });

          describe("state property", function () {
            it("should override the state: clear all the storage", async function () {
              const storage = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.getXAndY,
                },
                "latest",
                {
                  [contractAAddress]: {
                    state: {},
                  },
                },
              ]);

              // x and y should be override to 0
              assert.equal(
                storage,
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
              );
            });

            it("should override the state: clear all the storage and then set the storage at slot 1 with value 0x0...0C", async function () {
              const storage = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.getXAndY,
                },
                "latest",
                {
                  [contractAAddress]: {
                    state: {
                      // Memory slot starting at 1, location where x is stored
                      "0x0000000000000000000000000000000000000000000000000000000000000001":
                        "0x000000000000000000000000000000000000000000000000000000000000000c",
                    },
                  },
                },
              ]);

              // x and y should be override to 0, then x should be override to 'c'
              assert.equal(
                storage,
                "0x000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000"
              );
            });
          });

          describe("stateDiff property", function () {
            it("should override only the storage starting at slot 2 (variable y)", async function () {
              const storage = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.getXAndY,
                },
                "latest",
                {
                  [contractAAddress]: {
                    stateDiff: {
                      // Memory slot starting at 2, location where y is stored
                      "0x0000000000000000000000000000000000000000000000000000000000000002":
                        "0x000000000000000000000000000000000000000000000000000000000000000c",
                    },
                  },
                },
              ]);

              // x should not be override, y should be override to c
              assert.equal(
                storage,
                "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000c"
              );
            });

            it("should override both the storage starting at slot 1 (variable x), and the storage starting at slot 2 (variable y)", async function () {
              const storage = await this.provider.send("eth_call", [
                {
                  from: address,
                  to: contractAAddress,
                  data: STATE_OVERRIDE_SET_CONTRACT_A.selectors.getXAndY,
                },
                "latest",
                {
                  [contractAAddress]: {
                    stateDiff: {
                      // Memory slot starting at 1, location where x is stored
                      "0x0000000000000000000000000000000000000000000000000000000000000001":
                        "0x000000000000000000000000000000000000000000000000000000000000000c",
                      // Memory slot starting at 2, location where y is stored
                      "0x0000000000000000000000000000000000000000000000000000000000000002":
                        "0x000000000000000000000000000000000000000000000000000000000000000c",
                    },
                  },
                },
              ]);

              // Both x and y should be override
              assert.equal(
                storage,
                "0x000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000c"
              );
            });
          });

          it("should override the balance and the storage from A (2 override at same time same contract)", async function () {});

          it("should override the stateDiff from A and the value returned from B (2 override at same time different contract)", async function () {});
        });

        describe("Fee price fields", function () {
          let deploymentBytecode: string;
          let balanceSelector: string;

          before(async function () {
            const [_, compilerOutput] = await compileLiteral(`
contract C {
  function balance() public view returns (uint) {
    return msg.sender.balance;
  }
}
`);
            const contract = compilerOutput.contracts["literal.sol"].C;
            deploymentBytecode = `0x${contract.evm.bytecode.object}`;
            balanceSelector = `0x${contract.evm.methodIdentifiers["balance()"]}`;
          });

          const CALLER = DEFAULT_ACCOUNTS_ADDRESSES[2];
          let contractAddress: string;
          let ethBalance: bigint;

          function deployContractAndGetEthBalance() {
            beforeEach(async function () {
              contractAddress = await deployContract(
                this.provider,
                deploymentBytecode
              );

              ethBalance = rpcQuantityToBigInt(
                await this.provider.send("eth_getBalance", [CALLER])
              );
              assert.notEqual(ethBalance.toString(), "0");
            });
          }

          describe("When running without EIP-1559", function () {
            useProvider({ hardfork: "berlin" });

            deployContractAndGetEthBalance();

            it("Should default to gasPrice 0", async function () {
              const balanceResult = await this.provider.send("eth_call", [
                {
                  from: CALLER,
                  to: contractAddress,
                  data: balanceSelector,
                },
              ]);

              assert.equal(
                rpcDataToBigInt(balanceResult).toString(),
                ethBalance.toString()
              );
            });

            it("Should use any provided gasPrice", async function () {
              const gasLimit = 200_000n;
              const gasPrice = 2n;

              const balanceResult = await this.provider.send("eth_call", [
                {
                  from: CALLER,
                  to: contractAddress,
                  data: balanceSelector,
                  gas: numberToRpcQuantity(gasLimit),
                  gasPrice: numberToRpcQuantity(gasPrice),
                },
              ]);

              assert.equal(
                rpcDataToBigInt(balanceResult),
                ethBalance - gasLimit * gasPrice
              );
            });
          });

          for (const hardfork of ["london", "arrowGlacier"]) {
            describe(`When running with EIP-1559 (${hardfork})`, function () {
              useProvider({ hardfork });

              deployContractAndGetEthBalance();

              it("Should validate that gasPrice and maxFeePerGas & maxPriorityFeePerGas are not mixed", async function () {
                await assertInvalidInputError(
                  this.provider,
                  "eth_call",
                  [
                    {
                      from: CALLER,
                      to: contractAddress,
                      gasPrice: numberToRpcQuantity(1),
                      maxFeePerGas: numberToRpcQuantity(1),
                    },
                  ],
                  "Cannot send both gasPrice and maxFeePerGas"
                );

                await assertInvalidInputError(
                  this.provider,
                  "eth_call",
                  [
                    {
                      from: CALLER,
                      to: contractAddress,
                      gasPrice: numberToRpcQuantity(1),
                      maxPriorityFeePerGas: numberToRpcQuantity(1),
                    },
                  ],
                  "Cannot send both gasPrice and maxPriorityFeePerGas"
                );
              });

              it("Should validate that maxFeePerGas >= maxPriorityFeePerGas", async function () {
                await assertInvalidInputError(
                  this.provider,
                  "eth_call",
                  [
                    {
                      from: CALLER,
                      to: contractAddress,
                      maxFeePerGas: numberToRpcQuantity(1),
                      maxPriorityFeePerGas: numberToRpcQuantity(2),
                    },
                  ],
                  "maxPriorityFeePerGas (2) is bigger than maxFeePerGas (1)"
                );
              });

              it("Should default to maxFeePerGas = 0 if nothing provided", async function () {
                const balanceResult = await this.provider.send("eth_call", [
                  {
                    from: CALLER,
                    to: contractAddress,
                    data: balanceSelector,
                  },
                ]);

                assert.equal(
                  rpcDataToBigInt(balanceResult).toString(),
                  ethBalance.toString()
                );
              });

              it("Should use maxFeePerGas if provided with a maxPriorityFeePerGas = 0", async function () {
                const balanceResult = await this.provider.send("eth_call", [
                  {
                    from: CALLER,
                    to: contractAddress,
                    data: balanceSelector,
                    maxFeePerGas: numberToRpcQuantity(1),
                  },
                ]);

                // This doesn't change because the baseFeePerGas of block where we
                // run the eth_call is 0
                assert.equal(
                  rpcDataToBigInt(balanceResult).toString(),
                  ethBalance.toString()
                );
              });

              it("Should use maxPriorityFeePerGas if provided, with maxFeePerGas = maxPriorityFeePerGas", async function () {
                const balanceResult = await this.provider.send("eth_call", [
                  {
                    from: CALLER,
                    to: contractAddress,
                    data: balanceSelector,
                    maxPriorityFeePerGas: numberToRpcQuantity(3),
                    gas: numberToRpcQuantity(500_000),
                  },
                ]);

                // The miner will get the priority fee
                assert.equal(
                  rpcDataToBigInt(balanceResult),
                  ethBalance - 3n * 500_000n
                );
              });

              it("Should use gasPrice if provided", async function () {
                const balanceResult = await this.provider.send("eth_call", [
                  {
                    from: CALLER,
                    to: contractAddress,
                    data: balanceSelector,
                    gasPrice: numberToRpcQuantity(6),
                    gas: numberToRpcQuantity(500_000),
                  },
                ]);

                // The miner will get the gasPrice * gas as a normalized priority fee
                assert.equal(
                  rpcDataToBigInt(balanceResult),
                  ethBalance - 6n * 500_000n
                );
              });
            });
          }
        });

        describe("sender balance", function () {
          const sender = "0x47dc9a4a1ff2436deb1828d038868561c8a5aedf";
          let contractAddress: string;

          beforeEach("deploy the contract", async function () {
            contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
          });

          it("should use the sender's balance if it's enough", async function () {
            // fund the sender
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: sender,
                value: numberToRpcQuantity(1_000_000),
              },
            ]);
            await assertAddressBalance(this.provider, sender, 1_000_000n);

            // call the contract
            const senderBalance = await this.provider.send("eth_call", [
              {
                from: sender,
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.senderBalance,
                gas: numberToRpcQuantity(100_000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.equal(rpcDataToNumber(senderBalance), 900_000);
          });

          it("should increase the sender's balance if it's positive but not enough", async function () {
            // We expect that, before the transaction is executed, the balance
            // of the sender will be increased to the minimum value that lets
            // the VM execute the tx. This means that during the execution of
            // the tx, msg.sender.balance will be 0.

            // fund the sender
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: sender,
                value: numberToRpcQuantity(1_000),
              },
            ]);
            await assertAddressBalance(this.provider, sender, 1_000n);

            // call the contract
            const senderBalance = await this.provider.send("eth_call", [
              {
                from: sender,
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.senderBalance,
                gas: numberToRpcQuantity(100_000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.equal(rpcDataToNumber(senderBalance), 0);
          });

          it("should increase the sender's balance if it's zero", async function () {
            // We expect that, before the transaction is executed, the balance
            // of the sender will be increased to the minimum value that lets
            // the VM execute the tx. This means that during the execution of
            // the tx, msg.sender.balance will be 0.

            await assertAddressBalance(this.provider, sender, 0n);

            // call the contract
            const senderBalance = await this.provider.send("eth_call", [
              {
                from: sender,
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.senderBalance,
                gas: numberToRpcQuantity(100_000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.equal(rpcDataToNumber(senderBalance), 0);
          });
        });

        it("should use the proper chain ID", async function () {
          const [_, compilerOutput] = await compileLiteral(`
            contract ChainIdGetter {
              event ChainId(uint i);
              function getChainId() public returns (uint chainId) {
                assembly { chainId := chainid() }
              }
            }
          `);
          const contractAddress = await deployContract(
            this.provider,
            `0x${compilerOutput.contracts["literal.sol"].ChainIdGetter.evm.bytecode.object}`
          );

          async function getChainIdFromContract(
            provider: EthereumProvider
          ): Promise<number> {
            return rpcQuantityToNumber(
              (
                await provider.send("eth_call", [
                  {
                    to: contractAddress,
                    data: "0x3408e470", // abi-encoded "getChainId()"
                  },
                ])
              ).replace(/0x0*/, "0x")
            );
          }

          assert.equal(await getChainIdFromContract(this.provider), chainId);
        });

        describe("http JSON-RPC response", function () {
          let client: Client;

          // send the transaction using an http client, otherwise the wrapped
          // provider will intercept the response and throw an error
          async function call({ from, to, data }: any) {
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
                  method: "eth_call",
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

          it("Should return the data of a call that reverts without a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await call({
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(response.error.data.data, "0x");
          });

          it("Should return the data of a call that reverts with a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await call({
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

          it("Should return the data of a call that panics", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await call({
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

          it("Should return the data of a call that reverts with a custom error", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await call({
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
});
