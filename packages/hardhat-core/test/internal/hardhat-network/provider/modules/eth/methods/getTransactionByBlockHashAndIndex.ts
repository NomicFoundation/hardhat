import {
  setLengthLeft,
  toBytes,
  zeroAddress,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../src/internal/hardhat-network/provider/node-types";
import {
  AccessListEIP2930RpcTransactionOutput,
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
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
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
import { sendTransactionFromTxParams } from "../../../../helpers/transactions";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

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

      describe("eth_getTransactionByBlockHashAndIndex", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              "0x1231231231231231231231231231231231231231231231231231231231231231",
              numberToRpcQuantity(0),
            ])
          );
        });

        it("should return null for existing blocks but non-existing indexes", async function () {
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(0),
            false,
          ]);

          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              block.hash,
              numberToRpcQuantity(0),
            ])
          );

          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              block.hash,
              numberToRpcQuantity(0),
            ])
          );
        });

        it("should return the right info for the existing ones", async function () {
          const firstBlock = await getFirstBlock();
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
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block.hash, numberToRpcQuantity(0)]
          );

          assertLegacyTransaction(
            tx,
            txHash,
            txParams1,
            firstBlock + 1,
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
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          const tx2: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block2.hash, numberToRpcQuantity(0)]
          );

          assertLegacyTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlock + 2,
            block2.hash,
            0
          );
        });

        it("should return access list transactions", async function () {
          const firstBlock = await getFirstBlock();
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
                  setLengthLeft(Buffer.from([0]), 32),
                  setLengthLeft(Buffer.from([1]), 32),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: AccessListEIP2930RpcTransactionOutput =
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              block.hash,
              numberToRpcQuantity(0),
            ]);

          assertAccessListTransaction(
            tx,
            txHash,
            txParams,
            firstBlock + 1,
            block.hash,
            0
          );
        });

        it("should return EIP-1559 transactions", async function () {
          const firstBlock = await getFirstBlock();
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
                  setLengthLeft(Buffer.from([0]), 32),
                  setLengthLeft(Buffer.from([1]), 32),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: EIP1559RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block.hash, numberToRpcQuantity(0)]
          );

          assertEIP1559Transaction(
            tx,
            txHash,
            txParams,
            firstBlock + 1,
            block.hash,
            0
          );
        });
      });
    });
  });
});
