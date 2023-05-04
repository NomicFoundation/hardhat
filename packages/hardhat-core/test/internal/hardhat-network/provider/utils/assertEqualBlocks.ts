import type { PostByzantiumTxReceipt } from "@nomicfoundation/ethereumjs-vm";
import { Block } from "@nomicfoundation/ethereumjs-block";
import { assert, config as chaiConfig } from "chai";
import { bufferToHex } from "@nomicfoundation/ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcBlockWithTransactions } from "../../../../../src/internal/core/jsonrpc/types/output/block";
import { JsonRpcClient } from "../../../../../src/internal/hardhat-network/jsonrpc/client";
import { RunTxResult } from "../../../../../src/internal/hardhat-network/provider/vm/vm-adapter";

/* eslint-disable @typescript-eslint/dot-notation */

// don't turncate actual/expected values in assertion messages
chaiConfig.truncateThreshold = 0;

export async function assertEqualBlocks(
  block: Block,
  transactionResults: RunTxResult[],
  expectedBlock: RpcBlockWithTransactions,
  forkClient: JsonRpcClient
) {
  const localReceiptRoot = block.header.receiptTrie.toString("hex");
  const remoteReceiptRoot = expectedBlock.receiptsRoot.toString("hex");

  // We do some manual comparisons here to understand why the root of the receipt tries differ.
  if (localReceiptRoot !== remoteReceiptRoot) {
    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const txHash = bufferToHex(tx.hash());
      const txResult = transactionResults[i];

      const remoteReceipt = (await forkClient["_httpProvider"].request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      })) as any;

      assert.equal(
        bufferToHex(txResult.receipt.bitvector),
        remoteReceipt.logsBloom,
        `Logs bloom of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        numberToRpcQuantity(txResult.gasUsed),
        remoteReceipt.gasUsed,
        `Gas used of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        (txResult.receipt as PostByzantiumTxReceipt).status,
        remoteReceipt.status,
        `Status of tx index ${i} (${txHash}) should be the same`
      );

      assert.equal(
        txResult.createdAddress === undefined
          ? undefined
          : txResult.createdAddress.toString(),
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
