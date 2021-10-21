import { assert } from "chai";
import { BN, toBuffer, zeroAddress } from "ethereumjs-util";

import sinon, { SinonSpy } from "sinon";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  Transaction,
} from "@ethereumjs/tx";
import {
  numberToRpcQuantity,
  rpcQuantityToBN,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
import { deployContract } from "../../../../helpers/transactions";
import { HardhatNode } from "../../../../../../../src/internal/hardhat-network/provider/node";
import { RpcBlockOutput } from "../../../../../../../src/internal/hardhat-network/provider/output";

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

      describe("eth_estimateGas", async function () {
        it("should estimate the gas for a transfer", async function () {
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: zeroAddress(),
              to: zeroAddress(),
            },
          ]);

          assert.isTrue(new BN(toBuffer(estimation)).lten(23000));
        });

        it("should leverage block tag parameter", async function () {
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

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            numberToRpcQuantity(firstBlock + 1),
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
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

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

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
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
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
          assert.isTrue(new BN(toBuffer(estimation)).lten(100000));
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
              const ONE_GWEI = new BN(10).pow(new BN(9));
              // TODO: We test an internal method here. We should improve this.
              // Note: We don't need to test incompatible values (e.g. gasPrice and maxFeePerGas).

              let spy: SinonSpy;

              beforeEach(function () {
                spy = sinon.spy(
                  HardhatNode.prototype as any,
                  "_runTxAndRevertMutations"
                );
              });

              afterEach(function () {
                spy.restore();
              });

              it("Should use a gasPrice if provided", async function () {
                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    gasPrice: numberToRpcQuantity(ONE_GWEI.muln(10)),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("gasPrice" in firstArg);

                const tx: Transaction | AccessListEIP2930Transaction = firstArg;
                assert.isTrue(tx.gasPrice.eq(ONE_GWEI.muln(10)));
              });

              it("Should use the maxFeePerGas and maxPriorityFeePerGas if provided", async function () {
                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(ONE_GWEI.muln(10)),
                    maxPriorityFeePerGas: numberToRpcQuantity(ONE_GWEI.muln(5)),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas.eq(ONE_GWEI.muln(10)));
                assert.isTrue(tx.maxPriorityFeePerGas.eq(ONE_GWEI.muln(5)));
              });

              it("should use the default maxPriorityFeePerGas, 1gwei", async function () {
                await this.provider.send("eth_estimateGas", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    maxFeePerGas: numberToRpcQuantity(ONE_GWEI.muln(10)),
                  },
                ]);

                const call = spy.getCall(0);
                assert.isDefined(call);

                const firstArg = call.firstArg;
                assert.isTrue("maxFeePerGas" in firstArg);

                const tx: FeeMarketEIP1559Transaction = firstArg;
                assert.isTrue(tx.maxFeePerGas.eq(ONE_GWEI.muln(10)));
                assert.isTrue(tx.maxPriorityFeePerGas.eq(ONE_GWEI));
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
                assert.isTrue(tx.maxFeePerGas.eqn(123));
                assert.isTrue(tx.maxPriorityFeePerGas.eqn(123));
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
                assert.isTrue(tx.maxFeePerGas.eqn(21));
                assert.isTrue(tx.maxPriorityFeePerGas.eqn(1));
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
                  tx.maxFeePerGas.eq(
                    rpcQuantityToBN(block.baseFeePerGas!).addn(1)
                  )
                );
                assert.isTrue(tx.maxPriorityFeePerGas.eqn(1));
              });
            });
          });
        });
      });
    });
  });
});
