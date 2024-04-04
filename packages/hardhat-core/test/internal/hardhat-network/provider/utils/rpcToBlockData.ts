import { BlockData } from "@nomicfoundation/ethereumjs-block";

import { RpcBlockWithTransactions } from "../../../../../src/internal/core/jsonrpc/types/output/block";
import { rpcToTxData } from "./rpcToTxData";

export function rpcToBlockData(rpcBlock: RpcBlockWithTransactions): BlockData {
  return {
    header: {
      parentHash: rpcBlock.parentHash,
      uncleHash: rpcBlock.sha3Uncles,
      coinbase: rpcBlock.miner,
      stateRoot: rpcBlock.stateRoot,
      transactionsTrie: rpcBlock.transactionsRoot,
      receiptTrie: rpcBlock.receiptsRoot,
      logsBloom: rpcBlock.logsBloom,
      difficulty: rpcBlock.difficulty,
      number: rpcBlock.number ?? undefined,
      gasLimit: rpcBlock.gasLimit,
      gasUsed: rpcBlock.gasUsed,
      timestamp: rpcBlock.timestamp,
      extraData: rpcBlock.extraData,
      mixHash: rpcBlock.mixHash,
      nonce: rpcBlock.nonce,
      baseFeePerGas: rpcBlock.baseFeePerGas,
      withdrawalsRoot: rpcBlock.withdrawalsRoot,
      parentBeaconBlockRoot: rpcBlock.parentBeaconBlockRoot,
      blobGasUsed: rpcBlock.blobGasUsed,
      excessBlobGas: rpcBlock.excessBlobGas,
    },
    transactions: rpcBlock.transactions.map(rpcToTxData),
    withdrawals: rpcBlock.withdrawals,
    // uncleHeaders are not fetched and set here as provider methods for getting them are not supported
  };
}
