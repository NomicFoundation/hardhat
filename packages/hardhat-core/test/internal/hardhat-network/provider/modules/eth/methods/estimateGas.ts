import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import sinon, { SinonSpy } from "sinon";
import { Client } from "undici";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  Transaction,
} from "@nomicfoundation/ethereumjs-tx";

import {
  numberToRpcQuantity,
  rpcQuantityToBigInt,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import {
  EXAMPLE_CONTRACT,
  EXAMPLE_REVERT_CONTRACT,
} from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import { getPendingBaseFeePerGas } from "../../../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { deployContract } from "../../../../helpers/transactions";
import { HardhatNode } from "../../../../../../../src/internal/hardhat-network/provider/node";
import { RpcBlockOutput } from "../../../../../../../src/internal/hardhat-network/provider/output";
import * as BigIntUtils from "../../../../../../../src/internal/util/bigint";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_estimateGas", async function () {
        it("should estimate the gas for a transfer", async function () {
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: zeroAddress(),
              to: zeroAddress(),
            },
          ]);

          assert.closeTo(Number(estimation), 21_000, 5);
        });

        it("should estimate the gas for a contract call", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          const gasEstimate = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const tx = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.equal(gasEstimate, receipt.gasUsed);
        });

        it("should leverage block tag parameter", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

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

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            numberToRpcQuantity(firstBlockNumber + 1),
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.isTrue(BigInt(result) > BigInt(result2));
        });

        it("should estimate gas in the context of pending block when called with 'pending' blockTag param", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "latest",
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "pending",
          ]);

          assert.isTrue(BigInt(result) > BigInt(result2));
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const latestBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const futureBlock = latestBlockNumber + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_estimateGas",
            [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(123),
              },
              numberToRpcQuantity(futureBlock),
            ],
            `Received invalid block tag ${futureBlock}. Latest block number is ${latestBlockNumber}`
          );
        });

        it("Should use pending as default blockTag", async function () {
          if (isFork) {
            this.skip();
          }

          const blockNumber = await this.provider.send("eth_blockNumber");
          assert.equal(blockNumber, "0x0");

          // We estimate the deployment of a contract that asserts that block.number > 0,
          // which would fail if the estimation was run on `latest` right after the network is initialized
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: "0x6080604052348015600f57600080fd5b5060004311601957fe5b603f8060266000396000f3fe6080604052600080fdfea2646970667358221220f77641956f2e98e8fd65e712d73442aba66a133641d08a3058907caec561bb2364736f6c63430007040033",
            },
          ]);

          // We know that it should fit in 100k gas
          assert.isTrue(BigInt(estimation) <= 100_000n);
        });

        describe("Fee price fields", function () {
          describe("Running a hardfork with EIP-1559", function () {
            it("Should validate that gasPrice and maxFeePerGas & maxPriorityFeePerGas are not mixed", async function () {
              await assertInvalidInputError(
                this.provider,
                "eth_estimateGas",
                [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    gasPrice: numberToRpcQuantity(1),
                    maxFeePerGas: numberToRpcQuantity(1),
                  },
                ],
                "Cannot send both gasPrice and maxFeePerGas"
              );

              await assertInvalidInputError(
                this.provider,
                "eth_estimateGas",
                [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[0],
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
                "eth_estimateGas",
                [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(1),
                    maxPriorityFeePerGas: numberToRpcQuantity(2),
                  },
                ],
                "maxPriorityFeePerGas (2) is bigger than maxFeePerGas (1)"
              );
            });

            describe("Default values", function () {
              const ONE_GWEI = 10n ** 9n;
              // TODO: We test an internal method here. We should improve this.
              // Note: We don't need to test incompatible values (e.g. gasPrice and maxFeePerGas).

              let spy: SinonSpy;

              beforeEach(function () {
                if (
                  process.env.HARDHAT_EXPERIMENTAL_VM_MODE === "edr" ||
                  process.env.HARDHAT_EXPERIMENTAL_VM_MODE === "dual"
                ) {
                  this.skip();
                }

                spy = sinon.spy(
                  HardhatNode.prototype as any,
                  "_runTxAndRevertMutations"
                );
              });

              afterEach(function () {
                if (
                  process.env.HARDHAT_EXPERIMENTAL_VM_MODE === "edr" ||
                  process.env.HARDHAT_EXPERIMENTAL_VM_MODE === "dual"
                ) {
                  return;
                }
                spy.restore();
              });

              it("Should use a gasPrice if provided", async function () {
                const gasPrice = await getPendingBaseFeePerGas(this.provider);

                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    gasPrice: numberToRpcQuantity(gasPrice),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("gasPrice" in firstArg);

                const tx: Transaction | AccessListEIP2930Transaction = firstArg;
                assert.isTrue(tx.gasPrice === gasPrice);
              });

              it("Should use the maxFeePerGas and maxPriorityFeePerGas if provided", async function () {
                const maxFeePerGas = await getPendingBaseFeePerGas(
                  this.provider
                );
                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(maxFeePerGas),
                    maxPriorityFeePerGas: numberToRpcQuantity(
                      maxFeePerGas / 2n
                    ),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas === maxFeePerGas);
                assert.isTrue(tx.maxPriorityFeePerGas === maxFeePerGas / 2n);
              });

              it("should use the default maxPriorityFeePerGas, 1gwei", async function () {
                const maxFeePerGas = BigIntUtils.max(
                  await getPendingBaseFeePerGas(this.provider),
                  10n * ONE_GWEI
                );
                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(maxFeePerGas),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas === maxFeePerGas);
                assert.isTrue(
                  tx.maxPriorityFeePerGas === ONE_GWEI,
                  `expected to get a maxPriorityFeePerGas of ${ONE_GWEI.toString()}, but got ${tx.maxPriorityFeePerGas.toString()}`
                );
              });

              it("should cap the maxPriorityFeePerGas with maxFeePerGas", async function () {
                await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
                  "0x0",
                ]);

                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(123),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas === 123n);
                assert.isTrue(tx.maxPriorityFeePerGas === 123n);
              });

              it("should use twice the next block's base fee as default maxFeePerGas, plus the priority fee, when the blocktag is pending", async function () {
                await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
                  numberToRpcQuantity(10),
                ]);

                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxPriorityFeePerGas: numberToRpcQuantity(1),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas === 21n);
                assert.isTrue(tx.maxPriorityFeePerGas === 1n);
              });

              it("should use the block's base fee per gas as maxFeePerGas, plus the priority fee, when estimating in a past block", async function () {
                const block: RpcBlockOutput = await this.provider.send(
                  "eth_getBlockByNumber",
                  ["latest", false]
                );

                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxPriorityFeePerGas: numberToRpcQuantity(1),
                  },
                  "latest",
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(
                  tx.maxFeePerGas ===
                    rpcQuantityToBigInt(block.baseFeePerGas!) + 1n
                );
                assert.isTrue(tx.maxPriorityFeePerGas === 1n);
              });
            });
          });
        });

        describe("http JSON-RPC response", function () {
          let client: Client;

          // send the transaction using an http client, otherwise the wrapped
          // provider will intercept the response and throw an error
          async function estimateGas({ from, to, data }: any): Promise<any> {
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
                  method: "eth_estimateGas",
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

          it("Should return the data of a gas estimation that reverts without a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await estimateGas({
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(response.error.data.data, "0x");
          });

          it("Should return the data of a gas estimation that reverts with a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await estimateGas({
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

          it("Should return the data of a gas estimation that panics", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await estimateGas({
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

          it("Should return the data of a gas estimation that reverts with a custom error", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await estimateGas({
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
