import { RunBlockResult } from "@nomiclabs/ethereumjs-vm/dist/runBlock";
import { assert } from "chai";
import { bufferToHex } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../src/internal/core/providers/provider-utils";
import { JsonRpcClient } from "../../../../../src/internal/hardhat-network/jsonrpc/client";
import { RpcBlockWithTransactions } from "../../../../../src/internal/hardhat-network/jsonrpc/types";
import { Block } from "../../../../../src/internal/hardhat-network/provider/types/Block";

// tslint:disable no-string-literal

export async function assertEqualBlocks(
  block: Block,
  result: RunBlockResult,
  expectedBlock: RpcBlockWithTransactions,
  forkClient: JsonRpcClient
) {
  const localReceiptRoot = block.header.receiptTrie.toString("hex");
  const remoteReceiptRoot = expectedBlock.receiptsRoot.toString("hex");

  // We do some manual comparisons here to understand why the root of the receipt tries differ.
  if (localReceiptRoot !== remoteReceiptRoot) {
    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const txHash = bufferToHex(tx.hash(true));

      const remoteReceipt = (await forkClient["_httpProvider"].request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      })) as any;

      const localReceipt = result.receipts[i];
      const evmResult = result.results[i];

      assert.equal(
        bufferToHex(localReceipt.bitvector),
        remoteReceipt.logsBloom,
        `Logs bloom of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        numberToRpcQuantity(evmResult.gasUsed.toNumber()),
        remoteReceipt.gasUsed,
        `Gas used of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        localReceipt.status,
        remoteReceipt.status,
        `Status of tx index ${i} (${txHash}) should be the same`
      );

      assert.equal(
        evmResult.createdAddress === undefined
          ? undefined
          : `0x${evmResult.createdAddress.toString("hex")}`,
        remoteReceipt.contractAddress,
        `Contract address created by tx index ${i} (${txHash}) should be the same`
      );
    }
  }

  assert.equal(
    localReceiptRoot,
    remoteReceiptRoot,
    "The root of the receipts trie is different than expected"
  );
}
