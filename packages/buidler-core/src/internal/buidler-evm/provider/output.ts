import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";

import { Block, TxBlockResult } from "./node";

export interface RpcBlockOutput {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string | null;
  logsBloom: string | null;
  miner: string;
  nonce: string | null;
  number: string | null;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: string[] | RpcTransactionOutput[];
  transactionsRoot: string;
  uncles: string[];
}

export interface RpcTransactionOutput {
  blockHash: string | null;
  blockNumber: string | null;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  r: string; // This is documented as DATA, but implementations use QUANTITY
  s: string; // This is documented as DATA, but implementations use QUANTITY
  to: string | null;
  transactionIndex: string | null;
  v: string;
  value: string;
}

export interface RpcTransactionReceiptOutput {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  from: string;
  gasUsed: string;
  logs: RpcLogOutput[];
  logsBloom: string;
  status: string;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
}

export interface RpcLogOutput {
  address: string;
  blockHash: string | null;
  blockNumber: string | null;
  data: string;
  logIndex: string | null;
  removed: boolean;
  topics: string[];
  transactionHash: string | null;
  transactionIndex: string | null;
}

// tslint:disable only-buidler-error

export function numberToRpcQuantity(n: number | BN): string {
  // This is here because we have some any's from dependencies
  if (typeof n !== "number" && Buffer.isBuffer(n)) {
    throw new Error(`Expected a number and got ${n}`);
  }

  if (Buffer.isBuffer(n)) {
    n = new BN(n);
  }

  return `0x${n.toString(16)}`;
}

export function bufferToRpcData(buffer: Buffer, pad: number = 0): string {
  let s = bufferToHex(buffer);
  if (pad > 0 && s.length < pad + 2) {
    s = `0x${"0".repeat(pad + 2 - s.length)}${s.slice(2)}`;
  }
  return s;
}

export function getRpcBlock(
  block: Block,
  totalDifficulty: BN,
  includeTransactions = true
): RpcBlockOutput {
  return {
    number: numberToRpcQuantity(new BN(block.header.number)), // TODO: null when it's a pending block,
    hash: bufferToRpcData(block.hash()), // TODO: null when it's a pending block,
    parentHash: bufferToRpcData(block.header.parentHash),
    // We pad this to 8 bytes because of a limitation in The Graph
    // See: https://github.com/nomiclabs/buidler/issues/491
    nonce: bufferToRpcData(block.header.nonce, 16), // TODO: null when it's a pending block,
    sha3Uncles: bufferToRpcData(block.header.uncleHash),
    logsBloom: bufferToRpcData(block.header.bloom), // TODO: null when it's a pending block,
    transactionsRoot: bufferToRpcData(block.header.transactionsTrie),
    stateRoot: bufferToRpcData(block.header.stateRoot),
    receiptsRoot: bufferToRpcData(block.header.receiptTrie),
    miner: bufferToRpcData(block.header.coinbase),
    difficulty: numberToRpcQuantity(new BN(block.header.difficulty)),
    totalDifficulty: numberToRpcQuantity(totalDifficulty),
    extraData: bufferToRpcData(block.header.extraData),
    size: numberToRpcQuantity(block.serialize().length),
    gasLimit: numberToRpcQuantity(new BN(block.header.gasLimit)),
    gasUsed: numberToRpcQuantity(new BN(block.header.gasUsed)),
    timestamp: numberToRpcQuantity(new BN(block.header.timestamp)),
    transactions: block.transactions.map((tx: any, index: number) =>
      getRpcTransaction(tx, block, index, !includeTransactions)
    ),
    uncles: block.uncleHeaders.map((uh: any) => bufferToRpcData(uh.hash())),
  };
}

export function getRpcTransaction(
  tx: Transaction,
  block?: Block,
  index?: number
): RpcTransactionOutput;

export function getRpcTransaction(
  tx: Transaction,
  block?: Block,
  index?: number,
  txHashOnly?: boolean
): string | RpcTransactionOutput;

export function getRpcTransaction(
  tx: Transaction,
  block?: Block,
  index?: number,
  txHashOnly = false
): string | RpcTransactionOutput {
  if (txHashOnly) {
    return bufferToRpcData(tx.hash(true));
  }

  return {
    blockHash: block !== undefined ? bufferToRpcData(block.hash()) : null,
    blockNumber:
      block !== undefined
        ? numberToRpcQuantity(new BN(block.header.number))
        : null,
    from: bufferToRpcData(tx.getSenderAddress()),
    gas: numberToRpcQuantity(new BN(tx.gasLimit)),
    gasPrice: numberToRpcQuantity(new BN(tx.gasPrice)),
    hash: bufferToRpcData(tx.hash(true)),
    input: bufferToRpcData(tx.data),
    nonce: numberToRpcQuantity(new BN(tx.nonce)),
    to: tx.to.length === 0 ? null : bufferToRpcData(tx.to),
    transactionIndex: index !== undefined ? numberToRpcQuantity(index) : null,
    value: numberToRpcQuantity(new BN(tx.value)),
    v: numberToRpcQuantity(new BN(tx.v)),
    r: numberToRpcQuantity(new BN(tx.s)),
    s: numberToRpcQuantity(new BN(tx.r)),
  };
}

export function getRpcTransactionReceipt(
  tx: Transaction,
  block: Block,
  index: number,
  txBlockResults: TxBlockResult[]
): RpcTransactionReceiptOutput {
  const cumulativeGasUsed: BN = txBlockResults
    .map((txbr) => txbr.receipt)
    .filter((r, i) => i <= index)
    .reduce((gas, r) => gas.add(new BN(r.gasUsed)), new BN(0));

  const receipt = txBlockResults[index].receipt;
  const createdAddress = txBlockResults[index].createAddresses;

  return {
    transactionHash: bufferToRpcData(tx.hash()),
    transactionIndex: numberToRpcQuantity(index),
    blockHash: bufferToRpcData(block.hash()),
    blockNumber: numberToRpcQuantity(new BN(block.header.number)),
    from: bufferToRpcData(tx.getSenderAddress()),
    to: tx.to.length === 0 ? null : bufferToRpcData(tx.to),
    cumulativeGasUsed: numberToRpcQuantity(cumulativeGasUsed),
    gasUsed: numberToRpcQuantity(new BN(receipt.gasUsed)),
    contractAddress:
      createdAddress !== undefined ? bufferToRpcData(createdAddress) : null,
    logs: receipt.logs,
    logsBloom: bufferToRpcData(txBlockResults[index].bloomBitvector),
    status: numberToRpcQuantity(receipt.status),
  };
}

export function getRpcLog(
  log: any[],
  tx: Transaction,
  block?: Block,
  transactionIndex?: number,
  logIndex?: number
): RpcLogOutput {
  return {
    removed: false,
    logIndex: logIndex !== undefined ? numberToRpcQuantity(logIndex) : null,
    transactionIndex:
      transactionIndex !== undefined
        ? numberToRpcQuantity(transactionIndex)
        : null,
    transactionHash: block !== undefined ? bufferToRpcData(tx.hash()) : null,
    blockHash: block !== undefined ? bufferToRpcData(block.hash()) : null,
    blockNumber:
      block !== undefined
        ? numberToRpcQuantity(new BN(block.header.number))
        : null,
    address: bufferToRpcData(log[0]),
    data: bufferToRpcData(log[2]),
    topics: log[1].map((topic: Buffer) => bufferToRpcData(topic)),
  };
}
