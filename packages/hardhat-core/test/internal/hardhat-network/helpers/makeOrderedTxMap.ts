import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/PoolState";
import * as BigIntUtils from "../../../../src/internal/util/bigint";

export function makeOrderedTxMap(
  txs: OrderedTransaction[]
): Map<string, OrderedTransaction[]> {
  const map: Map<string, OrderedTransaction[]> = new Map();
  for (const tx of txs) {
    const address = tx.data.getSenderAddress().toString();
    const txList = map.get(address) ?? [];
    txList.push(tx);
    map.set(address, txList);
  }

  for (const txList of map.values()) {
    txList.sort((tx1, tx2) => BigIntUtils.cmp(tx1.data.nonce, tx2.data.nonce));
  }

  return map;
}
