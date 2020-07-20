import * as t from "io-ts";

import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../provider/input";

export function decode<T>(value: unknown, codec: t.Type<T>) {
  return codec.decode(value).fold(() => {
    // TODO: What error to throw?
    // tslint:disable-next-line
    throw new Error(`Invalid ${codec.name}`);
  }, t.identity);
}

const nullable = <T extends t.Type<any>>(codec: T) =>
  t.union([codec, t.null], `${codec.name} or null`);

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
