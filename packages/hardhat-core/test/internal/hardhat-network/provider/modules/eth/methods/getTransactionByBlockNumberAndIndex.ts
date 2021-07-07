import { assert } from "chai";
import { BN, toBuffer, zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../internal/hardhat-network/provider/node-types";
import { RpcTransactionOutput } from "../../../../../../../internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertTransaction } from "../../../../helpers/assertions";
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
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 1), numberToRpcQuantity(0)]
          );

          assertTransaction(
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
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 2), numberToRpcQuantity(0)]
          );

          assertTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlock + 2,
            block2.hash,
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
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const tx: RpcTransactionOutput = await this.provider.send(
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
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            ["pending", numberToRpcQuantity(1)]
          );

          assertTransaction(tx, txHash, txParams1);
          assertTransaction(tx2, txHash2, txParams2);
        });
      });
    });
  });
});
