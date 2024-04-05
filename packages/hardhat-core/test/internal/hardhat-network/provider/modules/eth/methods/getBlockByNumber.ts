import { assert } from "chai";
import { Context } from "mocha";

import {
  numberToRpcQuantity,
  rpcQuantityToBigInt,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
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

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider({ hardfork: "london" });

      describe("eth_getBlockByNumber", function () {
        it("Should return the genesis block for number 0", async function () {
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(0),
            false,
          ]);

          assert.equal(
            block.parentHash,
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          assertQuantity(block.number, 0);
          assert.isEmpty(block.transactions);
        });

        it("Should return null for unknown blocks", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 2),
            false,
          ]);

          assert.isNull(block);

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            true,
          ]);

          assert.isNull(block2);
        });

        it("Should return the new blocks", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber + 1), false]
          );

          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, DEFAULT_COINBASE.toString());
          assert.isEmpty(block.uncles);
        });

        it("Should return the new pending block", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["pending", false]
          );

          assert.isNotEmpty(block.logsBloom);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, DEFAULT_COINBASE.toString());
          assert.isEmpty(block.uncles);
        });

        it("should return the complete transactions if the second argument is true", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber + 1), true]
          );

          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.equal(block.miner, DEFAULT_COINBASE.toString());
          assert.isEmpty(block.uncles);

          const txOutput = block.transactions[0] as RpcTransactionOutput;
          assert.equal(txOutput.hash, txHash);
          assert.equal(block.hash, txOutput.blockHash);
          assert.equal(block.number, txOutput.blockNumber);
          assert.equal(txOutput.transactionIndex, numberToRpcQuantity(0));

          assert.deepEqual(
            txOutput,
            await this.provider.send("eth_getTransactionByHash", [txHash])
          );
        });

        it(
          "should return the right block total difficulty",
          isFork ? testTotalDifficultyFork : testTotalDifficulty
        );

        async function testTotalDifficultyFork(this: Context) {
          const forkBlockNumber: number = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const forkBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(forkBlockNumber), false]
          );

          await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(forkBlockNumber + 1), false]
          );

          assertQuantity(
            block.totalDifficulty,
            rpcQuantityToBigInt(forkBlock.totalDifficulty) +
              rpcQuantityToBigInt(block.difficulty)
          );
        }

        async function testTotalDifficulty(this: Context) {
          const genesisBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(0), false]
          );

          assertQuantity(genesisBlock.totalDifficulty, 1);
          assertQuantity(genesisBlock.difficulty, 1);

          await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(1), false]
          );

          assertQuantity(
            block.totalDifficulty,
            rpcQuantityToNumber(block.difficulty) + 1
          );
        }
      });
    });
  });
});
