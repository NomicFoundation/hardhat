import { toBuffer, zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../src/internal/hardhat-network/provider/node-types";
import {
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
  AccessListEIP2930RpcTransactionOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertAccessListTransaction,
  assertEIP1559Transaction,
  assertLegacyTransaction,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import { getPendingBaseFeePerGas } from "../../../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import {
  sendTransactionFromTxParams,
  sendTxToZeroAddress,
} from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_getTransactionByBlockNumberAndIndex", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(1), numberToRpcQuantity(0)]
            )
          );
        });

        it("should return null for existing blocks but non-existing indexes", async function () {
          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(0), numberToRpcQuantity(0)]
            )
          );

          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(1), numberToRpcQuantity(0)]
            )
          );
        });

        it("should return the right info for the existing ones", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: 0n,
            value: 123n,
            gasLimit: 25_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          const tx: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlockNumber + 1), numberToRpcQuantity(0)]
          );

          assertLegacyTransaction(
            tx,
            txHash,
            txParams1,
            firstBlockNumber + 1,
            block.hash,
            0
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: 1n,
            value: 123n,
            gasLimit: 80_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 2),
            false,
          ]);

          const tx2: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlockNumber + 2), numberToRpcQuantity(0)]
          );

          assertLegacyTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlockNumber + 2,
            block2.hash,
            0
          );
        });

        it("should return access list transactions", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const txParams: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: 0n,
            value: 123n,
            gasLimit: 30_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
            accessList: [
              [
                toBuffer(zeroAddress()),
                [
                  toBuffer(
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                  ),
                  toBuffer(
                    "0x0000000000000000000000000000000000000000000000000000000000000001"
                  ),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          const tx: AccessListEIP2930RpcTransactionOutput =
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [
                numberToRpcQuantity(firstBlockNumber + 1),
                numberToRpcQuantity(0),
              ]
            );

          assertAccessListTransaction(
            tx,
            txHash,
            txParams,
            firstBlockNumber + 1,
            block.hash,
            0
          );
        });

        it("should return EIP-1559 transactions", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const maxFeePerGas = await getPendingBaseFeePerGas(this.provider);
          const txParams: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: 0n,
            value: 123n,
            gasLimit: 30_000n,
            maxFeePerGas,
            maxPriorityFeePerGas: maxFeePerGas / 2n,
            accessList: [
              [
                toBuffer(zeroAddress()),
                [
                  toBuffer(
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                  ),
                  toBuffer(
                    "0x0000000000000000000000000000000000000000000000000000000000000001"
                  ),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          const tx: EIP1559RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlockNumber + 1), numberToRpcQuantity(0)]
          );

          assertEIP1559Transaction(
            tx,
            txHash,
            txParams,
            firstBlockNumber + 1,
            block.hash,
            0
          );
        });

        it("should return the right transaction info when called with 'pending' block tag param", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: 0n,
            value: 123n,
            gasLimit: 25_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const tx: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            ["pending", numberToRpcQuantity(0)]
          );

          await this.provider.send("evm_mine");

          await sendTxToZeroAddress(
            this.provider,
            DEFAULT_ACCOUNTS_ADDRESSES[1]
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: 2n,
            value: 123n,
            gasLimit: 80_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const tx2: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            ["pending", numberToRpcQuantity(1)]
          );

          assertLegacyTransaction(tx, txHash, txParams1);
          assertLegacyTransaction(tx2, txHash2, txParams2);
        });
      });
    });
  });
});
