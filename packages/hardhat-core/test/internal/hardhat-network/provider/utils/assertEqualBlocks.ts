import { Block } from "@nomicfoundation/ethereumjs-block";
import {
  AfterBlockEvent,
  PostByzantiumTxReceipt,
} from "@nomicfoundation/ethereumjs-vm";
import { assert } from "chai";
import { bytesToHex as bufferToHex } from "@nomicfoundation/ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcBlockWithTransactions } from "../../../../../src/internal/core/jsonrpc/types/output/block";
import { JsonRpcClient } from "../../../../../src/internal/hardhat-network/jsonrpc/client";

/* eslint-disable @typescript-eslint/dot-notation */

export async function assertEqualBlocks(
  block: Block,
  afterBlockEvent: AfterBlockEvent,
  expectedBlock: RpcBlockWithTransactions,
  forkClient: JsonRpcClient
) {
  const localReceiptRoot = Buffer.from(block.header.receiptTrie).toString(
    "hex"
  );
  const remoteReceiptRoot = expectedBlock.receiptsRoot.toString("hex");

  // We do some manual comparisons here to understand why the root of the receipt tries differ.
  if (localReceiptRoot !== remoteReceiptRoot) {
    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const txHash = bufferToHex(tx.hash());

      const remoteReceipt = (await forkClient["_httpProvider"].request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      })) as any;

      const localReceipt = afterBlockEvent.receipts[i];
      const evmResult = afterBlockEvent.results[i];

      assert.equal(
        bufferToHex(localReceipt.bitvector),
        remoteReceipt.logsBloom,
        `Logs bloom of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        numberToRpcQuantity(evmResult.totalGasSpent),
        remoteReceipt.gasUsed,
        `Gas used of tx index ${i} (${txHash}) should match`
      );

      assert.equal(
        (localReceipt as PostByzantiumTxReceipt).status,
        remoteReceipt.status,
        `Status of tx index ${i} (${txHash}) should be the same`
      );

      assert.equal(
        evmResult.createdAddress === undefined
          ? undefined
          : evmResult.createdAddress.toString(),
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
