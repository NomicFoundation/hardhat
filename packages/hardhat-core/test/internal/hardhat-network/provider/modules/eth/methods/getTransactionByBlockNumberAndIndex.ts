import { assert } from "chai";
import { BN, toBuffer, zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../internal/hardhat-network/provider/node-types";
import {
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
  AccessListEIP2930RpcTransactionOutput,
} from "../../../../../../../internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertAccessListTransaction,
  assertEIP1559Transaction,
  assertLegacyTransaction,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
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

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

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
          const firstBlock = await getFirstBlock();
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(10e9),
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
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 1), numberToRpcQuantity(0)]
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
            nonce: new BN(1),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(10e9),
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
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 2), numberToRpcQuantity(0)]
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
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(30000),
            gasPrice: new BN(10e9),
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
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: AccessListEIP2930RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 1), numberToRpcQuantity(0)]
          );

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
          const txParams: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(30000),
            maxFeePerGas: new BN(10e9),
            maxPriorityFeePerGas: new BN(1e9),
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
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: EIP1559RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 1), numberToRpcQuantity(0)]
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

        it("should return the right transaction info when called with 'pending' block tag param", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(10e9),
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
            nonce: new BN(2),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(10e9),
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
