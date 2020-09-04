import * as t from "io-ts";

import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../provider/input";

export function decode<T>(value: unknown, codec: t.Type<T>) {
  return codec.decode(value).fold(() => {
    // tslint:disable-next-line
    throw new Error(`Invalid ${codec.name}`);
  }, t.identity);
}

export const nullable = <T>(codec: t.Type<T>) =>
  new t.Type<T | null>(
    `${codec.name} or null`,
    (input): input is T | null =>
      input === null || input === undefined || codec.is(input),
    (input, context) => {
      if (input === null || input === undefined) {
        return t.success(null);
      }
      return codec.validate(input, context);
    },
    t.identity
  );

export type RpcTransaction = t.TypeOf<typeof rpcTransaction>;
export const rpcTransaction = t.type(
  {
    blockHash: nullable(rpcHash),
    blockNumber: nullable(rpcQuantity),
    from: rpcAddress,
    gas: rpcQuantity,
    gasPrice: rpcQuantity,
    hash: rpcHash,
    input: rpcData,
    nonce: rpcQuantity,
    to: nullable(rpcAddress),
    transactionIndex: nullable(rpcQuantity),
    value: rpcQuantity,
    v: rpcQuantity,
    r: rpcQuantity,
    s: rpcQuantity,
  },
  "RpcTransaction"
);

const baseBlockResponse = {
  number: nullable(rpcQuantity),
  hash: nullable(rpcHash),
  parentHash: rpcHash,
  nonce: rpcData,
  sha3Uncles: rpcHash,
  logsBloom: rpcData,
  transactionsRoot: rpcHash,
  stateRoot: rpcHash,
  receiptsRoot: rpcHash,
  miner: rpcAddress,
  difficulty: rpcQuantity,
  totalDifficulty: rpcQuantity,
  extraData: rpcData,
  size: rpcQuantity,
  gasLimit: rpcQuantity,
  gasUsed: rpcQuantity,
  timestamp: rpcQuantity,
  uncles: t.array(rpcHash, "HASH Array"),
  mixHash: rpcHash,
};

export type RpcBlock = t.TypeOf<typeof rpcBlock>;
export const rpcBlock = t.type(
  {
    ...baseBlockResponse,
    transactions: t.array(rpcHash, "HASH Array"),
  },
  "RpcBlock"
);

export type RpcBlockWithTransactions = t.TypeOf<
  typeof rpcBlockWithTransactions
>;
export const rpcBlockWithTransactions = t.type(
  {
    ...baseBlockResponse,
    transactions: t.array(rpcTransaction, "RpcTransaction Array"),
  },
  "RpcBlockWithTransactions"
);

export type RpcLog = t.TypeOf<typeof rpcLog>;
export const rpcLog = t.type(
  {
    transactionIndex: nullable(rpcQuantity),
    transactionHash: nullable(rpcHash),
    blockHash: nullable(rpcHash),
    blockNumber: nullable(rpcQuantity),
    address: rpcAddress,
    data: rpcData,
    topics: t.array(rpcData, "RpcData Array"),
  },
  "RpcLog"
);

export type RpcTransactionReceipt = t.TypeOf<typeof rpcTransactionReceipt>;
export const rpcTransactionReceipt = t.type(
  {
    transactionHash: rpcHash,
    transactionIndex: rpcQuantity,
    blockHash: rpcHash,
    blockNumber: rpcQuantity,
    from: rpcAddress,
    to: nullable(rpcAddress),
    cumulativeGasUsed: rpcQuantity,
    gasUsed: rpcQuantity,
    contractAddress: nullable(rpcAddress),
    logs: t.array(rpcLog, "RpcLog Array"),
    logsBloom: rpcData,
    status: rpcQuantity,
  },
  "RpcTransactionReceipt"
);
