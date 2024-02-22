import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TransactionFactory,
} from "@nomicfoundation/ethereumjs-tx";
import { toBytes } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import {
  bufferToRpcData,
  numberToRpcQuantity,
  rpcQuantityToBigInt,
} from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import {
  assertInvalidArgumentsError,
  assertInvalidInputError,
} from "../../../helpers/assertions";
import { getPendingBaseFeePerGas } from "../../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../../../helpers/providers";
import {
  deployContract,
  getTxToDeployBytecode,
  sendDeploymentTx,
  sendTxToZeroAddress,
} from "../../../helpers/transactions";
import { useProvider as importedUseProvider } from "../../../helpers/useProvider";
import {
  EIP1559RpcTransactionOutput,
  RpcBlockOutput,
} from "../../../../../../src/internal/hardhat-network/provider/output";
import { InvalidArgumentsError } from "../../../../../../src/internal/core/providers/errors";
import * as BigIntUtils from "../../../../../../src/internal/util/bigint";
import {
  EXAMPLE_TOUCH_ADDRESS_CONTRACT,
  EXAMPLE_DIFFICULTY_CONTRACT,
  EXAMPLE_READ_CONTRACT,
} from "../../../helpers/contracts";

describe("Eth module - hardfork dependant tests", function () {
  function useProviderAndCommon(
    hardfork: string,
    { allowUnlimitedContractSize } = { allowUnlimitedContractSize: false }
  ) {
    importedUseProvider({ hardfork, allowUnlimitedContractSize });
    beforeEach(async function () {
      // TODO: Find out a better way to obtain the common here
      const provider: any = this.hardhatNetworkProvider;

      // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
      this.common = provider["_common"];
    });
  }

  const privateKey = Buffer.from(
    DEFAULT_ACCOUNTS[1].privateKey.slice(2),
    "hex"
  );

  function getSampleSignedTx(common: Common) {
    const tx = TransactionFactory.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 10,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  function getSampleSignedAccessListTx(common: Common) {
    const tx = AccessListEIP2930Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 10,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  function getSampleSignedEIP1559Tx(common: Common) {
    const tx = FeeMarketEIP1559Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        maxFeePerGas: 10e9,
        maxPriorityFeePerGas: 1e9,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  function getEffectiveGasPrice(
    baseFee: bigint,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint
  ) {
    return (
      BigIntUtils.min(maxFeePerGas - baseFee, maxPriorityFeePerGas) + baseFee
    );
  }

  describe("Transaction, call and estimate gas validations", function () {
    describe("chain id validation", function () {
      describe("In a hardfork without access list but with EIP-155", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should validate the chain id if sent to eth_sendTransaction", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, chainId: numberToRpcQuantity(1) }],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id if an EIP-155 tx is sent with eth_sendRawTransaction", async function () {
          const signedTx = getSampleSignedTx(
            new Common({ chain: "mainnet", hardfork: "spuriousDragon" })
          );
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "signed for another chain"
          );
        });
      });

      describe("In a hardfork with access list", function () {
        useProviderAndCommon("berlin");

        it("Should validate the chain id if sent to eth_sendTransaction using access list", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [
              {
                from: sender,
                to: sender,
                chainId: numberToRpcQuantity(1),
                accessList: [],
              },
            ],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id in eth_sendRawTransaction using an access list tx", async function () {
          const signedTx = getSampleSignedAccessListTx(
            new Common({ chain: "mainnet", hardfork: "berlin" })
          );
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send a raw transaction with an invalid chainId"
          );
        });
      });

      describe("In a hardfork with EIP-1559", function () {
        for (const hardfork of ["london", "arrowGlacier"]) {
          useProviderAndCommon(hardfork);

          it(`Should validate the chain id if sent to eth_sendTransaction using eip-1559 fields when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");
            await assertInvalidArgumentsError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: sender,
                  to: sender,
                  chainId: numberToRpcQuantity(1),
                  maxFeePerGas: numberToRpcQuantity(
                    await getPendingBaseFeePerGas(this.provider)
                  ),
                },
              ],
              "Invalid chainId"
            );
          });

          it(`Should validate the chain id in eth_sendRawTransaction using an eip-1559 tx when ${hardfork} is activated`, async function () {
            const signedTx = getSampleSignedEIP1559Tx(
              new Common({ chain: "mainnet", hardfork })
            );
            const serialized = bufferToRpcData(signedTx.serialize());

            await assertInvalidArgumentsError(
              this.provider,
              "eth_sendRawTransaction",
              [serialized],
              "Trying to send a raw transaction with an invalid chainId"
            );
          });
        }
      });
    });

    describe("Transaction type validation by hardfork", function () {
      function rejectsSendTransactionWithEIP1559Fields() {
        it("Should reject an eth_sendTransaction if an EIP-1559 fields were provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [
              {
                from: sender,
                to: sender,
                accessList: [],
                maxFeePerGas: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
            ],
            "EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork"
          );
        });
      }

      function rejectsSendRawTransactionWithEIP1559Tx() {
        for (const hardfork of ["london", "arrowGlacier"]) {
          it(`Should reject an eth_sendRawTransaction if the tx uses an EIP-1559 tx when ${hardfork} is activated`, async function () {
            const eip1559Common = this.common.copy();
            eip1559Common.setHardfork(hardfork);

            const signedTx = getSampleSignedEIP1559Tx(eip1559Common);
            const serialized = bufferToRpcData(signedTx.serialize());

            await assertInvalidArgumentsError(
              this.provider,
              "eth_sendRawTransaction",
              [serialized],
              "Trying to send an EIP-1559 transaction"
            );
          });
        }
      }

      describe("With access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_sendRawTransaction if the tx uses an access list", async function () {
          const signedTx = getSampleSignedAccessListTx(this.common);
          const serialized = bufferToRpcData(signedTx.serialize());

          await this.provider.send("eth_sendRawTransaction", [serialized]);
        });

        it("Should accept an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: sender,
              accessList: [],
            },
          ]);
        });

        rejectsSendTransactionWithEIP1559Fields();
        rejectsSendRawTransactionWithEIP1559Tx();
      });

      describe("With EIP1559", function () {
        for (const hardfork of ["london", "arrowGlacier"]) {
          useProviderAndCommon(hardfork);

          it(`Should accept an eth_sendRawTransaction with an EIP-1559 tx when ${hardfork} is activated`, async function () {
            const signedTx = getSampleSignedEIP1559Tx(this.common);
            const serialized = bufferToRpcData(signedTx.serialize());

            await this.provider.send("eth_sendRawTransaction", [serialized]);
          });

          it(`Should accept an eth_sendTransaction if EIP-1559 fields were provided when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");
            await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList: [],
                maxFeePerGas: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
            ]);
          });
        }
      });
    });

    describe("Call and estimate gas types validation by hardfork", function () {
      describe("Running a hardfork without access list", function () {
        useProviderAndCommon("petersburg");

        it("Should reject an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_call",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });

        it("Should reject an eth_call with EIP-1559 fields", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_call",
            [{ from: sender, to: sender, maxFeePerGas: "0x1" }],
            "EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork"
          );
        });

        it("Should reject an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(this.provider, "eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });

        it("Should reject an eth_estimateGas with EIP-1559 fields", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(this.provider, "eth_estimateGas", [
            { from: sender, to: sender, maxFeePerGas: numberToRpcQuantity(1) },
          ]);
        });
      });

      describe("Running a hardfork without access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_call", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });

        it("Should reject an eth_call with EIP-1559 fields", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_call",
            [{ from: sender, to: sender, maxFeePerGas: "0x1" }],
            "EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork"
          );
        });

        it("Should accept an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });

        it("Should reject an eth_estimateGas with EIP-1559 fields", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(this.provider, "eth_estimateGas", [
            {
              from: sender,
              to: sender,
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);
        });
      });

      describe("Running a hardfork with EIP-1559", function () {
        for (const hardfork of ["london", "arrowGlacier"]) {
          useProviderAndCommon(hardfork);

          it(`Should accept an eth_call with EIP-1559 fields when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");

            await this.provider.send("eth_call", [
              { from: sender, to: sender, maxFeePerGas: "0x1" },
            ]);
          });

          it(`Should accept an eth_estimateGas with EIP-1559 fields when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");

            await this.provider.send("eth_estimateGas", [
              {
                from: sender,
                to: sender,
                maxFeePerGas: numberToRpcQuantity(
                  await getPendingBaseFeePerGas(this.provider)
                ),
              },
            ]);
          });
        }
      });
    });
  });

  describe("Block formatting", function () {
    describe("When running EIP-1559", function () {
      for (const hardfork of ["london", "arrowGlacier"]) {
        useProviderAndCommon(hardfork);
        it(`Should have a baseFeePerGas field when ${hardfork} is activated`, async function () {
          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.isDefined(block.baseFeePerGas);
        });
      }
    });

    describe("When not running EIP-1559", function () {
      useProviderAndCommon("berlin");

      it("Should not have a baseFeePerGas field", async function () {
        const block: RpcBlockOutput = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );

        assert.isUndefined(block.baseFeePerGas);
      });
    });
  });

  describe("Transaction and receipt output formatting", function () {
    describe("Transactions formatting", function () {
      describe("Before berlin", function () {
        useProviderAndCommon("petersburg");
        it("Should not include the fields type, chainId and accessList", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isUndefined(tx.type);
          assert.isUndefined(tx.chainId);
          assert.isUndefined(tx.accessList);
        });
      });

      describe("After berlin", function () {
        useProviderAndCommon("berlin");
        describe("legacy tx", function () {
          it("Should include the field type, but not chainId and accessList", async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              { from: sender, to: sender },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.strictEqual(tx.type, numberToRpcQuantity(0));
            assert.isUndefined(tx.chainId);
            assert.isUndefined(tx.accessList);
          });
        });

        describe("access list tx", function () {
          it("Should include the fields type,chainId and accessList", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [
                  "0x1111111111111111111111111111111111111111111111111111111111111111",
                ],
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.strictEqual(tx.type, numberToRpcQuantity(1));
            assert.strictEqual(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, accessList);
          });

          it("Should accept access lists with null storageKeys", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: null,
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.strictEqual(tx.type, numberToRpcQuantity(1));
            assert.strictEqual(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [],
              },
            ]);
          });
        });
      });

      describe("After London", function () {
        for (const hardfork of ["london", "arrowGlacier"]) {
          useProviderAndCommon(hardfork);

          describe(`EIP-1559 txs when ${hardfork} is activated`, function () {
            it("Should include gasPrice, maxBaseFeePerGas and maxPriorityFeePerGas for EIP-1559", async function () {
              const signedTx = getSampleSignedEIP1559Tx(this.common);
              const serialized = bufferToRpcData(signedTx.serialize());

              await this.provider.send("evm_setAutomine", [false]);
              const txHash = await this.provider.send(
                "eth_sendRawTransaction",
                [serialized]
              );

              const pendingRpcTx: EIP1559RpcTransactionOutput =
                await this.provider.send("eth_getTransactionByHash", [txHash]);

              assert.strictEqual(
                pendingRpcTx.maxFeePerGas,
                numberToRpcQuantity(signedTx.maxFeePerGas)
              );

              assert.strictEqual(
                pendingRpcTx.maxPriorityFeePerGas,
                numberToRpcQuantity(signedTx.maxPriorityFeePerGas)
              );

              assert.strictEqual(
                pendingRpcTx.gasPrice,
                numberToRpcQuantity(signedTx.maxFeePerGas)
              );

              // Once it gets mined it should have the effective gas price:
              //  baseFeePerGas + min(maxFeePerGas - baseFeePerGas, maxPriorityFeePerGas)
              await this.provider.send("evm_mine", []);
              const block: RpcBlockOutput = await this.provider.send(
                "eth_getBlockByNumber",
                ["latest", false]
              );
              const minedTx: EIP1559RpcTransactionOutput =
                await this.provider.send("eth_getTransactionByHash", [txHash]);

              const effectiveGasPrice = getEffectiveGasPrice(
                rpcQuantityToBigInt(block.baseFeePerGas!),
                signedTx.maxFeePerGas,
                signedTx.maxPriorityFeePerGas
              );

              assert.strictEqual(
                minedTx.gasPrice,
                numberToRpcQuantity(effectiveGasPrice)
              );
            });
          });
        }
      });
    });

    describe("Receipts formatting", function () {
      describe.skip("Before byzantium", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should have a root field, and shouldn't have a status one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.root, "receipt does not have a root");
          assert.isUndefined(receipt.status);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After byzantium, before berlin", function () {
        useProviderAndCommon("byzantium");

        it("Should have a status field and not a root one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After berlin, before london", function () {
        useProviderAndCommon("berlin");

        it("Should have status and type fields and not a root one", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.strictEqual(receipt.type, "0x0");
        });

        it("Should not have an effectiveGasPrice field", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isUndefined(receipt.effectiveGasPrice);
        });
      });

      describe("After london", function () {
        for (const hardfork of ["london", "arrowGlacier"]) {
          useProviderAndCommon(hardfork);

          it(`should have an effectiveGasPrice field for EIP-1559 txs when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const maxFeePerGas = await getPendingBaseFeePerGas(this.provider);
            const maxPriorityPerGas = maxFeePerGas / 2n;

            const tx = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                maxFeePerGas: numberToRpcQuantity(maxFeePerGas),
                maxPriorityFeePerGas: numberToRpcQuantity(maxPriorityPerGas),
              },
            ]);

            const receipt = await this.provider.send(
              "eth_getTransactionReceipt",
              [tx]
            );

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            const baseFee = rpcQuantityToBigInt(block.baseFeePerGas!);

            const effectiveGasPrice = getEffectiveGasPrice(
              baseFee,
              maxFeePerGas,
              maxPriorityPerGas
            );

            assert.strictEqual(receipt.type, "0x2");
            assert.strictEqual(
              receipt.effectiveGasPrice,
              numberToRpcQuantity(effectiveGasPrice)
            );
          });

          it(`should have an effectiveGasPrice field for Access List txs when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const gasPrice = await getPendingBaseFeePerGas(this.provider);
            const tx = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                gasPrice: numberToRpcQuantity(gasPrice),
                accessList: [],
              },
            ]);

            const receipt = await this.provider.send(
              "eth_getTransactionReceipt",
              [tx]
            );

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            const baseFee = rpcQuantityToBigInt(block.baseFeePerGas!);

            const effectiveGasPrice = getEffectiveGasPrice(
              baseFee,
              gasPrice,
              gasPrice
            );

            assert.strictEqual(receipt.type, "0x1");
            assert.strictEqual(
              receipt.effectiveGasPrice,
              numberToRpcQuantity(effectiveGasPrice)
            );
          });

          it(`should have an effectiveGasPrice field for legacy txs when ${hardfork} is activated`, async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const gasPrice = await getPendingBaseFeePerGas(this.provider);
            const tx = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                gasPrice: numberToRpcQuantity(gasPrice),
              },
            ]);

            const receipt = await this.provider.send(
              "eth_getTransactionReceipt",
              [tx]
            );

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              ["latest", false]
            );
            const baseFee = rpcQuantityToBigInt(block.baseFeePerGas!);

            const effectiveGasPrice = getEffectiveGasPrice(
              baseFee,
              gasPrice,
              gasPrice
            );

            assert.strictEqual(receipt.type, "0x0");
            assert.strictEqual(
              receipt.effectiveGasPrice,
              numberToRpcQuantity(effectiveGasPrice)
            );
          });
        }
      });
    });
  });

  describe("Impersonated accounts", function () {
    describe("Berlin hardfork", function () {
      useProviderAndCommon("berlin");

      it("should allow sending access list txs from impersonated accounts", async function () {
        // impersonate and add funds to some account
        const impersonated = "0x462B1B252FC8e9A447807e4494b271844fBCDa10";
        await this.provider.send("eth_sendTransaction", [
          {
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: impersonated,
            value: numberToRpcQuantity(10n ** 17n),
          },
        ]);
        await this.provider.send("hardhat_impersonateAccount", [impersonated]);

        // send tx from impersonated account
        const txHash = await this.provider.send("eth_sendTransaction", [
          {
            from: impersonated,
            to: impersonated,
            accessList: [],
          },
        ]);

        const tx = await this.provider.send("eth_getTransactionByHash", [
          txHash,
        ]);

        assert.isDefined(tx.accessList);
        assert.isArray(tx.accessList);
      });
    });

    describe("London hardfork", function () {
      for (const hardfork of ["london", "arrowGlacier"]) {
        useProviderAndCommon(hardfork);

        it(`should allow sending EIP-1559 txs from impersonated accounts when ${hardfork} is activated`, async function () {
          // impersonate and add funds to some account
          const impersonated = "0x462B1B252FC8e9A447807e4494b271844fBCDa10";
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: impersonated,
              value: numberToRpcQuantity(10n ** 17n),
            },
          ]);
          await this.provider.send("hardhat_impersonateAccount", [
            impersonated,
          ]);

          // send tx from impersonated account
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: impersonated,
              to: impersonated,
              maxFeePerGas: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isDefined(tx.accessList);
          assert.isArray(tx.accessList);
        });
      }
    });
  });

  describe("Access list transactions", function () {
    useProviderAndCommon("berlin");

    // This contract is useful to test that an access list is being used.
    //
    // The way it works is by letting you control how much gas "test"
    // forwards to "write".
    //
    // If you don't provide the right access list, all the storage accesses that
    // "write" makes are cold, and hence more expensive. You can find the max
    // amount of gas that you can forward to "write" that makes it OOG in this case.
    // That OOG makes "test" revert.
    //
    // Now, if you do provide an access list, all the storage accesses are warm,
    // so cheaper. If you forward the same amount of gas to "write" than before,
    // but provide an access list, it won't OOG and "test" won't revert.
    //
    // pragma solidity 0.7.0;
    //
    // contract C {
    //     uint a = 1; uint b = 1; uint c = 1; uint d = 1; uint e = 1; uint f = 1; uint g = 1;
    //     uint h = 1; uint i = 1; uint j = 1; uint k = 1; uint l = 1; uint m = 1; uint n = 1;
    //
    //     function test(uint gasToForward) public {
    //         this.write{gas: gasToForward}();
    //     }
    //
    //     function write() public {
    //         a += 1; b += 1; c += 1; d += 1; e += 1; f += 1; g += 1;
    //         h += 1; i += 1; j += 1; k += 1; l += 1; m += 1; n += 1;
    //     }
    // }
    const TEST_CONTRACT_DEPLOYMENT_BYTECODE =
      "0x6080604052600160005560018055600160025560016003556001600455600160055560016006556001600755600160085560016009556001600a556001600b556001600c556001600d5534801561005557600080fd5b506101fc806100656000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806329e99f071461003b578063bcb4ab0e14610069575b600080fd5b6100676004803603602081101561005157600080fd5b8101908080359060200190929190505050610073565b005b6100716100d8565b005b3073ffffffffffffffffffffffffffffffffffffffff1663bcb4ab0e826040518263ffffffff1660e01b8152600401600060405180830381600088803b1580156100bc57600080fd5b5087f11580156100d0573d6000803e3d6000fd5b505050505050565b6001600080828254019250508190555060018060008282540192505081905550600160026000828254019250508190555060016003600082825401925050819055506001600460008282540192505081905550600160056000828254019250508190555060016006600082825401925050819055506001600760008282540192505081905550600160086000828254019250508190555060016009600082825401925050819055506001600a600082825401925050819055506001600b600082825401925050819055506001600c600082825401925050819055506001600d6000828254019250508190555056fea2646970667358221220f49d12643dee70a8cfde7a6346c0ca133768619dd2fb07c942e69d5c0433fe3b64736f6c63430007000033";
    const TEST_FUNCTION_SELECTOR = "0x29e99f07";
    const MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST = 70605;
    const WRITE_STORAGE_KEYS = [
      bufferToRpcData(toBytes(0), 32),
      bufferToRpcData(toBytes(1), 32),
      bufferToRpcData(toBytes(2), 32),
      bufferToRpcData(toBytes(3), 32),
      bufferToRpcData(toBytes(4), 32),
      bufferToRpcData(toBytes(5), 32),
      bufferToRpcData(toBytes(6), 32),
      bufferToRpcData(toBytes(7), 32),
      bufferToRpcData(toBytes(8), 32),
      bufferToRpcData(toBytes(9), 32),
      bufferToRpcData(toBytes(10), 32),
      bufferToRpcData(toBytes(11), 32),
      bufferToRpcData(toBytes(12), 32),
      bufferToRpcData(toBytes(13), 32),
    ];

    function abiEncodeUint(uint: number) {
      return BigIntUtils.toEvmWord(uint);
    }

    let contract: string;
    let txData: any;

    beforeEach(async function () {
      contract = await deployContract(
        this.provider,
        TEST_CONTRACT_DEPLOYMENT_BYTECODE
      );

      txData = {
        to: contract,
        data:
          TEST_FUNCTION_SELECTOR +
          abiEncodeUint(MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST),
        accessList: [
          {
            address: contract,
            storageKeys: WRITE_STORAGE_KEYS,
          },
        ],
      };
    });

    describe("Validate access list test contract", function () {
      it("Should revert if the max gas is forwarded", async function () {
        await assert.isRejected(
          this.provider.send("eth_call", [
            {
              ...txData,
              accessList: undefined,
            },
          ]),
          "reverted without a reason"
        );
      });

      it("Should not revert if the more gas is forwarded", async function () {
        await this.provider.send("eth_call", [
          {
            to: contract,
            data:
              TEST_FUNCTION_SELECTOR +
              abiEncodeUint(
                MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST + 1
              ),
          },
        ]);
      });
    });

    describe("eth_call", function () {
      it("should use the access list if sent", async function () {
        await this.provider.send("eth_call", [txData]);
      });
    });

    describe("eth_estimateGas", function () {
      it("should use the access list if sent", async function () {
        // It would revert and throw if the access list is not used
        await this.provider.send("eth_estimateGas", [txData]);
      });
    });

    describe("eth_sendRawTransaction", function () {
      it("should use the access list if an EIP-2930 tx is sent", async function () {
        const unsignedTx = AccessListEIP2930Transaction.fromTxData(
          { ...txData, gasPrice: 10, gasLimit: 1000000 },
          {
            common: this.common,
          }
        );

        const signedTx = unsignedTx.sign(privateKey);

        const txHash = await this.provider.send("eth_sendRawTransaction", [
          bufferToRpcData(signedTx.serialize()),
        ]);

        const tx = await this.provider.send("eth_getTransactionByHash", [
          txHash,
        ]);

        assert.strictEqual(tx.type, numberToRpcQuantity(1));
      });
    });

    describe("eth_sendTransaction", function () {
      describe("When automining", function () {
        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.strictEqual(tx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          // add funds to impersonated account
          const [sender] = await this.provider.send("eth_accounts");
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: from,
              value: "0x16345785d8a0000",
              gasPrice: "0x10",
            },
          ]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(10) },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.strictEqual(tx.type, numberToRpcQuantity(1));
        });
      });

      describe("When txs go through the mempool", function () {
        beforeEach("Disable automining", async function () {
          await this.provider.send("evm_setAutomine", [false]);
        });

        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.strictEqual(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.strictEqual(minedTx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          // add funds to impersonated account
          const [sender] = await this.provider.send("eth_accounts");
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: from,
              value: "0x16345785d8a0000",
              gasPrice: "0x10",
            },
          ]);
          await this.provider.send("evm_mine", []);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(10) },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.strictEqual(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.strictEqual(minedTx.type, numberToRpcQuantity(1));
        });
      });
    });
  });

  describe("eth_feeHistory", function () {
    describe("In a hardfork without EIP-1559", function () {
      useProviderAndCommon("berlin");

      it("Should be disabled", async function () {
        await assertInvalidInputError(
          this.provider,
          "eth_feeHistory",
          ["0x1", "latest"],
          "eth_feeHistory is disabled. It only works with the London hardfork or a later one."
        );
      });
    });

    describe("In a hardfork with EIP-1559", function () {
      for (const hardfork of ["london", "arrowGlacier"]) {
        useProviderAndCommon(hardfork);

        it(`Should be enabled when ${hardfork} is activated`, async function () {
          await this.provider.send("eth_feeHistory", ["0x1", "latest"]);
        });
      }
    });
  });

  describe("merge hardfork", function () {
    describe("pre-merge hardfork", function () {
      useProviderAndCommon("london");

      it("difficulty and nonce should be non-zero values", async function () {
        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        const latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        const difficulty = BigInt(latestBlock.difficulty);
        const nonce = BigInt(latestBlock.nonce);

        assert.notEqual(difficulty, 0n);
        assert.notEqual(nonce, 0n);
      });

      it("mixHash value is always the same", async function () {
        let latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.strictEqual(
          latestBlock.mixHash,
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );

        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.strictEqual(
          latestBlock.mixHash,
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("should throw if the 'safe' or 'finalized' block tags are used in eth_getBlockByNumber", async function () {
        await assertInvalidArgumentsError(
          this.provider,
          "eth_getBlockByNumber",
          ["safe", false],
          "The 'safe' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );

        await assertInvalidArgumentsError(
          this.provider,
          "eth_getBlockByNumber",
          ["finalized", false],
          "The 'finalized' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );
      });

      it("should throw if the 'safe' or 'finalized' block tags are used in eth_call", async function () {
        const contractAddress = await deployContract(
          this.provider,
          `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
        );

        await assertInvalidArgumentsError(
          this.provider,
          "eth_call",
          [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_READ_CONTRACT.selectors.blockNumber}`,
            },
            "safe",
          ],
          "The 'safe' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );

        await assertInvalidArgumentsError(
          this.provider,
          "eth_call",
          [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_READ_CONTRACT.selectors.blockNumber}`,
            },
            "finalized",
          ],
          "The 'finalized' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );
      });

      it("should throw if the 'safe' or 'finalized' block tags are used in eth_getLogs", async function () {
        const fromBlock = await this.provider.send("eth_blockNumber");

        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        await assertInvalidArgumentsError(
          this.provider,
          "eth_getLogs",
          [
            {
              fromBlock,
              toBlock: "safe",
            },
          ],
          "The 'safe' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );

        await assertInvalidArgumentsError(
          this.provider,
          "eth_getLogs",
          [
            {
              fromBlock,
              toBlock: "finalized",
            },
          ],
          "The 'finalized' block tag is not allowed in pre-merge hardforks. You are using the 'london' hardfork."
        );
      });
    });

    describe("post-merge hardfork", function () {
      useProviderAndCommon("merge");

      it("difficulty and nonce should be zero values", async function () {
        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        const latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        const difficulty = BigInt(latestBlock.difficulty);
        const nonce = BigInt(latestBlock.nonce);

        assert.strictEqual(difficulty, 0n);
        assert.strictEqual(nonce, 0n);
      });

      it("mixHash value changes from block to block", async function () {
        let latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        // this value and the next one are hardcoded because the mixHash is
        // pseudo-randomly generated from a fixed seed
        assert.strictEqual(
          latestBlock.mixHash,
          // First value with seed "randomMixHashSeed"
          "0x53c5ae3ce8eefbfad3aca77e5f4e1b19a949b04e2e5ce7a24fbb64422f14f0bf"
        );

        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.strictEqual(
          latestBlock.mixHash,
          // Second value with seed "randomMixHashSeed"
          "0xf4fbfa6c8463f342eb58838d8c6b0661faf22e7076a518bf4deaddbf3fa8a112"
        );
      });

      it("the mixHash of a pending block is null", async function () {
        const pendingBlock = await this.provider.send("eth_getBlockByNumber", [
          "pending",
          false,
        ]);

        assert.isNull(pendingBlock.mixHash);
      });

      it("fetching the pending block shouldn't affect the mixHash", async function () {
        // fetch pending block before mining
        await this.provider.send("eth_getBlockByNumber", ["pending", false]);

        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        // fetch pending block after mining
        await this.provider.send("eth_getBlockByNumber", ["pending", false]);

        const latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.strictEqual(
          latestBlock.mixHash,
          "0xf4fbfa6c8463f342eb58838d8c6b0661faf22e7076a518bf4deaddbf3fa8a112"
        );
      });

      it("the DIFFICULTY opcode should match the value returned in the mixHash", async function () {
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

        const latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        const latestBlockMixHash = BigInt(latestBlock.mixHash);

        assert.strictEqual(difficulty, latestBlockMixHash);
      });

      it("should support the 'safe' and 'finalized' block tags in eth_getBlockByNumber", async function () {
        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        const latestBlock = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);
        const safeBlock = await this.provider.send("eth_getBlockByNumber", [
          "safe",
          false,
        ]);
        const finalizedBlock = await this.provider.send(
          "eth_getBlockByNumber",
          ["finalized", false]
        );

        assert.deepEqual(latestBlock, safeBlock);
        assert.deepEqual(latestBlock, finalizedBlock);
      });

      it("should support the 'safe' and 'finalized' block tags in eth_call", async function () {
        const contractAddress = await deployContract(
          this.provider,
          `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
        );

        await this.provider.send("eth_call", [
          {
            to: contractAddress,
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            data: `${EXAMPLE_READ_CONTRACT.selectors.blockNumber}`,
          },
          "safe",
        ]);

        await this.provider.send("eth_call", [
          {
            to: contractAddress,
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            data: `${EXAMPLE_READ_CONTRACT.selectors.blockNumber}`,
          },
          "finalized",
        ]);
      });

      it("should support the 'safe' and 'finalized' block tags in eth_getLogs", async function () {
        const fromBlock = await this.provider.send("eth_blockNumber");

        // send a transaction to generate a new block
        await sendTxToZeroAddress(this.provider);

        // we just check that it doesn't throw
        await this.provider.send("eth_getLogs", [
          {
            fromBlock,
            toBlock: "safe",
          },
        ]);

        await this.provider.send("eth_getLogs", [
          {
            fromBlock,
            toBlock: "finalized",
          },
        ]);
      });
    });
  });

  describe("shanghai hardfork", function () {
    const maxCodeSize = 24576;
    const maxInitcodeSize = 2 * maxCodeSize;

    describe("pre-shanghai hardfork", function () {
      useProviderAndCommon("merge");

      describe("warm COINBASE (EIP-3651)", function () {
        it("shouldn't be warm", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_TOUCH_ADDRESS_CONTRACT.bytecode.object}`
          );

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_TOUCH_ADDRESS_CONTRACT.selectors.touchAddress}000000000000000000000000c014ba5ec014ba5ec014ba5ec014ba5ec014ba5e`,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          const gasUsed = rpcQuantityToBigInt(receipt.gasUsed);

          assert.strictEqual(gasUsed, 24478n);
        });
      });

      describe("limit and meter initcode (EIP-3860)", function () {
        it("shouldn't apply initcode word cost", async function () {
          const bytecode = EXAMPLE_READ_CONTRACT.bytecode.object;

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: null,
              data: `0x${bytecode}`,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          const gasUsed = rpcQuantityToBigInt(receipt.gasUsed);

          assert.strictEqual(gasUsed, 166849n);
        });

        it("should allow initcodes larger than the EIP-3860 limit", async function () {
          const code = "ff".repeat(maxInitcodeSize + 100);

          const tx = getTxToDeployBytecode(code, maxCodeSize);

          await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);

          const contractAddress = await sendDeploymentTx(this.provider, tx);

          const deployedCode = await this.provider.send("eth_getCode", [
            contractAddress,
            "latest",
          ]);

          const deployedCodeBytes = (deployedCode.length - 2) / 2;
          assert.strictEqual(deployedCodeBytes, maxCodeSize);
        });
      });

      describe("withdrawal fields in returned blocks", function () {
        it("shouldn't include withdrawal fields", async function () {
          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.isUndefined(block.withdrawals);
          assert.isUndefined(block.withdrawalsRoot);
        });
      });
    });

    describe("post-shanghai hardfork", function () {
      useProviderAndCommon("shanghai");

      describe("warm COINBASE (EIP-3651)", function () {
        it("should be warm", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_TOUCH_ADDRESS_CONTRACT.bytecode.object}`
          );

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_TOUCH_ADDRESS_CONTRACT.selectors.touchAddress}000000000000000000000000c014ba5ec014ba5ec014ba5ec014ba5ec014ba5e`,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          const gasUsed = rpcQuantityToBigInt(receipt.gasUsed);

          // This is 2500 less than the equivalent test with a pre-shanghai
          // hardfork.
          // 2500 is COLD_ACCOUNT_ACCESS_COST - WARM_STORAGE_READ_COST,
          // see https://eips.ethereum.org/EIPS/eip-2929
          assert.strictEqual(gasUsed, 21978n);
        });

        it("other addresses should be cold", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_TOUCH_ADDRESS_CONTRACT.bytecode.object}`
          );

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              // we use an address with the same amount of zeros as the coinbase
              // address
              data: `${EXAMPLE_TOUCH_ADDRESS_CONTRACT.selectors.touchAddress}000000000000000000000000f0fffffff0fffffff0fffffff0fffffff0ffffff`,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          const gasUsed = rpcQuantityToBigInt(receipt.gasUsed);

          assert.strictEqual(gasUsed, 24478n);
        });
      });

      describe("limit and meter initcode (EIP-3860)", function () {
        describe("without allowUnlimitedContractSize", function () {
          it("shouldn't allow initcodes larger than the EIP-3860 limit", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const tx = getTxToDeployBytecode(code, maxCodeSize);

            await assert.isRejected(
              sendDeploymentTx(this.provider, tx),
              InvalidArgumentsError,
              "Trying to send a deployment transaction whose init code length is"
            );
          });

          it("shouldn't allow initcodes larger than the EIP-3860 limit from impersonated accounts", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const impersonatedAddress =
              "0x1234567890123456789012345678901234567890";

            await this.provider.send("hardhat_impersonateAccount", [
              impersonatedAddress,
            ]);
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: impersonatedAddress,
                value: numberToRpcQuantity(10n ** 18n),
              },
            ]);

            const tx = getTxToDeployBytecode(
              code,
              maxCodeSize,
              impersonatedAddress
            );

            await assert.isRejected(
              sendDeploymentTx(this.provider, tx),
              InvalidArgumentsError,
              "Trying to send a deployment transaction whose init code length is"
            );
          });

          it("shouldn't allow initcodes larger than the EIP-3860 limit in raw transactions", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const txData = getTxToDeployBytecode(code, maxCodeSize);

            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x0",
            ]);

            const tx = TransactionFactory.fromTxData(
              {
                gasLimit: txData.gas,
                gasPrice: txData.gasPrice,
                data: txData.data,
              },
              {
                common: this.common,
                allowUnlimitedInitCodeSize: true,
              }
            );

            const signedTx = tx.sign(privateKey);
            const serialized = bufferToRpcData(signedTx.serialize());

            await assertInvalidArgumentsError(
              this.provider,
              "eth_sendRawTransaction",
              [serialized],
              "Trying to send a deployment transaction whose init code length is"
            );
          });
        });

        describe("with allowUnlimitedContractSize", function () {
          useProviderAndCommon("shanghai", {
            allowUnlimitedContractSize: true,
          });

          it("should allow initcodes larger than the EIP-3860 limit", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const tx = getTxToDeployBytecode(code, maxCodeSize);

            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x0",
            ]);

            const contractAddress = await sendDeploymentTx(this.provider, tx);

            const deployedCode = await this.provider.send("eth_getCode", [
              contractAddress,
              "latest",
            ]);

            const deployedCodeBytes = (deployedCode.length - 2) / 2;
            assert.strictEqual(deployedCodeBytes, maxCodeSize);
          });

          it("should allow initcodes larger than the EIP-3860 limit from impersonated accounts", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const impersonatedAddress =
              "0x1234567890123456789012345678901234567890";

            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x0",
            ]);
            await this.provider.send("hardhat_impersonateAccount", [
              impersonatedAddress,
            ]);

            // send some eth to the impersonated account
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: impersonatedAddress,
                value: numberToRpcQuantity(10n ** 18n),
              },
            ]);

            const tx = getTxToDeployBytecode(
              code,
              maxCodeSize,
              impersonatedAddress
            );

            const contractAddress = await sendDeploymentTx(this.provider, tx);

            const deployedCode = await this.provider.send("eth_getCode", [
              contractAddress,
              "latest",
            ]);

            const deployedCodeBytes = (deployedCode.length - 2) / 2;
            assert.strictEqual(deployedCodeBytes, maxCodeSize);
          });

          it("should allow initcodes larger than the EIP-3860 limit in raw transactions", async function () {
            const code = "ff".repeat(maxInitcodeSize + 100);

            const txData = getTxToDeployBytecode(code, maxCodeSize);

            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x0",
            ]);

            const tx = TransactionFactory.fromTxData(
              {
                gasLimit: txData.gas,
                gasPrice: txData.gasPrice,
                data: txData.data,
              },
              {
                common: this.common,
                allowUnlimitedInitCodeSize: true,
              }
            );

            const signedTx = tx.sign(privateKey);
            const serialized = bufferToRpcData(signedTx.serialize());

            const txHash = await this.provider.send("eth_sendRawTransaction", [
              serialized,
            ]);

            const { contractAddress } = await this.provider.send(
              "eth_getTransactionReceipt",
              [txHash]
            );

            const deployedCode = await this.provider.send("eth_getCode", [
              contractAddress,
              "latest",
            ]);

            const deployedCodeBytes = (deployedCode.length - 2) / 2;
            assert.strictEqual(deployedCodeBytes, maxCodeSize);
          });
        });

        it("should apply initcode word cost", async function () {
          const bytecode = EXAMPLE_READ_CONTRACT.bytecode.object;

          const words = Math.ceil(bytecode.length / 2 / 32);
          const initcodeWordCost = BigInt(2 * words);

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: null,
              data: `0x${bytecode}`,
            },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          const gasUsed = rpcQuantityToBigInt(receipt.gasUsed);

          // This is the same value as the test with a pre-shanghai hardfork,
          // plus the initcode word cost.
          // See https://eips.ethereum.org/EIPS/eip-3860
          assert.strictEqual(gasUsed, 166849n + initcodeWordCost);
        });
      });

      describe("withdrawal fields in returned blocks", function () {
        it("should include withdrawal fields", async function () {
          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.isDefined(block.withdrawals);
          assert.isDefined(block.withdrawalsRoot);
        });
      });
    });
  });

  describe("cancun hardfork", function () {
    describe("pre-cancun hardfork", function () {
      useProviderAndCommon("shanghai");

      it("should not have the parentBeaconBlockRoot and the blob fields", async function () {
        const block = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.isUndefined(block.parentBeaconBlockRoot);
        assert.isUndefined(block.blobGasUsed);
        assert.isUndefined(block.excessBlobGas);
      });

      it("should not have a bytecode in the beacon root address", async function () {
        const BEACON_ROOT_ADDRESS =
          "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02";

        const code = await this.provider.send("eth_getCode", [
          BEACON_ROOT_ADDRESS,
        ]);

        assert.strictEqual(code, "0x");
      });
    });

    describe("post-cancun hardfork", function () {
      useProviderAndCommon("cancun");

      it("should have the parentBeaconBlockRoot and the blob fields", async function () {
        const block = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.isDefined(block.parentBeaconBlockRoot);
        assert.isDefined(block.blobGasUsed);
        assert.isDefined(block.excessBlobGas);
      });

      it("should have a non empty parentBeaconBlockRoot in the genesis block and the value should be an expected one", async function () {
        const block = await this.provider.send("eth_getBlockByNumber", [
          numberToRpcQuantity(0),
          false,
        ]);

        assert.strictEqual(
          block.parentBeaconBlockRoot,
          "0xdd8876ba5af271ae9d93ececb192d6a7b4e6094ca5999756336279fd796b8619"
        );
      });

      it("should have different parentBeaconBlockRoot values in different blocks", async function () {
        const block1 = await this.provider.send("eth_getBlockByNumber", [
          numberToRpcQuantity(0),
          false,
        ]);

        await this.provider.send("evm_mine", []);

        const block2 = await this.provider.send("eth_getBlockByNumber", [
          numberToRpcQuantity(1),
          false,
        ]);

        assert.notEqual(
          block1.parentBeaconBlockRoot,
          block2.parentBeaconBlockRoot
        );
      });

      it("should have the parentBeaconBlockRoot value different from the mixhash value", async function () {
        const block = await this.provider.send("eth_getBlockByNumber", [
          "latest",
          false,
        ]);

        assert.notEqual(block.mixHash, block.parentBeaconBlockRoot);
      });

      it("should have a specific bytecode in the beacon root address (starting from genesis block)", async function () {
        const BEACON_ROOT_ADDRESS =
          "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02";
        const BEACON_ROOT_BYTECODE =
          "0x3373fffffffffffffffffffffffffffffffffffffffe14604d57602036146024575f5ffd5b5f35801560495762001fff810690815414603c575f5ffd5b62001fff01545f5260205ff35b5f5ffd5b62001fff42064281555f359062001fff015500";

        const code = await this.provider.send("eth_getCode", [
          BEACON_ROOT_ADDRESS,
          numberToRpcQuantity(0),
        ]);

        assert.strictEqual(code, BEACON_ROOT_BYTECODE);
      });
    });
  });
});
