import { RunBlockResult } from "@nomiclabs/ethereumjs-vm/dist/runBlock";
import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";

import { RpcLog, RpcTransactionReceipt } from "../jsonrpc/types";

import { Block } from "./types/Block";

export interface RpcBlockOutput {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string | null;
  logsBloom: string | null;
  miner: string;
  mixHash: string | null;
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

export interface RpcReceiptOutput {
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

// tslint:disable only-hardhat-error

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
    // See: https://github.com/nomiclabs/hardhat/issues/491
    nonce: bufferToRpcData(block.header.nonce, 16), // TODO: null when it's a pending block,
    mixHash: bufferToRpcData(block.header.mixHash, 32), // TODO: null when it's a pending block,
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
    ) as string[] | RpcTransactionOutput[],
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

export function getRpcReceipts(
  block: Block,
  runBlockResult: RunBlockResult
): RpcReceiptOutput[] {
  const receipts: RpcReceiptOutput[] = [];

  let cumulativeGasUsed = new BN(0);

  for (let i = 0; i < runBlockResult.results.length; i += 1) {
    const tx = block.transactions[i];
    const { createdAddress } = runBlockResult.results[i];
    const receipt = runBlockResult.receipts[i];

    cumulativeGasUsed = cumulativeGasUsed.add(new BN(receipt.gasUsed));

    const logs = receipt.logs.map((log, logIndex) =>
      getRpcLogOutput(log, tx, block, i, logIndex)
    );

    receipts.push({
      transactionHash: bufferToRpcData(tx.hash()),
      transactionIndex: numberToRpcQuantity(i),
      blockHash: bufferToRpcData(block.hash()),
      blockNumber: numberToRpcQuantity(new BN(block.header.number)),
      from: bufferToRpcData(tx.getSenderAddress()),
      to: tx.to.length === 0 ? null : bufferToRpcData(tx.to),
      cumulativeGasUsed: numberToRpcQuantity(cumulativeGasUsed),
      gasUsed: numberToRpcQuantity(new BN(receipt.gasUsed)),
      contractAddress:
        createdAddress !== undefined ? bufferToRpcData(createdAddress) : null,
      logs,
      logsBloom: bufferToRpcData(receipt.bitvector),
      status: numberToRpcQuantity(receipt.status),
    });
  }

  return receipts;
}

export function toRpcReceiptOutput(
  receipt: RpcTransactionReceipt
): RpcReceiptOutput {
  return {
    blockHash: bufferToRpcData(receipt.blockHash),
    blockNumber: numberToRpcQuantity(receipt.blockNumber),
    contractAddress:
      receipt.contractAddress !== null
        ? bufferToRpcData(receipt.contractAddress)
        : null,
    cumulativeGasUsed: numberToRpcQuantity(receipt.cumulativeGasUsed),
    from: bufferToRpcData(receipt.from),
    gasUsed: numberToRpcQuantity(receipt.gasUsed),
    logs: receipt.logs.map(toRpcLogOutput),
    logsBloom: bufferToRpcData(receipt.logsBloom),
    status: numberToRpcQuantity(receipt.status),
    to: receipt.to !== null ? bufferToRpcData(receipt.to) : null,
    transactionHash: bufferToRpcData(receipt.transactionHash),
    transactionIndex: numberToRpcQuantity(receipt.transactionIndex),
  };
}

export function toRpcLogOutput(log: RpcLog, index?: number): RpcLogOutput {
  return {
    removed: false,
    address: bufferToRpcData(log.address),
    blockHash: log.blockHash !== null ? bufferToRpcData(log.blockHash) : null,
    blockNumber:
      log.blockNumber !== null ? numberToRpcQuantity(log.blockNumber) : null,
    data: bufferToRpcData(log.data),
    logIndex: index !== undefined ? numberToRpcQuantity(index) : null,
    transactionIndex:
      log.transactionIndex !== null
        ? numberToRpcQuantity(log.transactionIndex)
        : null,
    transactionHash:
      log.transactionHash !== null
        ? bufferToRpcData(log.transactionHash)
        : null,
    topics: log.topics.map((topic) => bufferToRpcData(topic)),
  };
}

function getRpcLogOutput(
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
