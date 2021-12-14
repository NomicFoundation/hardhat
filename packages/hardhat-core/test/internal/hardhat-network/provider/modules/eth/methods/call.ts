import { assert } from "chai";

import { BN } from "ethereumjs-util";
import {
  numberToRpcQuantity,
  rpcDataToNumber,
  rpcQuantityToNumber,
  rpcDataToBN,
  rpcQuantityToBN,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { getCurrentTimestamp } from "../../../../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import {
  EXAMPLE_BLOCKHASH_CONTRACT,
  EXAMPLE_CONTRACT,
  EXAMPLE_READ_CONTRACT,
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
          let ethBalance: BN;

          function deployContractAndGetEthBalance() {
            beforeEach(async function () {
              contractAddress = await deployContract(
                this.provider,
                deploymentBytecode
              );

              ethBalance = rpcQuantityToBN(
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
                rpcDataToBN(balanceResult).toString(),
                ethBalance.toString()
              );
            });

            it("Should use any provided gasPrice", async function () {
              const gasLimit = 200_000;
              const gasPrice = 2;

              const balanceResult = await this.provider.send("eth_call", [
                {
                  from: CALLER,
                  to: contractAddress,
                  data: balanceSelector,
                  gas: numberToRpcQuantity(gasLimit),
                  gasPrice: numberToRpcQuantity(gasPrice),
                },
              ]);

              assert.isTrue(
                rpcDataToBN(balanceResult).eq(
                  ethBalance.subn(gasLimit * gasPrice)
                )
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
                  rpcDataToBN(balanceResult).toString(),
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
                  rpcDataToBN(balanceResult).toString(),
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
                assert.isTrue(
                  rpcDataToBN(balanceResult).eq(ethBalance.subn(500_000 * 3))
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
                assert.isTrue(
                  rpcDataToBN(balanceResult).eq(ethBalance.subn(500_000 * 6))
                );
              });
            });
          }
        });
      });
    });
  });
});
