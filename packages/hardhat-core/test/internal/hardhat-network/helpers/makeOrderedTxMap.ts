import { bufferToHex } from "ethereumjs-util";

import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/PoolState";

export function makeOrderedTxMap(
  txs: OrderedTransaction[]
): Map<string, OrderedTransaction[]> {
  const map: Map<string, OrderedTransaction[]> = new Map();
  txs.forEach((tx) => {
    const address = bufferToHex(tx.data.getSenderAddress());
    const txList = map.get(address) ?? [];
    txList.push(tx);
    map.set(address, txList);
  });
  return map;
}
