import { assert } from "chai";

import {
  RpcBlockOutput,
  RpcTransactionOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertQuantity } from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import { PROVIDERS } from "../../../../helpers/providers";
import { sendTxToZeroAddress } from "../../../../helpers/transactions";
import { DEFAULT_COINBASE } from "../../../../../../../src/internal/hardhat-network/provider/provider";
import { rpcQuantityToNumber } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_getBlockByHash", function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getBlockByHash", [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
              false,
            ])
          );

          assert.isNull(
            await this.provider.send("eth_getBlockByHash", [
              "0x0000000000000000000000000000000000000000000000000000000000000123",
              true,
            ])
          );
        });

        it("Should return the block with transaction hashes if the second argument is false", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const txHash = await sendTxToZeroAddress(this.provider);
          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByHash",
            [txOutput.blockHash, false]
          );

          assert.equal(block.hash, txOutput.blockHash);
          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, DEFAULT_COINBASE.toString());
          assert.isEmpty(block.uncles);
        });

        it("Should return the block with the complete transactions if the second argument is true", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const txHash = await sendTxToZeroAddress(this.provider);
          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByHash",
            [txOutput.blockHash, true]
          );

          assert.equal(block.hash, txOutput.blockHash);
          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.miner, DEFAULT_COINBASE.toString());
          assert.deepEqual(
            block.transactions[0] as RpcTransactionOutput,
            txOutput
          );
          assert.isEmpty(block.uncles);
        });
      });
    });
  });
});
