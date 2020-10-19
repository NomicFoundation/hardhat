import { assert } from "chai";
import { bufferToHex } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";

import { createTestOrderedTransaction } from "./blockchain";
import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/TxPriorityHeap";

function compareOrderIds(left: OrderedTransaction, right: OrderedTransaction) {
  return left.orderId - right.orderId;
}

export function makeOrderedTxMap(
  txs: OrderedTransaction[]
): Map<string, OrderedTransaction[]> {
  const map: Map<string, OrderedTransaction[]> = new Map();
  txs.sort(compareOrderIds).forEach((tx) => {
    const address = bufferToHex(tx.body.getSenderAddress());
    const txList = map.get(address) ?? [];
    txList.push(tx);
    map.set(address, txList);
  });
  return map;
}

describe("makeOrderedTxMap", () => {
  it("sorts transactions by order ids before putting to map", () => {
    const accountA = randomAddressBuffer();
    const accountB = randomAddressBuffer();
    const txA1 = createTestOrderedTransaction({ from: accountA, orderId: 1 });
    const txA2 = createTestOrderedTransaction({ from: accountA, orderId: 2 });
    const txB3 = createTestOrderedTransaction({ from: accountB, orderId: 3 });

    const map = makeOrderedTxMap([txA2, txA1, txB3]);
    assert.deepEqual(map.get(bufferToHex(accountA)), [txA1, txA2]);
  });
});
